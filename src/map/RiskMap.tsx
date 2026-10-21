"use client";

import type { FeatureCollection, Geometry } from "geojson";
import { AJAXError, GlobeControl, Map as MapLibre, NavigationControl, setWorkerUrl, type MapLayerMouseEvent } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

import type { Theme } from "@/hooks/useTheme";
import type { CountryIndex } from "@/types/metrics";

import { BASEMAPS, MAPLIBRE_WORKER_URL } from "./basemaps";
import { unwrapGeometry } from "./geometry";

setWorkerUrl(MAPLIBRE_WORKER_URL);

const SOURCE = "countries";
const FILL = "country-risk-fill";
const LINE = "country-risk-line";
const INDIA_FOCUS = { center: [80, 22] as [number, number], zoom: 2.4 };

type CountryProps = { name: string };

let countriesPromise: Promise<FeatureCollection<Geometry, CountryProps>> | null = null;
// Vendored world-atlas 110m topology (same names the risk index normalizes to).
const loadCountries = () =>
  (countriesPromise ??= fetch("/data/countries-110m.json")
    .then((r) => r.json() as Promise<Topology<{ countries: GeometryCollection<CountryProps> }>>)
    .then((topo) => {
      const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, CountryProps>;
      return { ...fc, features: fc.features.map((f) => ({ ...f, geometry: unwrapGeometry(f.geometry) })) };
    }));

/** First symbol layer: risk fills go beneath basemap labels so names stay legible. */
const firstSymbolLayer = (map: MapLibre) => map.getStyle().layers?.find((l) => l.type === "symbol")?.id;

interface Props {
  countryIndex: CountryIndex;
  selectedCountry: string | null;
  onSelectCountry: (name: string | null) => void;
  theme: Theme;
}

