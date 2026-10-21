import { create } from "zustand";

import type { ConsoleState, ConsoleStore, LayerId, LayerState } from "./types";

export const TELEMETRY_WINDOW = 30;

const layer = (enabled: boolean): LayerState => ({ enabled, opacity: 1, status: "idle", count: 0 });

export const LAYER_IDS: LayerId[] = ["risk", "news"];

export const initialState = (): ConsoleState => ({
  layers: { risk: layer(true), news: layer(true) },
  filters: { scope: "india", lens: "World", category: "all", search: "" }, // India-first audience
  viewport: { center: [80, 22], zoom: 2.4 },
  selection: null,
  telemetry: {},
  ui: { leftOpen: true, rightOpen: true, rightTab: "intel", modal: null, ticker: null }
});

export const useConsole = create<ConsoleStore>()((set) => ({
  ...initialState(),

  toggleLayer: (id) => set((s) => ({ layers: { ...s.layers, [id]: { ...s.layers[id], enabled: !s.layers[id].enabled } } })),

  setLayer: (id, patch) => set((s) => ({ layers: { ...s.layers, [id]: { ...s.layers[id], ...patch } } })),

  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),

  setViewport: (viewport) => set({ viewport }),

  select: (selection) => set({ selection }),

  // Toggle semantics: re-selecting the active country clears it.
  selectCountry: (name) =>
    set((s) => ({
      selection: !name || (s.selection?.kind === "country" && s.selection.name === name) ? null : { kind: "country", name }
    })),

  // Ring buffer per source — feeds the status bar health dots + latency.
  pushTelemetry: (f) =>
    set((s) => ({ telemetry: { ...s.telemetry, [f.source]: [...(s.telemetry[f.source] ?? []), f].slice(-TELEMETRY_WINDOW) } })),

  setUi: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),

  hydrate: (patch) =>
    set((s) => ({
      layers: patch.layers
        ? (Object.fromEntries(LAYER_IDS.map((id) => [id, { ...s.layers[id], ...patch.layers?.[id] }])) as ConsoleState["layers"])
        : s.layers,
      filters: patch.filters ? { ...s.filters, ...patch.filters } : s.filters,
      viewport: patch.viewport ?? s.viewport,
      selection: patch.selection !== undefined ? patch.selection : s.selection
    }))
}));

/** Selected country name, or null — the most common selection read. */
export const selectedCountryOf = (s: ConsoleState) => (s.selection?.kind === "country" ? s.selection.name : null);
