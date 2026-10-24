"use client";

import { useQuery } from "@tanstack/react-query";

import type { Briefs } from "@/types/metrics";

/**
 * The AI briefing, fetched on its own (it can take several seconds) and only
 * once the Brief tab is open. Until it arrives the panel shows the instant
 * rule-based digest from /api/metrics, then swaps to this.
 */
export function useBriefing(enabled: boolean) {
  const query = useQuery({
    queryKey: ["briefing"],
    queryFn: async ({ signal }): Promise<Briefs> => {
      const res = await fetch("/api/briefing", { signal });
      if (!res.ok) throw new Error(`briefing ${res.status}`);
      return (await res.json()) as Briefs;
    },
    enabled,
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
    retry: 1
  });
  return { briefing: query.data ?? null, loading: enabled && query.isPending };
}
