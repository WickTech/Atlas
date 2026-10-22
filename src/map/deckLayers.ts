// deck.gl layer factories. Pure functions of (data, view state) -> Layer[];
// deck diffs by id and only re-uploads attributes whose updateTriggers changed.
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";

import type { GeoItem } from "@/layers/types";
import type { LiveData } from "@/layers/useLiveLayers";
import type { CountryCluster } from "@/lib/news";
import { flightItem } from "@/layers/flights";
import type { FlightTuple } from "@/server/live";
import type { LayerId, LayerState } from "@/state/types";

import { ACCENT, AMBER, GREEN, HAZARD_COLORS, HAZARD_DEFAULT, INK, MILITARY, PAPER, QUAKE_DEEP, QUAKE_SHALLOW, SKY, STEEL, VIOLET, withAlpha } from "./palette";

export interface NewsLayerOpts {
  clusters: CountryCluster[];
  selected: string | null;
  opacity: number;
  dark: boolean;
  onClick: (c: CountryCluster) => void;
  onHover: (info: PickingInfo<CountryCluster>) => void;
}

// Discs lie flat on the globe (no billboarding): they foreshorten toward the
// limb like decals and occlude correctly behind the planet. Camera-facing
// billboards intersect the globe's depth buffer and render as half-discs.
export const radiusPx = (count: number) => 4 + Math.sqrt(count) * 3.2;

/**
 * Altitude (m) for surface markers. Anything drawn exactly on the globe is
 * coplanar with MapLibre's sphere and z-fights with its depth buffer (markers
 * render as wedges, thin lines vanish). Lifting slightly keeps depth testing —
 * so the far side of the planet still occludes — without the fighting.
 */
export const LIFT_M = 3000;
const lift = ([lng, lat]: [number, number]): [number, number, number] => [lng, lat, LIFT_M];
/** Aircraft sit at their barometric altitude (never below the marker lift). */
const flightZ = (altFt: number) => Math.max(LIFT_M, altFt * 0.3048);

/** Clusters worth pinging: the busiest few, so motion stays meaningful rather than noisy. */
export const hotspots = (clusters: CountryCluster[], n = 3) => clusters.slice(-n);

