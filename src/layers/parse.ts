// Pure upstream -> GeoItem parsers. Defensive by design: malformed records are
// dropped, never thrown on, so one bad feature can't blank a layer.
import type { Severity } from "@/types/metrics";

import type { GeoItem } from "./types";

const isLngLat = (c: unknown): c is [number, number] =>
  Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]) && Math.abs(c[0] as number) <= 180 && Math.abs(c[1] as number) <= 90;

const iso = (v: unknown): string | null => {
  const t = typeof v === "number" ? v : Date.parse(String(v ?? ""));
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

// ---------- USGS earthquakes (GeoJSON summary feed) ----------
interface UsgsFeature {
  id: string;
  geometry?: { coordinates?: number[] };
  properties?: { mag?: number | null; place?: string; time?: number; url?: string; tsunami?: number; alert?: string | null; sig?: number };
}

export const quakeSeverity = (mag: number, alert?: string | null): Severity =>
  alert === "red" || alert === "orange" || mag >= 6 ? "high" : alert === "yellow" || mag >= 4.5 ? "medium" : "low";

export const parseUsgs = (json: unknown): GeoItem[] => {
  const features = (json as { features?: UsgsFeature[] })?.features ?? [];
  return features.flatMap((f): GeoItem[] => {
    const [lng, lat, depth] = f.geometry?.coordinates ?? [];
    const mag = f.properties?.mag;
    const coord = [lng, lat];
    if (!isLngLat(coord) || typeof mag !== "number") return [];
    const facts = [`M ${mag.toFixed(1)}`, `depth ${Math.round(depth ?? 0)} km`];
    if (f.properties?.tsunami) facts.push("tsunami flag");
    if (f.properties?.alert) facts.push(`PAGER ${f.properties.alert}`);
    return [
      {
        id: `usgs:${f.id}`,
        kind: "quake",
        coord,
        title: f.properties?.place || "Earthquake",
        ts: iso(f.properties?.time),
        severity: quakeSeverity(mag, f.properties?.alert),
        source: "USGS",
        url: f.properties?.url,
        facts,
        value: mag,
        category: (depth ?? 0) > 70 ? "deep" : "shallow"
      }
    ];
  });
};

// ---------- NASA EONET natural events (GeoJSON) ----------
// Sea/lake ice tracking is ~80% of open EONET events and not a hazard signal.
const EONET_SKIP = new Set(["seaLakeIce"]);

interface EonetFeature {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: {
    id?: string;
    title?: string;
    link?: string;
    date?: string;
    magnitudeValue?: number | null;
    magnitudeUnit?: string | null;
    categories?: { id?: string; title?: string }[];
    sources?: { url?: string }[];
  };
}

/** Representative point: the point itself, or the last vertex of a track. */
const eonetPoint = (g: EonetFeature["geometry"]): [number, number] | null => {
  if (!g) return null;
  if (g.type === "Point" && isLngLat(g.coordinates)) return g.coordinates;
  if (g.type === "LineString" && Array.isArray(g.coordinates)) {
    const last = g.coordinates.at(-1);
    return isLngLat(last) ? last : null;
  }
  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    const first = (g.coordinates[0] as unknown[] | undefined)?.[0];
    return isLngLat(first) ? first : null;
  }
  return null;
};

export const parseEonet = (json: unknown): GeoItem[] => {
  const features = (json as { features?: EonetFeature[] })?.features ?? [];
  const seen = new Set<string>();
  return features.flatMap((f): GeoItem[] => {
    const p = f.properties ?? {};
    const cat = p.categories?.[0];
    const coord = eonetPoint(f.geometry);
    // EONET emits one feature per observation; keep the newest per event id.
    if (!coord || !p.id || !cat?.id || EONET_SKIP.has(cat.id) || seen.has(p.id)) return [];
    seen.add(p.id);
    const facts = [cat.title ?? cat.id];
    if (p.magnitudeValue != null) facts.push(`${p.magnitudeValue} ${p.magnitudeUnit ?? ""}`.trim());
    return [
      {
        id: `eonet:${p.id}`,
        kind: "hazard",
        coord,
        title: p.title ?? cat.title ?? "Natural event",
        ts: iso(p.date),
        severity: cat.id === "volcanoes" || cat.id === "severeStorms" ? "medium" : "low",
        source: "NASA EONET",
        url: p.sources?.[0]?.url ?? p.link,
        facts,
        category: cat.id
      }
    ];
  });
};

// ---------- GDACS alerts (EVENTS4APP GeoJSON) ----------
const GDACS_TYPE: Record<string, string> = { EQ: "earthquakes", TC: "severeStorms", FL: "floods", VO: "volcanoes", DR: "drought", WF: "wildfires", TS: "tsunami" };
const GDACS_SEV: Record<string, Severity> = { Red: "high", Orange: "medium", Green: "low" };

interface GdacsFeature {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: {
    eventtype?: string;
    eventid?: number;
    episodeid?: number;
    name?: string;
    eventname?: string;
    description?: string;
    alertlevel?: string;
    country?: string;
    fromdate?: string;
    todate?: string;
    url?: { report?: string; details?: string };
    severitydata?: { severitytext?: string };
  };
}

export const parseGdacs = (json: unknown): GeoItem[] => {
  const features = (json as { features?: GdacsFeature[] })?.features ?? [];
  const seen = new Set<string>();
  return features.flatMap((f): GeoItem[] => {
    const p = f.properties ?? {};
    if (f.geometry?.type !== "Point" || !isLngLat(f.geometry.coordinates) || !p.eventtype || p.eventid == null) return [];
    const id = `gdacs:${p.eventtype}:${p.eventid}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const facts = [`GDACS ${p.alertlevel ?? "?"} alert`];
    if (p.severitydata?.severitytext) facts.push(p.severitydata.severitytext);
    if (p.country) facts.push(p.country);
    return [
      {
        id,
        kind: "hazard",
        coord: f.geometry.coordinates,
        title: p.name || p.description || p.eventname || `${p.eventtype} event`,
        ts: iso(p.todate ?? p.fromdate),
        severity: GDACS_SEV[p.alertlevel ?? ""] ?? "low",
        source: "GDACS",
        url: p.url?.report ?? p.url?.details,
        facts,
        category: GDACS_TYPE[p.eventtype] ?? p.eventtype.toLowerCase()
      }
    ];
  });
};
