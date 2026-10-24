import { describe, expect, it } from "vitest";

import type { Signal } from "@/types/metrics";
import { THREAT_COLOR, THREAT_FILL, threatLevel } from "./threat";

const sig = (severity: Signal["severity"]) => ({ severity }) as Signal;
const highs = (n: number) => Array.from({ length: n }, () => sig("high"));

describe("threatLevel", () => {
  it("maps the count of high-severity signals to a posture", () => {
    expect(threatLevel([])).toEqual({ level: "LOW", highs: 0 });
    expect(threatLevel(highs(1)).level).toBe("GUARDED");
    expect(threatLevel(highs(2)).level).toBe("ELEVATED");
    expect(threatLevel(highs(3)).level).toBe("ELEVATED");
    expect(threatLevel(highs(4)).level).toBe("HIGH");
    expect(threatLevel(highs(9)).level).toBe("HIGH");
  });

  it("ignores medium and low severity signals", () => {
    expect(threatLevel([sig("medium"), sig("low"), sig("medium")])).toEqual({ level: "LOW", highs: 0 });
    expect(threatLevel([...highs(1), sig("medium"), sig("low")])).toEqual({ level: "GUARDED", highs: 1 });
  });

  it("has a colour for every level", () => {
    for (const level of ["LOW", "GUARDED", "ELEVATED", "HIGH"] as const) {
      expect(THREAT_FILL[level]).toMatch(/^var\(--sev-[1-4]\)$/);
      expect(THREAT_COLOR[level]).toMatch(/^var\(--sev-[1-4]-text\)$/);
    }
  });
});
