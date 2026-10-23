import type { Signal } from "@/types/metrics";

export type ThreatLevel = "LOW" | "GUARDED" | "ELEVATED" | "HIGH";

/**
 * Console-wide threat posture, derived only from real signals: the number of
 * high-severity signals currently firing. Deliberately simple and explainable
 * (the tooltip states the rule) — not a predictive score.
 */
export const threatLevel = (signals: Signal[]): { level: ThreatLevel; highs: number } => {
  const highs = signals.filter((s) => s.severity === "high").length;
  const level: ThreatLevel = highs >= 4 ? "HIGH" : highs >= 2 ? "ELEVATED" : highs === 1 ? "GUARDED" : "LOW";
  return { level, highs };
};

/** Threat posture on the shared severity ramp (steps 1-4; red stays reserved for severe scores). */
export const THREAT_COLOR: Record<ThreatLevel, string> = {
  LOW: "var(--sev-1)",
  GUARDED: "var(--sev-2)",
  ELEVATED: "var(--sev-3)",
  HIGH: "var(--sev-4)"
};
/** Tinted chip background for the same level. */
export const threatSoft = (level: ThreatLevel) => `color-mix(in srgb, ${THREAT_COLOR[level]} 14%, transparent)`;
