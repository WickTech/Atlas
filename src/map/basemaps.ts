// Token-free vector basemaps. OpenFreeMap (OSM data, no usage caps) is primary;
// CARTO GL styles (free with attribution) are the fallback if it's unreachable.
import type { Theme } from "@/hooks/useTheme";

export const BASEMAPS: Record<Theme, { primary: string; fallback: string }> = {
  dark: {
    primary: "https://tiles.openfreemap.org/styles/dark",
    fallback: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
  },
  light: {
    primary: "https://tiles.openfreemap.org/styles/positron",
    fallback: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  }
};
