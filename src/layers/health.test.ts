import { describe, expect, it } from "vitest";

import { sourceHealth } from "./health";

const ok = (source: string, count = 5) => ({ source, ok: true, count });
const bad = (source: string) => ({ source, ok: false, count: 0, error: "HTTP 503" });

describe("sourceHealth", () => {
  it("is ok when every source answered, or when there is nothing to judge", () => {
    expect(sourceHealth([ok("NASA EONET"), ok("GDACS")])).toEqual({ state: "ok" });
    expect(sourceHealth([])).toEqual({ state: "ok" });
    expect(sourceHealth(undefined)).toEqual({ state: "ok" });
  });
  it("counts a source that answered with zero items as healthy", () => {
    expect(sourceHealth([ok("EONET", 0), ok("GDACS", 0)]).state).toBe("ok");
  });
  it("is degraded, and names both sides, when one of several sources failed", () => {
    expect(sourceHealth([ok("NASA EONET"), bad("GDACS")])).toEqual({ state: "degraded", message: "GDACS unavailable — showing NASA EONET only" });
  });
  it("is down when nothing answered", () => {
    expect(sourceHealth([bad("IODA"), bad("abuse.ch Feodo Tracker")])).toEqual({ state: "down", message: "IODA and abuse.ch Feodo Tracker unavailable" });
    expect(sourceHealth([bad("adsb.lol")])).toEqual({ state: "down", message: "adsb.lol unavailable" });
  });
});
