// Single source of truth for map layers: the dock, palette, hotkeys and help
// overlay all render from this list, so adding a layer is one entry here plus
// its renderer in src/map.
import type { LayerId } from "@/state/types";

export interface LayerDef {
  id: LayerId;
  label: string;
  hotkey: string;
  /** CSS color used for the dock swatch (map colors live in src/map/palette.ts). */
  swatch: string;
  description: string;
  source: string;
}

export const LAYERS: LayerDef[] = [
  {
    id: "risk",
    label: "Regional risk",
    hotkey: "r",
    swatch: "var(--accent)",
    description: "Country instability index: recency-weighted news volume blended with negative tone.",
    source: "Atlas index over publisher RSS / GDELT"
  },
  {
    id: "news",
    label: "Live news",
    hotkey: "n",
    swatch: "var(--amber)",
    description: "One marker per country, sized by story count, placed at the country's main landmass.",
    source: "Publisher RSS (13 feeds)"
  }
];

export const layerByHotkey = (key: string) => LAYERS.find((l) => l.hotkey === key.toLowerCase());
