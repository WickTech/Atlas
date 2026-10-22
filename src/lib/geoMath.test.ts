import type { FeatureCollection, Geometry } from "geojson";
import { describe, expect, it } from "vitest";

import { bucketCounts, countryAt, haversineKm, inGeometry } from "./geoMath";

describe("haversineKm", () => {
  it("matches known distances", () => {
    expect(haversineKm([-0.1276, 51.5072], [2.3522, 48.8566])).toBeCloseTo(344, -1); // London–Paris
    expect(haversineKm([77.209, 28.6139], [72.8777, 19.076])).toBeCloseTo(1153, -1); // Delhi–Mumbai
    expect(haversineKm([0, 0], [0, 0])).toBe(0);
  });
});

const square = (x0: number, y0: number, x1: number, y1: number): Geometry => ({
  type: "Polygon",
  coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]
});

describe("countryAt / inGeometry", () => {
  const fc: FeatureCollection<Geometry, { name: string }> = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { name: "Box" }, geometry: square(0, 0, 10, 10) },
      {
        type: "Feature",
        properties: { name: "Donut" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [[20, 0], [30, 0], [30, 10], [20, 10], [20, 0]],
            [[24, 4], [26, 4], [26, 6], [24, 6], [24, 4]]
          ]
        }
      },
      // Unwrapped across the antimeridian (170..190), like Russia/Fiji after unwrapRing.
      { type: "Feature", properties: { name: "Dateline" }, geometry: square(170, 60, 190, 70) }
    ]
  };
  it("finds containing polygons, respects holes and unwrapped rings", () => {
    expect(countryAt(fc, [5, 5])).toBe("Box");
    expect(countryAt(fc, [21, 1])).toBe("Donut");
    expect(countryAt(fc, [25, 5])).toBeNull(); // in the hole
    expect(countryAt(fc, [-175, 65])).toBe("Dateline"); // -175 ≡ 185
    expect(countryAt(fc, [50, 50])).toBeNull();
    expect(inGeometry({ type: "Point", coordinates: [0, 0] }, 0, 0)).toBe(false);
  });
});

describe("bucketCounts", () => {
  it("bins timestamps into a trailing window", () => {
    const now = Date.parse("2026-10-22T12:00:00Z");
    const H = 3600_000;
    const times = ["2026-10-22T11:30:00Z", "2026-10-22T11:59:00Z", "2026-10-22T06:10:00Z", "2026-10-20T00:00:00Z", null, "garbage"];
    expect(bucketCounts(times, 4, 3 * H, now)).toEqual([0, 0, 1, 2]); // windows: 00-03, 03-06, 06-09, 09-12
  });
});
