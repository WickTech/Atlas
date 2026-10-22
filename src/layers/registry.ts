// Single source of truth for map layers: the dock, palette, hotkeys and help
// overlay all render from this list, so adding a layer is one entry here plus
// its data hook (src/layers/useLiveLayers.ts) and renderer (src/map/deckLayers.ts).
import type { LayerId } from "@/state/types";

export type LayerGroup = "Intel" | "Hazards" | "Movement" | "Infrastructure" | "Media";

export interface LayerDef {
  id: LayerId;
  label: string;
  group: LayerGroup;
  hotkey: string;
  /** CSS color used for the dock swatch (map colors live in src/map/palette.ts). */
  swatch: string;
  description: string;
  source: string;
  /** Shown in the dock instead of a count when the layer is idle for a reason. */
  hint?: string;
}

export const LAYERS: LayerDef[] = [
  {
    id: "risk",
    label: "Regional risk",
    group: "Intel",
    hotkey: "r",
    swatch: "var(--accent)",
    description: "Country instability index: recency-weighted news volume blended with negative tone.",
    source: "Atlas index over publisher RSS / GDELT"
  },
  {
    id: "news",
    label: "Live news",
    group: "Intel",
    hotkey: "n",
    swatch: "var(--amber)",
    description: "One marker per country, sized by story count, placed at the country's main landmass.",
    source: "Publisher RSS (13 feeds)"
  },
  {
    id: "quakes",
    label: "Earthquakes",
    group: "Hazards",
    hotkey: "e",
    swatch: "#ff6b3d",
    description: "M2.5+ in the last 24 h. Size = magnitude; deep (>70 km) events drawn amber.",
    source: "USGS real-time feed"
  },
  {
    id: "hazards",
    label: "Disasters",
    group: "Hazards",
    hotkey: "h",
    swatch: "#e0952a",
    description: "Open natural events (storms, wildfires, volcanoes, floods) plus GDACS impact alerts. Sea-ice tracking excluded.",
    source: "NASA EONET · GDACS"
  },
  {
    id: "flights",
    label: "Aircraft",
    group: "Movement",
    hotkey: "f",
    swatch: "#7fd1ff",
    description: "Live ADS-B positions in the visible area, rotated by heading; military-flagged airframes in red.",
    source: "adsb.lol (community ADS-B, ODbL)",
    hint: "zoom ≥ 4"
  },
  {
    id: "cyber",
    label: "Internet outages",
    group: "Infrastructure",
    hotkey: "c",
    swatch: "#b48cff",
    description: "Country-level connectivity disruptions (BGP, active probing, Google traffic) in the last 24 h, plus known botnet C2 hosting.",
    source: "IODA (Georgia Tech) · abuse.ch Feodo Tracker"
  },
  {
    id: "cctv",
    label: "Traffic cameras",
    group: "Media",
    hotkey: "v",
    swatch: "#5fd48c",
    description: "Public London road cameras; click for the latest still.",
    source: "TfL JamCams (Open Government Licence)",
    hint: "London"
  },
  {
    id: "broadcasts",
    label: "Live TV",
    group: "Media",
    hotkey: "b",
    swatch: "var(--fg)",
    description: "24/7 news channels at their newsroom city; click to watch the live stream.",
    source: "YouTube live embeds"
  },
  {
    id: "strategic",
    label: "Chokepoints & ports",
    group: "Infrastructure",
    hotkey: "p",
    swatch: "#9aa5b1",
    description: "Maritime chokepoints, major container ports and long-running flashpoint areas. Static reference — not live status.",
    source: "U.S. EIA · Lloyd's List · ICG CrisisWatch"
  }
];

export const layerByHotkey = (key: string) => LAYERS.find((l) => l.hotkey === key.toLowerCase());
