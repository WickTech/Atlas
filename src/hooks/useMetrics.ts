"use client";

import { useQuery } from "@tanstack/react-query";

import type { Metrics } from "@/types/metrics";

export type MetricsStatus = "connecting" | "live" | "reconnecting";

const fetchMetrics = async (signal: AbortSignal): Promise<Metrics> => {
  const res = await fetch("/api/metrics", { signal });
  if (!res.ok) throw new Error(`metrics ${res.status}`);
  return (await res.json()) as Metrics;
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
