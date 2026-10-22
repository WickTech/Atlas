// Normalized map feature. Every live layer parses its upstream into this shape
// so tooltips, the selection card and (stage 4) the inspector stay generic.
import type { LayerId } from "@/state/types";
import type { Severity } from "@/types/metrics";

export type GeoKind =
  | "quake"
  | "hazard"
  | "flight"
  | "outage"
  | "c2"
  | "cctv"
  | "broadcast"
  | "chokepoint"
  | "port"
  | "flashpoint";

export interface GeoItem {
  id: string;
  kind: GeoKind;
  coord: [number, number]; // [lng, lat]
  title: string;
  /** ISO timestamp of the observation, when the source provides one. */
  ts: string | null;
  severity: Severity;
  source: string;
  url?: string;
  /** Compact facts for the tooltip/selection card, e.g. ["M 5.2", "depth 10 km"]. */
  facts: string[];
  /** Layer-specific numeric used for sizing (magnitude, altitude, score…). */
  value?: number;
  /** Heading in degrees (flights). */
  heading?: number;
  /** Free-form category key (hazard type, chokepoint class…). */
  category?: string;
  media?: string; // image or embed URL (cctv, broadcast)
}

export const LAYER_OF_KIND: Record<GeoKind, LayerId> = {
  quake: "quakes",
  hazard: "hazards",
  flight: "flights",
  outage: "cyber",
  c2: "cyber",
  cctv: "cctv",
  broadcast: "broadcasts",
  chokepoint: "strategic",
  port: "strategic",
  flashpoint: "strategic"
};
