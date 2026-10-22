"use client";

import { useMemo } from "react";

import { flightItem } from "./flights";
import { useConsole } from "@/state/store";

import type { GeoItem } from "./types";
import type { LiveData } from "./useLiveLayers";

/** Resolves the selected entity id against current live data (flights are compact tuples). */
export function useSelectedItem(live: LiveData): GeoItem | null {
  const id = useConsole((s) => (s.selection?.kind === "entity" ? s.selection.id : null));
  return useMemo(() => {
    if (!id) return null;
    if (id.startsWith("ac:")) {
      const f = live.flights.find((t) => `ac:${t[0]}` === id);
      return f ? flightItem(f) : null;
    }
    for (const list of [live.quakes, live.hazards, live.cyber, live.strategic, live.cctv, live.broadcasts]) {
      const hit = list.find((i) => i.id === id);
      if (hit) return hit;
    }
    return null;
  }, [id, live]);
}
