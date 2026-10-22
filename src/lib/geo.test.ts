import { describe, expect, it } from "vitest";

import { isoToCountry, quantizeBBox } from "./geo";

describe("isoToCountry", () => {
  it("maps ISO-2 to the map's topojson names", () => {
    expect(isoToCountry("US")).toBe("United States of America");
    expect(isoToCountry("cd")).toBe("Dem. Rep. Congo");
    expect(isoToCountry("TR")).toBe("Turkey");
    expect(isoToCountry("IN")).toBe("India");
    expect(isoToCountry("CF")).toBe("Central African Rep.");
  });
  it("rejects junk", () => {
    expect(isoToCountry("ZZZ")).toBeNull();
    expect(isoToCountry("")).toBeNull();
  });
});

describe("quantizeBBox", () => {
  it("snaps outward to the grid so nearby pans share a key", () => {
    expect(quantizeBBox([-0.7, 51.2, 0.4, 51.8])).toBe("-2,50,2,52");
    expect(quantizeBBox([-0.6, 51.3, 0.5, 51.7])).toBe("-2,50,2,52");
    expect(quantizeBBox([179.5, 88.9, 180, 90])).toBe("178,88,180,90");
  });
});
