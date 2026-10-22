// Client-side geo helpers for placing country-level records on the map.
import { normalizeCountryName } from "@/server/geo";

// Intl region names that differ from the map's topojson names.
const INTL_TO_TOPO: Record<string, string> = {
  "Congo - Kinshasa": "Dem. Rep. Congo",
  "Congo - Brazzaville": "Congo",
  "Côte d’Ivoire": "Côte d'Ivoire",
  "Bosnia & Herzegovina": "Bosnia and Herz.",
  "Hong Kong SAR China": "Hong Kong",
  "Myanmar (Burma)": "Myanmar",
  "North Macedonia": "Macedonia",
  Türkiye: "Turkey",
  Eswatini: "eSwatini",
  "Central African Republic": "Central African Rep.",
  "Dominican Republic": "Dominican Rep.",
  "Equatorial Guinea": "Eq. Guinea",
  "South Sudan": "S. Sudan",
  "Western Sahara": "W. Sahara",
  "Solomon Islands": "Solomon Is.",
  "Falkland Islands": "Falkland Is.",
  "Palestinian Territories": "Palestine"
};

let names: Intl.DisplayNames | null = null;

/** ISO 3166-1 alpha-2 -> topojson country name (null if unknown). */
export const isoToCountry = (code: string): string | null => {
  if (!/^[A-Za-z]{2}$/.test(code)) return null;
  names ??= new Intl.DisplayNames(["en"], { type: "region" });
  let display: string | undefined;
  try {
    display = names.of(code.toUpperCase());
  } catch {
    return null;
  }
  if (!display || display === code.toUpperCase()) return null;
  return INTL_TO_TOPO[display] ?? normalizeCountryName(display);
};

export type BBox = [west: number, south: number, east: number, north: number];

/**
 * Snap a viewport box outward to a `step`° grid so small pans reuse the same
 * cache key (browser, CDN and server). Returns the serialized query value.
 */
export const quantizeBBox = ([w, s, e, n]: BBox, step = 2): string => {
  const down = (v: number) => Math.floor(v / step) * step;
  const up = (v: number) => Math.ceil(v / step) * step;
  const q: BBox = [Math.max(-180, down(w)), Math.max(-90, down(s)), Math.min(180, up(e)), Math.min(90, up(n))];
  return q.join(",");
};
