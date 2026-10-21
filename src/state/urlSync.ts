// Bidirectional URL state: shareable deep links (`?l=risk,news&v=80,22,2.4&s=world&c=India`)
// and reload persistence without storage. Pure parse/serialize are unit tested;
// useUrlSync wires them to the store with a debounced history.replaceState.
"use client";

import { useEffect } from "react";

import { LENSES, type Lens } from "@/lib/constants";

import { LAYER_IDS, useConsole } from "./store";
import type { ConsoleState, HydratePatch } from "./types";

type Persisted = Pick<ConsoleState, "layers" | "filters" | "viewport" | "selection">;

const round = (n: number, dp: number) => Number(n.toFixed(dp));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const serialize = (s: Persisted): string => {
  const p = new URLSearchParams();
  p.set("l", LAYER_IDS.filter((id) => s.layers[id].enabled).join(","));
  p.set("v", [round(s.viewport.center[0], 2), round(s.viewport.center[1], 2), round(s.viewport.zoom, 1)].join(","));
  p.set("s", s.filters.scope);
  if (s.filters.lens !== "World") p.set("lens", s.filters.lens);
  if (s.filters.category !== "all") p.set("cat", s.filters.category);
  if (s.selection?.kind === "country") p.set("c", s.selection.name);
  return p.toString();
};

/** Tolerant parse: unknown/invalid params are ignored, never thrown on. */
export const parse = (search: string): HydratePatch => {
  const p = new URLSearchParams(search);
  const out: HydratePatch = {};

  const l = p.get("l");
  if (l !== null) {
    const on = new Set(l.split(",").filter(Boolean));
    out.layers = Object.fromEntries(LAYER_IDS.map((id) => [id, { enabled: on.has(id) }]));
  }

  const v = p.get("v")?.split(",").map(Number);
  if (v?.length === 3 && v.every(Number.isFinite)) {
    const [lng = 0, lat = 0, zoom = 0] = v;
    out.viewport = { center: [clamp(lng, -180, 180), clamp(lat, -85, 85)], zoom: clamp(zoom, 0, 18) };
  }

  const filters: NonNullable<HydratePatch["filters"]> = {};
  const s = p.get("s");
  if (s === "india" || s === "world") filters.scope = s;
  const lens = p.get("lens");
  if (lens && (LENSES as readonly string[]).includes(lens)) filters.lens = lens as Lens;
  const cat = p.get("cat");
  if (cat && /^[a-z]{2,20}$/.test(cat)) filters.category = cat;
  if (Object.keys(filters).length) out.filters = filters;

  const c = p.get("c");
  if (c && c.length <= 60) out.selection = { kind: "country", name: c };

  return out;
};

const DEBOUNCE_MS = 300;

/** Hydrate once from location.search, then mirror store changes into the URL. */
export function useUrlSync() {
  useEffect(() => {
    useConsole.getState().hydrate(parse(window.location.search));

    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = "";
    const unsubscribe = useConsole.subscribe((state) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const qs = serialize(state);
        if (qs === last) return;
        last = qs;
        window.history.replaceState(window.history.state, "", `${window.location.pathname}?${qs}`);
      }, DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
