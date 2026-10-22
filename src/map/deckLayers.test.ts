import { describe, expect, it } from "vitest";

import type { FlightTuple } from "@/server/live";

import { flightItem, flightTail } from "./deckLayers";

const ac = (track: number, gs = 450, lat = 0): FlightTuple => ["abc", "TEST1", 10, lat, 30000, gs, track, "A320", 0];

describe("flightTail", () => {
  it("trails opposite the heading", () => {
    const [lngN, latN] = flightTail(ac(0), 6); // heading north -> tail south
    expect(lngN).toBeCloseTo(10, 6);
    expect(latN).toBeLessThan(0);
    const [lngE, latE] = flightTail(ac(90), 6); // heading east -> tail west
    expect(lngE).toBeLessThan(10);
    expect(latE).toBeCloseTo(0, 6);
  });
  it("has the intended on-screen length in Web Mercator at any latitude", () => {
    // Project the tail back to Mercator pixels at zoom 6 and measure it.
    const merc = ([lng, lat]: [number, number], z: number) => {
      const s = (256 * 2 ** z) / 360;
      return [lng * s, (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI * s];
    };
    for (const [lat, track] of [[0, 0], [51.5, 0], [51.5, 90], [60, 45]] as const) {
      const f = ac(track, 450, lat);
      const [x0, y0] = merc([10, lat], 6);
      const [x1, y1] = merc(flightTail(f, 6), 6);
      expect(Math.hypot((x1 ?? 0) - (x0 ?? 0), (y1 ?? 0) - (y0 ?? 0))).toBeCloseTo(16, 0);
    }
  });

  it("is constant on screen across zoom and scales with speed", () => {
    const len = (t: [number, number]) => Math.hypot(t[0] - 10, t[1]);
    const z5 = len(flightTail(ac(0), 5));
    const z6 = len(flightTail(ac(0), 6));
    expect(z5 / z6).toBeCloseTo(2, 6); // one zoom level = 2x degrees per pixel
    expect(len(flightTail(ac(0, 225), 6))).toBeCloseTo(z6 / 2, 6);
  });
});

describe("flightItem", () => {
  it("expands a tuple lazily for tooltips", () => {
    expect(flightItem(["4ca850", "", 1, 2, -1, 3, 0, "", 1])).toMatchObject({
      id: "ac:4ca850",
      title: "4CA850",
      severity: "medium",
      facts: ["unknown type", "on ground", "3 kt · 0°", "military-flagged"]
    });
  });
});
