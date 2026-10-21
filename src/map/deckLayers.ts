// deck.gl layer factories. Pure functions of (data, view state) -> Layer[] so
// the canvas can rebuild cheaply every frame of the pulse animation; deck diffs
// by id and only re-uploads attributes whose updateTriggers changed.
import { ScatterplotLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";

import type { CountryCluster } from "@/lib/news";

import { ACCENT, AMBER, INK, PAPER, withAlpha } from "./palette";

export interface NewsLayerOpts {
  clusters: CountryCluster[];
  selected: string | null;
  opacity: number;
  /** 0..1 animation phase for the radar ping; null disables it (reduced motion). */
  pulse: number | null;
  dark: boolean;
  onClick: (c: CountryCluster) => void;
  onHover: (info: PickingInfo<CountryCluster>) => void;
}

// Discs lie flat on the globe (no billboarding): they foreshorten toward the
// limb like decals and occlude correctly behind the planet. Camera-facing
// billboards intersect the globe's depth buffer and render as half-discs.
const radiusPx = (count: number) => 4 + Math.sqrt(count) * 3.2;

/** Clusters worth pinging: the busiest few, so motion stays meaningful rather than noisy. */
export const hotspots = (clusters: CountryCluster[], n = 3) => clusters.slice(-n);

export const newsLayers = ({ clusters, selected, opacity, pulse, dark, onClick, onHover }: NewsLayerOpts) => {
  const outline = dark ? INK : PAPER;
  const layers = [
    new ScatterplotLayer<CountryCluster>({
      id: "news-markers",
      data: clusters,
      getPosition: (d) => d.coord,
      getRadius: (d) => radiusPx(d.count),
      radiusUnits: "pixels",
      getFillColor: (d) => withAlpha(d.name === selected ? ACCENT : AMBER, d.name === selected ? 0.95 : 0.8),
      getLineColor: withAlpha(outline, 0.9),
      lineWidthUnits: "pixels",
      getLineWidth: 1.25,
      stroked: true,
      opacity,
      pickable: true,
      autoHighlight: true,
      highlightColor: withAlpha(ACCENT, 1),
      onClick: (info) => info.object && onClick(info.object),
      onHover,
      updateTriggers: { getFillColor: [selected] }
    })
  ];

  if (pulse !== null) {
    const hot = hotspots(clusters);
    layers.push(
      new ScatterplotLayer<CountryCluster>({
        id: "news-ping",
        data: hot,
        getPosition: (d) => d.coord,
        // Ring expands from the marker edge to ~3x while fading out.
        getRadius: (d) => radiusPx(d.count) * (1 + pulse * 2),
        radiusUnits: "pixels",
        stroked: true,
        filled: false,
        getLineColor: withAlpha(ACCENT, (1 - pulse) * 0.8 * opacity),
        lineWidthUnits: "pixels",
        getLineWidth: 1.5,
        pickable: false,
        updateTriggers: { getRadius: [pulse], getLineColor: [pulse, opacity] }
      })
    );
  }
  return layers;
};
