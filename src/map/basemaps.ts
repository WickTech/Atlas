// Token-free vector basemaps. OpenFreeMap (OSM data, no usage caps) is primary;
// CARTO GL styles (free with attribution) are the fallback if it's unreachable.
import type { Theme } from "@/hooks/useTheme";
import { version as maplibreVersion } from "maplibre-gl/package.json";

/** Copied into public/ by scripts/copy-maplibre-worker.mjs (pre-dev / pre-build). */
export const MAPLIBRE_WORKER_URL = `/vendor/maplibre-gl-worker-${maplibreVersion}.mjs`;

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
