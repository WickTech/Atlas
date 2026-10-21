// Console state contracts. Zustand holds *control* state only (what is on,
// what is selected, where the camera is); fetched data lives in the TanStack
// Query cache. Anything here that should survive a reload or be shareable is
// mirrored into the URL by urlSync.ts.
import type { Lens, Scope } from "@/lib/constants";

/** Layers that exist today. Stage 3 extends this union with live feeds. */
export type LayerId = "risk" | "news";

export type LayerStatus = "idle" | "loading" | "ready" | "stale" | "error";

export interface LayerState {
  enabled: boolean;
  opacity: number;
  status: LayerStatus;
  count: number;
  updatedAt?: string;
  error?: string;
}

export interface Filters {
  scope: Scope;
  lens: Lens;
  category: string; // CategoryKey | "all"
  search: string;
}

export interface Viewport {
  center: [lng: number, lat: number];
  zoom: number;
}

export type Selection =
  | { kind: "country"; name: string }
  | { kind: "entity"; layer: LayerId; id: string; coord: [number, number] }
  | null;

export interface TelemetryFrame {
  source: string;
  fetchedAt: string;
  latencyMs: number;
  count: number;
  ok: boolean;
}

export type RightTab = "intel" | "markets" | "news" | "brief";
export type Modal = "palette" | "help" | null;

export interface UiState {
  leftOpen: boolean;
  rightOpen: boolean;
  rightTab: RightTab;
  modal: Modal;
  ticker: string | null; // asset drawer
}

export interface ConsoleState {
  layers: Record<LayerId, LayerState>;
  filters: Filters;
  viewport: Viewport;
  selection: Selection;
  telemetry: Record<string, TelemetryFrame[]>;
  ui: UiState;
}

export interface ConsoleActions {
  toggleLayer: (id: LayerId) => void;
  setLayer: (id: LayerId, patch: Partial<LayerState>) => void;
  setFilters: (patch: Partial<Filters>) => void;
  setViewport: (v: Viewport) => void;
  select: (s: Selection) => void;
  selectCountry: (name: string | null) => void;
  pushTelemetry: (f: TelemetryFrame) => void;
  setUi: (patch: Partial<UiState>) => void;
  hydrate: (patch: HydratePatch) => void;
}

/** Partial state restored from the URL (or any other external source). */
export interface HydratePatch {
  layers?: Partial<Record<LayerId, Partial<LayerState>>>;
  filters?: Partial<Filters>;
  viewport?: Viewport;
  selection?: Selection;
}

export type ConsoleStore = ConsoleState & ConsoleActions;
