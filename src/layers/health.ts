import type { SourceResult } from "@/server/live";

export interface SourceHealth {
  state: "ok" | "degraded" | "down";
  /** Human line for the dock; absent when every source answered. */
  message?: string;
}

/**
 * Layers that merge several upstreams (hazards = NASA EONET + GDACS, cyber = IODA + Feodo)
 * still answer 200 when one of them is down, so "ready" can quietly hide a missing source.
 * `degraded` = some failed, the layer shows what the rest returned; `down` = nothing worked.
 */
export const sourceHealth = (sources: SourceResult[] | undefined): SourceHealth => {
  if (!sources?.length) return { state: "ok" };
  const failed = sources.filter((s) => !s.ok).map((s) => s.source);
  if (!failed.length) return { state: "ok" };
  const working = sources.filter((s) => s.ok).map((s) => s.source);
  if (!working.length) return { state: "down", message: `${failed.join(" and ")} unavailable` };
  return { state: "degraded", message: `${failed.join(" and ")} unavailable — showing ${working.join(" and ")} only` };
};
