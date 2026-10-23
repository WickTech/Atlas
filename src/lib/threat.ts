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

export const THREAT_COLOR: Record<ThreatLevel, string> = {
  LOW: "var(--bull)",
  GUARDED: "var(--neutral)",
  ELEVATED: "var(--amber)",
  HIGH: "var(--accent-400)"
};
