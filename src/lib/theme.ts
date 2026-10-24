// Atlas colour system v2: JS mirror of atlas-theme.css.
// The map (MapLibre / deck.gl paint) can't read CSS variables, so it uses these values.
// Keep this file in sync with the tokens in app/globals.css.

import type { ExpressionSpecification } from "maplibre-gl";

export type ThemeMode = "dark" | "light";
export type SeverityStep = 1 | 2 | 3 | 4 | 5;

export const SEVERITY_LABELS: Record<SeverityStep, string> = {
  1: "Calm",
  2: "Guarded",
  3: "Elevated",
  4: "High",
  5: "Severe",
};

/** Score (0–100) → severity step. Thresholds: 20 / 35 / 55 / 75. */
export function severityOf(score: number): SeverityStep {
  if (score >= 75) return 5;
  if (score >= 55) return 4;
  if (score >= 35) return 3;
  if (score >= 20) return 2;
  return 1;
}

export const palette = {
  dark: {
    severity: { 1: "#5B7A99", 2: "#E3D45A", 3: "#F5B83D", 4: "#FF8A3D", 5: "#FF5A4E" } as Record<SeverityStep, string>,
    /** Choropleth fill opacity per step: calm regions stay quiet. */
    severityFillOpacity: { 1: 0.0, 2: 0.22, 3: 0.38, 4: 0.48, 5: 0.6 } as Record<SeverityStep, number>,
    map: { ocean: "#0E1520", land: "#1B2533", landLine: "#2A3647", label: "rgba(231,237,244,0.7)", labelHalo: "#0B0F14" },
    category: {
      news: "#A78BFA", quakes: "#2DD4BF", disasters: "#F472B6", aircraft: "#CBD5E1",
      outages: "#38BDF8", chokepoints: "#A3E635", media: "#C4B5FD",
    },
    bull: "#3FD69B",
    bear: "#FF8A6B",
    accent: "#6E9BFF",
  },
  light: {
    severity: { 1: "#6A859F", 2: "#756400", 3: "#8A5A00", 4: "#C2410C", 5: "#C8231A" } as Record<SeverityStep, string>,
    severityFillOpacity: { 1: 0.0, 2: 0.25, 3: 0.32, 4: 0.42, 5: 0.5 } as Record<SeverityStep, number>,
    map: { ocean: "#DCE4EE", land: "#F7F9FB", landLine: "#C5CFDB", label: "rgba(15,23,32,0.7)", labelHalo: "#FFFFFF" },
    category: {
      news: "#7C5CE0", quakes: "#0F9488", disasters: "#C0307A", aircraft: "#64748B",
      outages: "#0369A1", chokepoints: "#4D7C0F", media: "#8B7BD8",
    },
    bull: "#0F7A52",
    bear: "#B13A0A",
    accent: "#2F5FD0",
  },
} as const;

export function severityColor(score: number, mode: ThemeMode = "dark"): string {
  return palette[mode].severity[severityOf(score)];
}

/**
 * MapLibre `fill-color` expression for a numeric `risk` feature property (0–100).
 * Usage: map.setPaintProperty("risk-fill", "fill-color", riskFillColor(mode))
 */
export function riskFillColor(mode: ThemeMode = "dark", prop = "risk") {
  const s = palette[mode].severity;
  return ["step", ["coalesce", ["get", prop], 0], s[1], 20, s[2], 35, s[3], 55, s[4], 75, s[5]] as const;
}

/** MapLibre `fill-opacity` expression matching riskFillColor. */
export function riskFillOpacity(mode: ThemeMode = "dark", prop = "risk") {
  const o = palette[mode].severityFillOpacity;
  return ["step", ["coalesce", ["get", prop], 0], o[1], 20, o[2], 35, o[3], 55, o[4], 75, o[5]] as const;
}

/** Theme-aware CSS colour for DOM use: follows the active theme with no hook or re-render. */
export const severityVar = (score: number): string => `var(--sev-${severityOf(score)})`;

/** Same step, but the AA-safe variant for coloured *text* (the fill can be too faint for small type). */
export const severityTextVar = (score: number): string => `var(--sev-${severityOf(score)}-text)`;

/** Hex ("#rrggbb") -> deck.gl RGB triple. */
export const hexToRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Same ramps as riskFillColor/riskFillOpacity but driven by the `score` feature-state the
 * country layer uses (feature-state, not a property, so scores update without re-parsing GeoJSON).
 * Countries with no score get -1 and stay transparent.
 */
export function riskStateFillColor(mode: ThemeMode = "dark"): ExpressionSpecification {
  const s = palette[mode].severity;
  return ["case", ["<", ["coalesce", ["feature-state", "score"], -1], 0], "rgba(0,0,0,0)", ["step", ["coalesce", ["feature-state", "score"], 0], s[1], 20, s[2], 35, s[3], 55, s[4], 75, s[5]]] as ExpressionSpecification;
}

export function riskStateFillOpacity(mode: ThemeMode = "dark", layerOpacity = 1): ExpressionSpecification {
  const o = palette[mode].severityFillOpacity;
  return ["*", ["step", ["coalesce", ["feature-state", "score"], 0], o[1], 20, o[2], 35, o[3], 55, o[4], 75, o[5]], layerOpacity] as ExpressionSpecification;
}