// GPU choropleth: one GeoJSON source keyed by country name (`promoteId`), risk
// scores pushed as feature-state so score refreshes never re-upload geometry.
export default function RiskMap({ countryIndex, selectedCountry, onSelectCountry, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  // Bumped on every style load so the feature-state effect re-applies to the fresh source.
  const [styleGen, setStyleGen] = useState(0);
  const [hover, setHover] = useState<{ name: string; score: number | null; x: number; y: number } | null>(null);

  // Latest props for map event handlers bound once at construction.
  const latest = useRef({ countryIndex, selectedCountry, onSelectCountry });
  useEffect(() => {
    latest.current = { countryIndex, selectedCountry, onSelectCountry };
  });

  // Construct once.
  useEffect(() => {
    if (!containerRef.current) return;
    const basemap = BASEMAPS[theme];
    let usedFallback = false;
    const map = new MapLibre({
      container: containerRef.current,
      style: basemap.primary,
      center: INDIA_FOCUS.center,
      zoom: INDIA_FOCUS.zoom,
      attributionControl: { compact: true },
      dragRotate: false,
      maxPitch: 0
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new GlobeControl(), "top-right");
    // Some upstream styles reference sprite icons they don't ship (OpenFreeMap
    // dark -> "circle-11"); register a transparent 1px stand-in instead of warning.
    map.setMissingStyleImageResolver((id) => {
      if (!map.hasImage(id)) map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
    });

    // Primary style host unreachable -> swap to the fallback style once. Only a
    // failed request for the style document itself qualifies; tile/sprite or
    // worker errors must not flip basemaps.
    map.on("error", (e) => {
      if (usedFallback || !(e.error instanceof AJAXError)) return;
      const theme = document.documentElement.classList.contains("light") ? "light" : "dark";
      if (e.error.url !== BASEMAPS[theme].primary) return;
      usedFallback = true;
      map.setStyle(BASEMAPS[theme].fallback);
    });

    // (Re)install overlay layers whenever a style finishes loading (initial + theme swaps).
    map.on("style.load", async () => {
      map.setProjection({ type: "globe" });
      const data = await loadCountries();
      if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: "geojson", data, promoteId: "name" });
      const before = firstSymbolLayer(map);
      if (!map.getLayer(FILL)) {
        map.addLayer(
          {
            id: FILL,
            type: "fill",
            source: SOURCE,
            paint: {
              "fill-color": [
                "interpolate",
                ["linear"],
                ["coalesce", ["feature-state", "score"], -1],
                -1, "rgba(0,0,0,0)",
                0, "rgba(236,48,19,0.10)",
                50, "rgba(236,48,19,0.45)",
                100, "rgba(236,48,19,0.85)"
              ],
              "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.9]
            }
          },
          before
        );
      }
      if (!map.getLayer(LINE)) {
        map.addLayer(
          {
            id: LINE,
            type: "line",
            source: SOURCE,
            paint: {
              "line-color": ["case", ["boolean", ["feature-state", "selected"], false], "#ec3013", "rgba(128,128,128,0.35)"],
              "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2, 0.5]
            }
          },
          before
        );
      }
      setStyleGen((g) => g + 1);
    });

    let hovered: string | null = null;
    const setHovered = (name: string | null) => {
      if (hovered === name) return;
      if (hovered) map.setFeatureState({ source: SOURCE, id: hovered }, { hover: false });
      hovered = name;
      if (name) map.setFeatureState({ source: SOURCE, id: name }, { hover: true });
    };

    map.on("mousemove", FILL, (e: MapLayerMouseEvent) => {
      const name = e.features?.[0]?.properties?.name as string | undefined;
      if (!name) return;
      setHovered(name);
      map.getCanvas().style.cursor = "pointer";
      const score = latest.current.countryIndex.countries.find((c) => c.name === name)?.score ?? null;
      setHover({ name, score, x: e.point.x, y: e.point.y });
    });
    map.on("mouseleave", FILL, () => {
      setHovered(null);
      map.getCanvas().style.cursor = "";
      setHover(null);
    });
    map.on("click", FILL, (e: MapLayerMouseEvent) => {
      const name = e.features?.[0]?.properties?.name as string | undefined;
      if (!name) return;
      const { selectedCountry: sel, onSelectCountry: select } = latest.current;
      select(sel === name ? null : name);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- construct once; theme changes handled below
  }, []);

  // Theme swap: replace basemap; overlay layers are re-added on style.load.
  const themeRef = useRef(theme);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || themeRef.current === theme) return;
    themeRef.current = theme;
    map.setStyle(BASEMAPS[theme].primary);
  }, [theme]);

  // Push scores + selection as feature-state (cheap; no geometry re-upload).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleGen || !map.getSource(SOURCE)) return;
    map.removeFeatureState({ source: SOURCE });
    for (const c of countryIndex.countries) map.setFeatureState({ source: SOURCE, id: c.name }, { score: c.score });
    if (selectedCountry) map.setFeatureState({ source: SOURCE, id: selectedCountry }, { selected: true });
  }, [countryIndex, selectedCountry, styleGen]);

  return (
    <div className="relative h-[440px] w-full ops:h-auto ops:min-h-[520px] ops:flex-1">
      {/* Inline positioning on purpose: maplibre-gl.css sets `.maplibregl-map { position: relative }`
          unlayered, which outranks Tailwind's layered `absolute` utility and collapses the map to 0px. */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-label="World risk map" role="region" />
      <div className="glass telemetry pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1.5 text-muted">
        <span>RISK</span>
        <span className="h-1.5 w-24" style={{ background: "linear-gradient(90deg, rgba(236,48,19,.1), rgba(236,48,19,.85))" }} />
        <span>0–100</span>
      </div>
      {hover && (
        <div
          className="glass pointer-events-none absolute z-10 px-2.5 py-1.5 text-xs"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
          role="tooltip"
        >
          <div className="font-bold">{hover.name}</div>
          <div className="telemetry text-muted">{hover.score == null ? "no coverage" : `risk ${hover.score}/100`}</div>
        </div>
      )}
    </div>
  );
}
