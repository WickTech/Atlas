"use client";

import { useQuery } from "@tanstack/react-query";

import { useConsole } from "@/state/store";
import type { Metrics } from "@/types/metrics";

export type MetricsStatus = "connecting" | "live" | "reconnecting";

// Every fetch (success or failure) lands in the telemetry ring buffer that
// drives the status bar's latency readout and health dot.
const fetchMetrics = async (signal: AbortSignal): Promise<Metrics> => {
  const started = performance.now();
  const push = (ok: boolean, count: number) =>
    useConsole.getState().pushTelemetry({
      source: "metrics",
      fetchedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
      count,
      ok
    });
  try {
    const res = await fetch("/api/metrics", { signal });
    if (!res.ok) throw new Error(`metrics ${res.status}`);
    const data = (await res.json()) as Metrics;
    push(true, data.news.length);
    return data;
  } catch (error) {
    if (!signal.aborted) push(false, 0);
    throw error;
  }
};

// Polls the CDN-cached metrics route every 60 s (matches its s-maxage). Polling
// pauses in hidden tabs; a failed refresh keeps the last good payload on screen.
export function useMetrics() {
  const query = useQuery({
    queryKey: ["metrics"],
    queryFn: ({ signal }) => fetchMetrics(signal),
    refetchInterval: 60_000,
    staleTime: 30_000
  });

  const status: MetricsStatus = query.isError || query.isRefetchError ? "reconnecting" : query.data ? "live" : "connecting";

  return {
    metrics: query.data ?? null,
    status,
    error: query.isError && !query.data ? "Unable to load metrics — upstream sources are unavailable. Retrying…" : ""
  };
}
