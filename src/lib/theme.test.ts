import { describe, expect, it } from "vitest";

import { hexToRgb, palette, riskFillColor, riskStateFillColor, riskStateFillOpacity, severityColor, severityOf, severityTextVar, severityVar } from "./theme";

describe("severityOf", () => {
  it("uses the documented thresholds: 20 / 35 / 55 / 75", () => {
    const steps = [0, 19, 20, 34, 35, 54, 55, 74, 75, 100].map(severityOf);
    expect(steps).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
});

describe("severity colours", () => {
  it("maps a score to the ramp for each theme, and to a theme-following CSS variable", () => {
    expect(severityColor(10)).toBe(palette.dark.severity[1]);
    expect(severityColor(83, "dark")).toBe("#FF5A4E");
    expect(severityColor(83, "light")).toBe("#C8231A");
    expect(severityVar(83)).toBe("var(--sev-5)");
    expect(severityVar(0)).toBe("var(--sev-1)");
    expect(severityTextVar(83)).toBe("var(--sev-5-text)");
  });
  it("keeps calm regions invisible and severe ones the strongest", () => {
    for (const mode of ["dark", "light"] as const) {
      const o = palette[mode].severityFillOpacity;
      expect(o[1]).toBe(0);
      expect(o[2]).toBeLessThan(o[3]);
      expect(o[3]).toBeLessThan(o[4]);
      expect(o[4]).toBeLessThan(o[5]);
    }
  });
});

describe("map expressions", () => {
  it("steps through the five severity colours at the thresholds", () => {
    const expr = riskFillColor("dark") as unknown as unknown[];
    expect(expr[0]).toBe("step");
    expect(expr.filter((x): x is number => typeof x === "number")).toEqual([20, 35, 55, 75]);
  });
  it("drives the choropleth from the score feature-state and hides unscored countries", () => {
    const color = JSON.stringify(riskStateFillColor("light"));
    expect(color).toContain('"feature-state","score"');
    expect(color).toContain("rgba(0,0,0,0)");
    expect(color).toContain(palette.light.severity[5]);
  });
  it("scales the per-step opacity by the layer's opacity slider", () => {
    const expr = riskStateFillOpacity("dark", 0.5) as unknown as unknown[];
    expect(expr[0]).toBe("*");
    expect(expr[2]).toBe(0.5);
  });
});

describe("hexToRgb", () => {
  it("parses #rrggbb for deck.gl", () => {
    expect(hexToRgb("#FF5A4E")).toEqual([255, 90, 78]);
    expect(hexToRgb("#0B0F14")).toEqual([11, 15, 20]);
  });
});
