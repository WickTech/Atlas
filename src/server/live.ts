// Server-side fetchers for live map layers. Each returns normalized GeoItems
// (see src/layers/types.ts) and never throws: a failed upstream yields [] plus
// an error string the route surfaces as a source status.
import { XMLParser } from "fast-xml-parser";

import { parseEonet } from "@/layers/parse";
import type { GeoItem } from "@/layers/types";
import type { Severity } from "@/types/metrics";

import { fetchWithTimeout, USER_AGENT } from "./fetchWithTimeout";

export interface SourceResult {
  source: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface LivePayload<T = GeoItem> {
  items: T[];
  sources: SourceResult[];
  fetchedAt: string;
}

export const getJson = async (url: string, timeoutMs = 8000): Promise<unknown> => {
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** Runs one source, converting any failure into a SourceResult instead of a throw. */
export const settle = async <T>(source: string, run: () => Promise<T[]>): Promise<{ items: T[]; result: SourceResult }> => {
  try {
    const items = await run();
    return { items, result: { source, ok: true, count: items.length } };
  } catch (e) {
    return { items: [], result: { source, ok: false, count: 0, error: e instanceof Error ? e.message : "failed" } };
  }
};

// ---------- GDACS alerts (RSS) ----------
// The JSON API (geteventlist/EVENTS4APP) hangs for 20-45 s from both local and
// Vercel egress; the RSS feed carries the same alerts and answers in ~2 s.
const GDACS_TYPE: Record<string, string> = { EQ: "earthquakes", TC: "severeStorms", FL: "floods", VO: "volcanoes", DR: "drought", WF: "wildfires", TS: "tsunami" };
const GDACS_SEV: Record<string, Severity> = { Red: "high", Orange: "medium", Green: "low" };

const gdacsXml = new XMLParser({ ignoreAttributes: true, isArray: (n) => n === "item", processEntities: true, htmlEntities: true });

interface GdacsRssItem {
  title?: string;
  link?: string;
  "gdacs:alertlevel"?: string;
  "gdacs:eventtype"?: string;
  "gdacs:eventid"?: string | number;
  "gdacs:country"?: string;
  "gdacs:severity"?: string;
  "gdacs:iscurrent"?: string | boolean;
  "gdacs:todate"?: string;
  "geo:Point"?: { "geo:lat"?: number | string; "geo:long"?: number | string };
}

export const parseGdacsRss = (xml: string): GeoItem[] => {
  const doc = gdacsXml.parse(xml) as { rss?: { channel?: { item?: GdacsRssItem[] } } };
  const seen = new Set<string>();
  return (doc.rss?.channel?.item ?? []).flatMap((it): GeoItem[] => {
    const type = it["gdacs:eventtype"];
    const id = it["gdacs:eventid"];
    const lat = Number(it["geo:Point"]?.["geo:lat"]);
    const lng = Number(it["geo:Point"]?.["geo:long"]);
    // Only events still in progress; the feed also carries recently closed ones.
    if (String(it["gdacs:iscurrent"]) !== "true" || !type || id == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const level = it["gdacs:alertlevel"] ?? "Green";
    // Green wildfires are ~90% of the feed and mostly small; EONET already
    // carries notable fires. Orange/Red alerts of every type are always kept.
    if (type === "WF" && level === "Green") return [];
    const key = `gdacs:${type}:${id}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const t = Date.parse(it["gdacs:todate"] ?? "");
    const facts = [`GDACS ${level} alert`];
    const sev = String(it["gdacs:severity"] ?? "").trim();
    // GDACS fills severity with a "Magnitude 0" placeholder for some event types.
    if (sev && !/^magnitude 0(\.0+)?\b/i.test(sev)) facts.push(sev);
    if (it["gdacs:country"]) facts.push(String(it["gdacs:country"]));
    return [
      {
        id: key,
        kind: "hazard",
        coord: [lng, lat],
        title: String(it.title ?? `${type} event`).trim(),
        ts: Number.isFinite(t) ? new Date(t).toISOString() : null,
        severity: GDACS_SEV[level] ?? "low",
        source: "GDACS",
        url: it.link?.replace(/^http:/, "https:"),
        facts,
        category: GDACS_TYPE[type] ?? type.toLowerCase()
      }
    ];
  });
};

const getText = async (url: string, timeoutMs = 8000): Promise<string> => {
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } }, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};

// ---------- hazards: NASA EONET + GDACS ----------
export const fetchHazards = async (): Promise<LivePayload> => {
  const [eonet, gdacs] = await Promise.all([
    settle("NASA EONET", async () => parseEonet(await getJson("https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open&days=30"))),
    settle("GDACS", async () => parseGdacsRss(await getText("https://www.gdacs.org/xml/rss.xml", 9000)))
  ]);
  return { items: [...gdacs.items, ...eonet.items], sources: [eonet.result, gdacs.result], fetchedAt: new Date().toISOString() };
};

// ---------- flights: adsb.lol (community ADS-B, ODbL) ----------
/** [hex, callsign, lng, lat, altitudeFt|-1(ground), groundSpeedKt, trackDeg, typeCode, military(0|1)] */
export type FlightTuple = [string, string, number, number, number, number, number, string, 0 | 1];

export type BBox = [west: number, south: number, east: number, north: number];

const NM_PER_DEG_LAT = 60;
export const MAX_RADIUS_NM = 250; // adsb.lol point-query cap

/** Validates "w,s,e,n" and clamps to the world. Null when malformed or degenerate. */
export const parseBBox = (raw: string | null): BBox | null => {
  const v = raw?.split(",").map(Number);
  if (!v || v.length !== 4 || !v.every(Number.isFinite)) return null;
  const [w = 0, s = 0, e = 0, n = 0] = v;
  const bbox: BBox = [Math.max(-180, w), Math.max(-90, s), Math.min(180, e), Math.min(90, n)];
  return bbox[2] > bbox[0] && bbox[3] > bbox[1] ? bbox : null;
};

/** Center + covering radius (nm) for a bbox, capped at the API limit. */
export const bboxToPoint = ([w, s, e, n]: BBox) => {
  const lat = (s + n) / 2;
  const lng = (w + e) / 2;
  const dLat = ((n - s) / 2) * NM_PER_DEG_LAT;
  const dLng = ((e - w) / 2) * NM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  return { lat, lng, radiusNm: Math.min(MAX_RADIUS_NM, Math.ceil(Math.hypot(dLat, dLng))) };
};

// Airport surface transponders (tower, service vehicles, test units) also
// broadcast ADS-B; they aren't aircraft.
const GROUND_TYPES = new Set(["TWR", "SERV", "GND", "GRND", "EMER"]);
const isGroundVehicle = (a: AdsbAircraft) =>
  GROUND_TYPES.has((a.t ?? "").toUpperCase()) || /^@+$|^GNDTEST$/i.test((a.flight ?? "").trim()) || a.category === "C1" || a.category === "C2";

interface AdsbAircraft {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  t?: string;
  dbFlags?: number | null;
  category?: string; // DO-260B emitter category; C1/C2 = surface vehicles
}

export const parseAdsb = (json: unknown, bbox: BBox): FlightTuple[] => {
  const ac = (json as { ac?: AdsbAircraft[] })?.ac ?? [];
  const [w, s, e, n] = bbox;
  return ac.flatMap((a): FlightTuple[] => {
    if (!a.hex || typeof a.lat !== "number" || typeof a.lon !== "number" || isGroundVehicle(a)) return [];
    // The point query covers a circle; trim to the requested box.
    if (a.lon < w || a.lon > e || a.lat < s || a.lat > n) return [];
    const alt = a.alt_baro === "ground" ? -1 : typeof a.alt_baro === "number" ? Math.round(a.alt_baro) : 0;
    return [[a.hex, (a.flight ?? "").trim(), Number(a.lon.toFixed(4)), Number(a.lat.toFixed(4)), alt, Math.round(a.gs ?? 0), Math.round(a.track ?? 0), a.t ?? "", (a.dbFlags ?? 0) & 1 ? 1 : 0]];
  });
};

export const fetchFlights = async (bbox: BBox): Promise<LivePayload<FlightTuple>> => {
  const { lat, lng, radiusNm } = bboxToPoint(bbox);
  const r = await settle("adsb.lol", async () =>
    parseAdsb(await getJson(`https://api.adsb.lol/v2/point/${lat.toFixed(3)}/${lng.toFixed(3)}/${radiusNm}`, 8000), bbox)
  );
  return { items: r.items, sources: [r.result], fetchedAt: new Date().toISOString() };
};

// ---------- cyber: IODA internet outages + abuse.ch Feodo C2 ----------
export interface OutageRecord {
  country: string;
  code: string;
  score: number;
  signals: string[];
  events: number;
}

export interface C2Record {
  country: string; // ISO-2
  malware: string;
  status: string;
  asName: string;
  lastOnline: string | null;
}

/** One entry from CISA's Known Exploited Vulnerabilities catalog (trimmed: the raw feed is ~1.8 MB). */
export interface KevRecord {
  cve: string;
  vendor: string;
  product: string;
  name: string;
  /** YYYY-MM-DD the entry was added to the catalog. */
  added: string;
  /** Federal remediation deadline, when CISA sets one. */
  due: string | null;
  ransomware: boolean;
}

export interface CyberPayload {
  outages: OutageRecord[];
  c2: C2Record[];
  /** Newest catalog additions first. */
  kev: KevRecord[];
  /** Entries in the whole catalog, not just `kev`. */
  kevTotal: number;
  sources: SourceResult[];
  fetchedAt: string;
}

const IODA_SIGNAL: Record<string, string> = { "bgp.median": "BGP", "ping-slash24.median": "Active probing", "gtr.sarima": "Google traffic", "merit-nt.median": "Telescope" };

interface IodaSummary {
  entity?: { code?: string; name?: string; type?: string };
  scores?: Record<string, number>;
  event_cnt?: number;
}

export const parseIoda = (json: unknown): OutageRecord[] =>
  ((json as { data?: IodaSummary[] })?.data ?? []).flatMap((d): OutageRecord[] => {
    const overall = d.scores?.overall;
    if (d.entity?.type !== "country" || !d.entity.name || !d.entity.code || typeof overall !== "number") return [];
    const signals = Object.keys(d.scores ?? {})
      .filter((k) => k !== "overall")
      .map((k) => IODA_SIGNAL[k] ?? k);
    return [{ country: d.entity.name, code: d.entity.code, score: overall, signals, events: d.event_cnt ?? 0 }];
  });

interface FeodoEntry {
  country?: string | null;
  malware?: string;
  status?: string;
  as_name?: string;
  last_online?: string | null;
}

export const parseFeodo = (json: unknown): C2Record[] =>
  (Array.isArray(json) ? (json as FeodoEntry[]) : []).flatMap((f): C2Record[] =>
    f.country ? [{ country: f.country, malware: f.malware ?? "unknown", status: f.status ?? "unknown", asName: f.as_name ?? "", lastOnline: f.last_online ?? null }] : []
  );

interface KevEntry {
  cveID?: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  dateAdded?: string;
  dueDate?: string;
  knownRansomwareCampaignUse?: string;
}

export const KEV_LIMIT = 12;

/** Newest `limit` catalog entries, plus the full catalog size. Entries without a CVE id or date are skipped. */
export const parseKev = (json: unknown, limit = KEV_LIMIT): { items: KevRecord[]; total: number } => {
  const all = (json as { vulnerabilities?: KevEntry[] })?.vulnerabilities;
  if (!Array.isArray(all)) return { items: [], total: 0 };
  const items = all
    .filter((v) => v.cveID && v.dateAdded && /^\d{4}-\d{2}-\d{2}$/.test(v.dateAdded))
    .sort((a, b) => (b.dateAdded as string).localeCompare(a.dateAdded as string) || (b.cveID as string).localeCompare(a.cveID as string))
    .slice(0, limit)
    .map((v): KevRecord => ({
      cve: v.cveID as string,
      vendor: v.vendorProject ?? "",
      product: v.product ?? "",
      name: v.vulnerabilityName ?? "",
      added: v.dateAdded as string,
      due: v.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(v.dueDate) ? v.dueDate : null,
      ransomware: v.knownRansomwareCampaignUse === "Known"
    }));
  return { items, total: all.length };
};

export const fetchCyber = async (): Promise<CyberPayload> => {
  const now = Math.floor(Date.now() / 1000);
  let kevTotal = 0;
  const [ioda, feodo, kev] = await Promise.all([
    settle("IODA", async () =>
      parseIoda(await getJson(`https://api.ioda.inetintel.cc.gatech.edu/v2/outages/summary?from=${now - 86400}&until=${now}&entityType=country&limit=100`, 10000))
    ),
    settle("abuse.ch Feodo", async () => parseFeodo(await getJson("https://feodotracker.abuse.ch/downloads/ipblocklist.json"))),
    settle("CISA KEV", async () => {
      const { items, total } = parseKev(await getJson("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", 12000));
      if (!total) throw new Error("empty catalog");
      kevTotal = total;
      return items;
    })
  ]);
  return { outages: ioda.items, c2: feodo.items, kev: kev.items, kevTotal, sources: [ioda.result, feodo.result, kev.result], fetchedAt: new Date().toISOString() };
};

// ---------- CCTV: TfL JamCams (Open Government Licence) ----------
interface TflPlace {
  id?: string;
  commonName?: string;
  lat?: number;
  lon?: number;
  additionalProperties?: { key?: string; value?: string }[];
}

export const parseTfl = (json: unknown): GeoItem[] =>
  (Array.isArray(json) ? (json as TflPlace[]) : []).flatMap((p): GeoItem[] => {
    const prop = (k: string) => p.additionalProperties?.find((a) => a.key === k)?.value;
    const img = prop("imageUrl");
    const coord = [p.lon, p.lat];
    if (!p.id || !img || !/^https:\/\//.test(img) || prop("available") === "false" || !isFiniteLngLat(coord)) return [];
    return [
      {
        id: `tfl:${p.id}`,
        kind: "cctv",
        coord,
        title: p.commonName ?? "Traffic camera",
        ts: null,
        severity: "low",
        source: "TfL JamCams",
        url: "https://tfl.gov.uk/traffic/status/",
        facts: [prop("view") ? `view ${prop("view")}` : "London traffic camera"],
        media: img
      }
    ];
  });

const isFiniteLngLat = (c: unknown[]): c is [number, number] => Number.isFinite(c[0]) && Number.isFinite(c[1]);

export const fetchCctv = async (): Promise<LivePayload> => {
  const r = await settle("TfL JamCams", async () => parseTfl(await getJson("https://api.tfl.gov.uk/Place/Type/JamCam", 12000)));
  return { items: r.items, sources: [r.result], fetchedAt: new Date().toISOString() };
};
