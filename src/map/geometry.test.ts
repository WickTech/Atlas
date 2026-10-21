import { describe, expect, it } from "vitest";

import { countryAnchor, unwrapGeometry, unwrapRing } from "./geometry";

describe("unwrapRing", () => {
  it("shifts the western half of antimeridian-crossing rings by +360", () => {
    expect(unwrapRing([[179, 65], [-179, 66], [-178, 64], [179, 65]])).toEqual([[179, 65], [181, 66], [182, 64], [179, 65]]);
  });
  it("leaves ordinary rings untouched", () => {
    const ring = [[70, 20], [80, 30], [90, 20], [70, 20]];
    expect(unwrapRing(ring)).toBe(ring);
  });
  it("handles MultiPolygons and ignores other geometry", () => {
    const mp = unwrapGeometry({ type: "MultiPolygon", coordinates: [[[[170, 0], [-170, 1], [170, 0]]]] });
    expect(mp.type === "MultiPolygon" && mp.coordinates[0]?.[0]?.[1]).toEqual([190, 1]);
    const pt = { type: "Point" as const, coordinates: [1, 2] };
    expect(unwrapGeometry(pt)).toBe(pt);
  });
});

describe("countryAnchor", () => {
  it("uses the largest polygon's centroid", () => {
    const big = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const tiny = [[50, 50], [51, 50], [51, 51], [50, 50]];
    expect(countryAnchor({ type: "MultiPolygon", coordinates: [[tiny], [big]] })).toEqual([5, 5]);
  });
  it("folds unwrapped longitudes back into range", () => {
    const ring = [[170, 0], [190, 0], [190, 10], [170, 10], [170, 0]];
    expect(countryAnchor({ type: "Polygon", coordinates: [ring] })).toEqual([180, 5]);
    const east = [[185, 0], [195, 0], [195, 10], [185, 10], [185, 0]];
    expect(countryAnchor({ type: "Polygon", coordinates: [east] })).toEqual([-170, 5]);
  });
  it("returns null for non-areal geometry", () => {
    expect(countryAnchor({ type: "Point", coordinates: [0, 0] })).toBeNull();
  });
});
