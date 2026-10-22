// Context builders for the inspector: what's around a point, what's inside a
// country. Pure functions over already-loaded data — no extra network calls.
import type { FeatureCollection, Geometry } from "geojson";

import { bucketCounts, countryAt, haversineKm } from "@/lib/geoMath";
import type { EnrichedArticle } from "@/types/metrics";

import type { GeoItem } from "./types";
import type { LiveData } from "./useLiveLayers";

export interface Nearby {
  item: GeoItem;
  km: number;
}

/** Event layers worth surfacing as context (not cameras/TV/flights: noise for a brief). */
const contextItems = (live: LiveData): GeoItem[] => [...live.quakes, ...live.hazards, ...live.cyber, ...live.strategic];

export const nearbyItems = (coord: [number, number], live: LiveData, radiusKm = 500, excludeId?: string, limit = 8): Nearby[] =>
  contextItems(live)
    .filter((i) => i.id !== excludeId)
    .map((item) => ({ item, km: haversineKm(coord, item.coord) }))
    .filter((n) => n.km <= radiusKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);

export const itemsInCountry = (name: string, live: LiveData, fc: FeatureCollection<Geometry, { name: string }>): GeoItem[] =>
  contextItems(live).filter((i) => (i.kind === "outage" ? i.title.startsWith(`${name} —`) : countryAt(fc, i.coord) === name));

export interface CountryActivity {
  stories: EnrichedArticle[];
  /** Stories per 4 h over the last 48 h, oldest first. */
  timeline: number[];
}

export const countryActivity = (name: string, news: EnrichedArticle[], now = Date.now()): CountryActivity => {
  const stories = news.filter((n) => n.countryNorm === name);
  return { stories, timeline: bucketCounts(stories.map((s) => s.timePublished), 12, 4 * 3600_000, now) };
};

/** Events per 2 h over the last 24 h for a set of items (oldest first). */
export const eventTimeline = (items: GeoItem[], now = Date.now()) => bucketCounts(items.map((i) => i.ts), 12, 2 * 3600_000, now);

export const formatKm = (km: number) => (km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString("en-US")} km`);
