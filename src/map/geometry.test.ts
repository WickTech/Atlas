import { describe, expect, it } from "vitest";

import { unwrapGeometry, unwrapRing } from "./geometry";

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
