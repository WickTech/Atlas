// Small, dependency-free spherical helpers for the inspector.
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export const haversineKm = ([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]): number => {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

/** Even-odd ray cast. Longitudes are compared as given (rings may be unwrapped past 180). */
const inRing = (lng: number, lat: number, ring: Position[]): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi = 0, yi = 0] = ring[i] ?? [];
    const [xj = 0, yj = 0] = ring[j] ?? [];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const inPolygon = (lng: number, lat: number, poly: Position[][]) =>
  !!poly[0] && inRing(lng, lat, poly[0]) && !poly.slice(1).some((hole) => inRing(lng, lat, hole));

export const inGeometry = (g: Geometry, lng: number, lat: number): boolean => {
  // Try both the raw longitude and its +360 twin so antimeridian-unwrapped rings match.
  const lngs = lng < 0 ? [lng, lng + 360] : [lng];
  if (g.type === "Polygon") return lngs.some((x) => inPolygon(x, lat, g.coordinates));
  if (g.type === "MultiPolygon") return lngs.some((x) => g.coordinates.some((p) => inPolygon(x, lat, p)));
  return false;
};

/** Country name containing the point, or null for open ocean / unmapped territory. */
export const countryAt = <P extends { name: string }>(fc: FeatureCollection<Geometry, P>, [lng, lat]: [number, number]): string | null =>
  fc.features.find((f: Feature<Geometry, P>) => inGeometry(f.geometry, lng, lat))?.properties.name ?? null;

/**
 * Count timestamps into fixed buckets ending at `now` (oldest first).
 * Items outside the window are ignored.
 */
export const bucketCounts = (isoTimes: (string | null)[], buckets: number, bucketMs: number, now = Date.now()): number[] => {
  const out = new Array<number>(buckets).fill(0);
  const start = now - buckets * bucketMs;
  for (const iso of isoTimes) {
    const t = iso ? Date.parse(iso) : NaN;
    if (!Number.isFinite(t) || t < start || t > now) continue;
    const i = Math.min(buckets - 1, Math.floor((t - start) / bucketMs));
    out[i] = (out[i] ?? 0) + 1;
  }
  return out;
};
