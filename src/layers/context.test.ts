import type { FeatureCollection, Geometry } from "geojson";
import { describe, expect, it } from "vitest";

import type { EnrichedArticle } from "@/types/metrics";

import { countryActivity, formatKm, itemsInCountry, nearbyItems } from "./context";
import type { GeoItem } from "./types";
import type { LiveData } from "./useLiveLayers";

const item = (id: string, coord: [number, number], kind: GeoItem["kind"] = "quake", title = id): GeoItem => ({
  id, kind, coord, title, ts: "2026-10-22T10:00:00Z", severity: "low", source: "t", facts: []
});

const live: LiveData = {
  quakes: [item("q-near", [93.9, 32.4]), item("q-far", [10, 10])],
  hazards: [item("h-near", [94.5, 32.0], "hazard")],
  cyber: [item("ioda:CN", [104, 35], "outage", "China — connectivity disruption")],
  kev: [],
  kevTotal: 0,
  strategic: [],
  cctv: [item("cam", [93.8, 32.4], "cctv")],
  broadcasts: [],
  flights: []
};

describe("nearbyItems", () => {
  it("returns event layers within radius, nearest first, excluding self and cameras", () => {
    const out = nearbyItems([93.78, 32.38], live, 500, "q-near");
    expect(out.map((n) => n.item.id)).toEqual(["h-near"]);
    expect(out[0]?.km).toBeGreaterThan(50);
    expect(out[0]?.km).toBeLessThan(100);
  });
});

describe("itemsInCountry", () => {
  const fc: FeatureCollection<Geometry, { name: string }> = {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: { name: "China" }, geometry: { type: "Polygon", coordinates: [[[73, 18], [135, 18], [135, 54], [73, 54], [73, 18]]] } }]
  };
  it("uses polygons for point events and the title for country-level outages", () => {
    expect(itemsInCountry("China", live, fc).map((i) => i.id).sort()).toEqual(["h-near", "ioda:CN", "q-near"]);
  });
});

describe("countryActivity", () => {
  it("collects a country's stories and a 48 h timeline", () => {
    const now = Date.parse("2026-10-22T12:00:00Z");
    const n = (country: string, t: string) => ({ countryNorm: country, timePublished: t }) as EnrichedArticle;
    const a = countryActivity("India", [n("India", "2026-10-22T11:00:00Z"), n("India", "2026-10-21T01:00:00Z"), n("France", "2026-10-22T11:00:00Z")], now);
    expect(a.stories).toHaveLength(2);
    expect(a.timeline).toHaveLength(12);
    expect(a.timeline.reduce((x, y) => x + y, 0)).toBe(2);
    expect(a.timeline.at(-1)).toBe(1);
  });
  it("formats distances", () => {
    expect(formatKm(3.14)).toBe("3.1 km");
    expect(formatKm(1234.6)).toBe("1,235 km");
  });
});
