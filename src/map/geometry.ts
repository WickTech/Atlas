import type { Geometry } from "geojson";

// Rings that cross the antimeridian (Russia, Fiji) jump from +180 to -180; on
// the globe that seam is triangulated as a sliver spanning the hemisphere.
// Shifting the western half by +360 makes each ring continuous.
export const unwrapRing = (ring: number[][]): number[][] => {
  let min = Infinity;
  let max = -Infinity;
  for (const [lng = 0] of ring) {
    if (lng < min) min = lng;
    if (lng > max) max = lng;
  }
  return max - min > 180 ? ring.map(([lng = 0, lat = 0]) => [lng < 0 ? lng + 360 : lng, lat]) : ring;
};

export const unwrapGeometry = (g: Geometry): Geometry => {
  if (g.type === "Polygon") return { ...g, coordinates: g.coordinates.map(unwrapRing) };
  if (g.type === "MultiPolygon") return { ...g, coordinates: g.coordinates.map((poly) => poly.map(unwrapRing)) };
  return g;
};

// Signed planar area + centroid of one ring (shoelace). Fine at country scale
// for label/marker placement; not a geodesic centroid.
const ringCentroid = (ring: number[][]): { area: number; x: number; y: number } => {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0 = 0, y0 = 0] = ring[j] ?? [];
    const [x1 = 0, y1 = 0] = ring[i] ?? [];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  a /= 2;
  return a === 0 ? { area: 0, x: ring[0]?.[0] ?? 0, y: ring[0]?.[1] ?? 0 } : { area: Math.abs(a), x: cx / (6 * a), y: cy / (6 * a) };
};

/**
 * Marker anchor for a country: centroid of its largest polygon's outer ring, so
 * archipelagos and overseas territories don't pull the point into the ocean
 * (France -> mainland, USA -> contiguous states). Expects unwrapped rings and
 * folds longitudes back into [-180, 180].
 */
export const countryAnchor = (g: Geometry): [number, number] | null => {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  let best: { area: number; x: number; y: number } | null = null;
  for (const poly of polys) {
    const outer = poly[0];
    if (!outer?.length) continue;
    const c = ringCentroid(outer);
    if (!best || c.area > best.area) best = c;
  }
  if (!best) return null;
  const lng = best.x > 180 ? best.x - 360 : best.x;
  return [Number(lng.toFixed(3)), Number(best.y.toFixed(3))];
};