export const newsLayers = ({ clusters, selected, opacity, dark, onClick, onHover }: NewsLayerOpts) => {
  const outline = dark ? INK : PAPER;
  return [
    new ScatterplotLayer<CountryCluster>({
      id: "news-markers",
      data: clusters,
      getPosition: (d) => lift(d.coord),
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
};

// ---------------------------------------------------------------------------
// Live layers. All share the GeoItem shape so hover/click handling is generic.
// ---------------------------------------------------------------------------

const SEV_ALPHA = { high: 0.95, medium: 0.8, low: 0.6 } as const;

/**
 * Heading tail for an aircraft: a segment trailing *behind* the plane, length
 * ∝ ground speed and constant on screen (~16 px at 450 kt) at any zoom.
 * Rendered as flat geometry because icon/billboard layers don't draw reliably
 * on the MapLibre globe (billboards clip into the sphere's depth buffer).
 */
export const flightTail = (f: FlightTuple, zoom: number): [number, number] => {
  const [, , lng, lat, , gs, track] = f;
  const lenPx = 16 * Math.min(1.25, Math.max(0.25, gs / 450));
  // Web-Mercator scale: 1° of longitude = pxPerDeg px everywhere; 1° of latitude
  // is stretched by 1/cos(lat), so it takes cos(lat) degrees per pxPerDeg px.
  const pxPerDeg = (256 * 2 ** zoom) / 360;
  const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  const rad = (track * Math.PI) / 180;
  return [lng - (Math.sin(rad) * lenPx) / pxPerDeg, lat - (Math.cos(rad) * lenPx * cosLat) / pxPerDeg];
};

export interface LiveLayerOpts {
  data: LiveData;
  zoom: number;
  layers: Record<LayerId, LayerState>;
  selectedId: string | null;
  onHover: (item: GeoItem | null, x: number, y: number) => void;
  onClick: (item: GeoItem) => void;
}

export const liveLayers = ({ data, zoom, layers, selectedId, onHover, onClick }: LiveLayerOpts) => {
  const common = {
    pickable: true,
    radiusUnits: "pixels" as const,
    lineWidthUnits: "pixels" as const,
    stroked: true,
    onHover: (info: PickingInfo<GeoItem>) => onHover(info.object ?? null, info.x, info.y),
    onClick: (info: PickingInfo<GeoItem>) => info.object && onClick(info.object)
  };
  const ring = (id: string) => (id === selectedId ? 2.5 : 1);
  const out = [];

  if (layers.strategic.enabled) {
    out.push(
      new ScatterplotLayer<GeoItem>({
        ...common,
        id: "strategic",
        data: data.strategic,
        opacity: layers.strategic.opacity,
        getPosition: (d) => lift(d.coord),
        getRadius: (d) => (d.kind === "port" ? 3.5 : d.kind === "chokepoint" ? 6 : 9),
        filled: true,
        getFillColor: (d) => withAlpha(d.kind === "flashpoint" ? MILITARY : STEEL, d.kind === "flashpoint" ? 0.18 : d.kind === "port" ? 0.85 : 0.25),
        getLineColor: (d) => withAlpha(d.kind === "flashpoint" ? MILITARY : STEEL, 0.9),
        getLineWidth: (d) => ring(d.id) * (d.kind === "port" ? 0.5 : 1.5),
        updateTriggers: { getLineWidth: [selectedId] }
      })
    );
  }

  if (layers.hazards.enabled) {
    out.push(
      new ScatterplotLayer<GeoItem>({
        ...common,
        id: "hazards",
        data: data.hazards,
        opacity: layers.hazards.opacity,
        getPosition: (d) => lift(d.coord),
        getRadius: (d) => (d.severity === "high" ? 9 : d.severity === "medium" ? 6.5 : 4.5),
        getFillColor: (d) => withAlpha(HAZARD_COLORS[d.category ?? ""] ?? HAZARD_DEFAULT, SEV_ALPHA[d.severity]),
        getLineColor: [255, 255, 255, 160],
        getLineWidth: (d) => ring(d.id) * (d.source === "GDACS" ? 1.5 : 0.75),
        updateTriggers: { getLineWidth: [selectedId] }
      })
    );
  }

  if (layers.quakes.enabled) {
    out.push(
      new ScatterplotLayer<GeoItem>({
        ...common,
        id: "quakes",
        data: data.quakes,
        opacity: layers.quakes.opacity,
        getPosition: (d) => lift(d.coord),
        // Energy grows ~32x per magnitude; a gentle exponent keeps M7 readable without swamping M3.
        getRadius: (d) => 2 + Math.pow(Math.max(0, d.value ?? 0), 1.6) * 0.9,
        // Rings (seismic-map convention) so quakes never read as news discs.
        getFillColor: (d) => withAlpha(d.category === "deep" ? QUAKE_DEEP : QUAKE_SHALLOW, 0.12),
        getLineColor: (d) => withAlpha(d.category === "deep" ? QUAKE_DEEP : QUAKE_SHALLOW, 1),
        getLineWidth: (d) => ring(d.id) * 1.75,
        updateTriggers: { getLineWidth: [selectedId] }
      })
    );
  }

  if (layers.cyber.enabled) {
    out.push(
      new ScatterplotLayer<GeoItem>({
        ...common,
        id: "cyber",
        data: data.cyber,
        opacity: layers.cyber.opacity,
        getPosition: (d) => lift(d.coord),
        getRadius: (d) => (d.kind === "c2" ? 3 : 3 + (d.value ?? 0) * 1.6),
        getFillColor: (d) => withAlpha(VIOLET, d.kind === "c2" ? 0.95 : 0.3),
        getLineColor: withAlpha(VIOLET, 1),
        getLineWidth: (d) => ring(d.id) * (d.kind === "c2" ? 0.5 : 1.25),
        updateTriggers: { getLineWidth: [selectedId] }
      })
    );
  }

  if (layers.cctv.enabled) {
    out.push(
      new ScatterplotLayer<GeoItem>({
        ...common,
        id: "cctv",
        data: data.cctv,
        opacity: layers.cctv.opacity,
        getPosition: (d) => lift(d.coord),
        getRadius: 2.5,
        getFillColor: withAlpha(GREEN, 0.9),
        getLineColor: [0, 0, 0, 120],
        getLineWidth: (d) => ring(d.id) * 0.5,
        updateTriggers: { getLineWidth: [selectedId] }
      })
    );
  }

  if (layers.broadcasts.enabled) {
    out.push(
      new ScatterplotLayer<GeoItem>({
        ...common,
        id: "broadcasts",
        data: data.broadcasts,
        opacity: layers.broadcasts.opacity,
        getPosition: (d) => lift(d.coord),
        getRadius: 7,
        getFillColor: withAlpha(MILITARY, 0.9),
        getLineColor: [248, 244, 244, 255],
        getLineWidth: (d) => ring(d.id) * 1.5,
        updateTriggers: { getLineWidth: [selectedId] }
      })
    );
  }

  if (layers.flights.enabled && data.flights.length) {
    const color = (d: FlightTuple) => withAlpha(d[8] ? MILITARY : SKY, d[4] < 0 ? 0.45 : 0.95);
    const flightHover = (info: PickingInfo<FlightTuple>) => onHover(info.object ? flightItem(info.object) : null, info.x, info.y);
    const flightClick = (info: PickingInfo<FlightTuple>) => info.object && onClick(flightItem(info.object));
    out.push(
      // PathLayer, not LineLayer: LineLayer draws nothing under the globe projection.
      new PathLayer<FlightTuple>({
        id: "flight-tails",
        data: data.flights.filter((d) => d[4] >= 0), // no tails for aircraft on the ground
        opacity: layers.flights.opacity * 0.7,
        getPath: (d) => [
          [d[2], d[3], flightZ(d[4])],
          [...flightTail(d, zoom), flightZ(d[4])]
        ],
        getColor: color,
        widthUnits: "pixels",
        getWidth: 1.5,
        capRounded: true,
        updateTriggers: { getPath: [Math.round(zoom * 4)] }
      }),
      new ScatterplotLayer<FlightTuple>({
        id: "flights",
        data: data.flights,
        opacity: layers.flights.opacity,
        pickable: true,
        radiusUnits: "pixels",
        getPosition: (d) => [d[2], d[3], flightZ(d[4])],
        getRadius: (d) => (`ac:${d[0]}` === selectedId ? 5 : d[4] < 0 ? 2 : 3),
        getFillColor: color,
        stroked: true,
        lineWidthUnits: "pixels",
        getLineColor: (d) => (`ac:${d[0]}` === selectedId ? [255, 255, 255, 255] : [0, 0, 0, 90]),
        getLineWidth: (d) => (`ac:${d[0]}` === selectedId ? 2 : 0.5),
        onHover: flightHover,
        onClick: flightClick,
        updateTriggers: { getRadius: [selectedId], getLineColor: [selectedId], getLineWidth: [selectedId] }
      })
    );
  }

  return out;
};
