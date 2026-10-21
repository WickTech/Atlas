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
