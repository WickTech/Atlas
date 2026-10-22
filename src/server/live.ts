// Server-side fetchers for live map layers. Each returns normalized GeoItems
// (see src/layers/types.ts) and never throws: a failed upstream yields [] plus
// an error string the route surfaces as a source status.
import { parseEonet, parseGdacs } from "@/layers/parse";
import type { GeoItem } from "@/layers/types";

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

// ---------- hazards: NASA EONET + GDACS ----------
export const fetchHazards = async (): Promise<LivePayload> => {
  const [eonet, gdacs] = await Promise.all([
    settle("NASA EONET", async () => parseEonet(await getJson("https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open&days=30"))),
    // GDACS has been observed hanging >45 s; keep its budget tight.
    settle("GDACS", async () => parseGdacs(await getJson("https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP", 9000)))
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
}

export const parseAdsb = (json: unknown, bbox: BBox): FlightTuple[] => {
  const ac = (json as { ac?: AdsbAircraft[] })?.ac ?? [];
  const [w, s, e, n] = bbox;
  return ac.flatMap((a): FlightTuple[] => {
    if (!a.hex || typeof a.lat !== "number" || typeof a.lon !== "number") return [];
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

export interface CyberPayload {
  outages: OutageRecord[];
  c2: C2Record[];
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

export const fetchCyber = async (): Promise<CyberPayload> => {
  const now = Math.floor(Date.now() / 1000);
  const [ioda, feodo] = await Promise.all([
    settle("IODA", async () =>
      parseIoda(await getJson(`https://api.ioda.inetintel.cc.gatech.edu/v2/outages/summary?from=${now - 86400}&until=${now}&entityType=country&limit=100`, 10000))
    ),
    settle("abuse.ch Feodo", async () => parseFeodo(await getJson("https://feodotracker.abuse.ch/downloads/ipblocklist.json")))
  ]);
  return { outages: ioda.items, c2: feodo.items, sources: [ioda.result, feodo.result], fetchedAt: new Date().toISOString() };
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
