"use client";

import type { PickingInfo } from "@deck.gl/core";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { AJAXError, GlobeControl, Map as MapLibre, NavigationControl, type MapLayerMouseEvent } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Theme } from "@/hooks/useTheme";
import { clusterByCountry, filterNews, type CountryCluster } from "@/lib/news";
import { relativeTime } from "@/lib/format";
import { selectedCountryOf, useConsole } from "@/state/store";
import type { Metrics } from "@/types/metrics";

import { BASEMAPS } from "./basemaps";
import { loadCountries, type CountryData } from "./countries";
import { newsLayers } from "./deckLayers";


const SOURCE = "countries";
const FILL = "country-risk-fill";
const LINE = "country-risk-line";
const PULSE_MS = 2200;

/** First symbol layer: risk fills go beneath basemap labels so names stay legible. */
const firstSymbolLayer = (map: MapLibre) => map.getStyle().layers?.find((l) => l.type === "symbol")?.id;

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Hover {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

// Hybrid renderer: the risk choropleth is native MapLibre fill (feature-state
// scores, no geometry re-upload); point layers are deck.gl, interleaved into
// the same WebGL context so they depth-sort with the globe and share one canvas.
export default function MapCanvas({ metrics, theme }: { metrics: Metrics; theme: Theme }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [styleGen, setStyleGen] = useState(0); // bumped per style load -> re-apply state
  const [countries, setCountries] = useState<CountryData | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const layers = useConsole((s) => s.layers);
  const filters = useConsole((s) => s.filters);
  const selected = useConsole(selectedCountryOf);
  const setLayer = useConsole((s) => s.setLayer);
  const selectCountry = useConsole((s) => s.selectCountry);
  const setViewport = useConsole((s) => s.setViewport);

  const scores = useMemo(() => new Map(metrics.countryIndex.countries.map((c) => [c.name, c])), [metrics.countryIndex]);
  const clusters = useMemo<CountryCluster[]>(
    () => (countries ? clusterByCountry(filterNews(metrics.news, filters), countries.anchors) : []),
    [countries, metrics.news, filters]
  );

  // Latest values for handlers bound once at construction.
  const latest = useRef({ scores, selectCountry });
  useEffect(() => {
    latest.current = { scores, selectCountry };
  });

  // Construct once.
  useEffect(() => {
    if (!containerRef.current) return;
    const { viewport } = useConsole.getState();
    let usedFallback = false;
    const map = new MapLibre({
      container: containerRef.current,
      style: BASEMAPS[theme].primary,
      center: viewport.center,
      zoom: viewport.zoom,
      attributionControl: { compact: true },
      dragRotate: false,
      maxPitch: 0
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new GlobeControl(), "top-right");
    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    overlayRef.current = overlay;
    map.addControl(overlay);

    // Some upstream styles reference sprite icons they don't ship (OpenFreeMap
    // dark -> "circle-11"); register a transparent 1px stand-in instead of warning.
    map.on("styleimagemissing", (e) => {
      if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
    });

    // Primary style host unreachable -> swap to the fallback style once. Only a
    // failed request for the style document itself qualifies.
    map.on("error", (e) => {
      if (usedFallback || !(e.error instanceof AJAXError)) return;
      const t = document.documentElement.classList.contains("light") ? "light" : "dark";
      if (e.error.url !== BASEMAPS[t].primary) return;
      usedFallback = true;
      map.setStyle(BASEMAPS[t].fallback);
    });

    // (Re)install native layers whenever a style finishes loading (initial + theme swaps).
    map.on("style.load", async () => {
      map.setProjection({ type: "globe" });
      const data = await loadCountries();
      setCountries(data);
      if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: "geojson", data: data.geojson, promoteId: "name" });
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
              ]
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

    map.on("mousemove", FILL, (e: MapLayerMouseEvent) => {
      const name = e.features?.[0]?.properties?.name as string | undefined;
      if (!name) return;
      map.getCanvas().style.cursor = "pointer";
      const c = latest.current.scores.get(name);
      setHover({ x: e.point.x, y: e.point.y, title: name, lines: [c ? `risk ${c.score}/100 · ${c.count} stories` : "no coverage"] });
    });
    map.on("mouseleave", FILL, () => {
      map.getCanvas().style.cursor = "";
      setHover(null);
    });
    map.on("click", FILL, (e: MapLayerMouseEvent) => {
      const name = e.features?.[0]?.properties?.name as string | undefined;
      if (name) latest.current.selectCountry(name);
    });

    // Persist camera to the store (and from there the URL) once movement settles.
    map.on("moveend", () => {
      const c = map.getCenter();
      setViewport({ center: [c.lng, c.lat], zoom: map.getZoom() });
    });

    return () => {
      overlayRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- construct once; theme handled below
  }, []);

  // Theme swap: replace basemap; native layers are re-added on style.load.
  const themeRef = useRef(theme);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || themeRef.current === theme) return;
    themeRef.current = theme;
    map.setStyle(BASEMAPS[theme].primary);
  }, [theme]);

  // Risk layer: scores + selection as feature-state; visibility/opacity from the store.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleGen || !map.getSource(SOURCE)) return;
    map.removeFeatureState({ source: SOURCE });
    for (const c of metrics.countryIndex.countries) map.setFeatureState({ source: SOURCE, id: c.name }, { score: c.score });
    if (selected) map.setFeatureState({ source: SOURCE, id: selected }, { selected: true });
    const visible = layers.risk.enabled ? "visible" : "none";
    map.setLayoutProperty(FILL, "visibility", visible);
    map.setPaintProperty(FILL, "fill-opacity", layers.risk.opacity);
  }, [metrics.countryIndex, selected, styleGen, layers.risk.enabled, layers.risk.opacity]);

  // Layer telemetry for the dock: live entity counts.
  useEffect(() => {
    setLayer("risk", { count: metrics.countryIndex.countries.length, status: "ready", updatedAt: metrics.updatedAt });
  }, [metrics.countryIndex, metrics.updatedAt, setLayer]);
  useEffect(() => {
    if (!countries) return;
    setLayer("news", { count: clusters.reduce((n, c) => n + c.count, 0), status: "ready", updatedAt: metrics.updatedAt });
  }, [clusters, countries, metrics.updatedAt, setLayer]);

  // deck.gl layers. Inputs live in a ref so the radar-ping animation can call
  // overlay.setProps from requestAnimationFrame without re-rendering React;
  // deck diffs by layer id + updateTriggers, so per-frame rebuilds are cheap.
  const deckInput = useRef<Omit<Parameters<typeof newsLayers>[0], "pulse"> & { enabled: boolean }>(null);
  const pulseRef = useRef<number | null>(null);
  const renderDeck = useCallback(() => {
    const input = deckInput.current;
    const overlay = overlayRef.current;
    if (!overlay || !input) return;
    overlay.setProps({ layers: input.enabled ? newsLayers({ ...input, pulse: pulseRef.current }) : [] });
  }, []);

  useEffect(() => {
    const onHover = (info: PickingInfo<CountryCluster>) => {
      const c = info.object;
      setHover(
        c
          ? {
              x: info.x,
              y: info.y,
              title: `${c.name} · ${c.count} ${c.count === 1 ? "story" : "stories"}`,
              lines: [c.latest.title, `${c.latest.source ?? ""} · ${relativeTime(c.latest.timePublished)}`]
            }
          : null
      );
    };
    deckInput.current = {
      enabled: layers.news.enabled,
      clusters,
      selected,
      opacity: layers.news.opacity,
      dark: theme === "dark",
      onClick: (c) => selectCountry(c.name),
      onHover
    };
    renderDeck();
  }, [clusters, selected, layers.news.enabled, layers.news.opacity, theme, selectCountry, renderDeck, styleGen]);

  // Radar ping phase ticker (~30 fps) — only while news is on and motion is allowed.
  useEffect(() => {
    if (!layers.news.enabled || prefersReducedMotion()) {
      pulseRef.current = null;
      renderDeck();
      return;
    }
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 33) {
        last = t;
        pulseRef.current = (t % PULSE_MS) / PULSE_MS;
        renderDeck();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layers.news.enabled, renderDeck]);

  // Fly to a country picked from a list/palette (map clicks are already in view).
  useEffect(() => {
    const map = mapRef.current;
    const anchor = selected ? countries?.anchors.get(selected) : null;
    if (!map || !anchor) return;
    if (map.getBounds().contains(anchor)) return;
    map.easeTo({ center: anchor, zoom: Math.max(map.getZoom(), 2.6), duration: prefersReducedMotion() ? 0 : 900 });
  }, [selected, countries]);

  return (
    <div className="absolute inset-0">
      {/* Inline positioning on purpose: maplibre-gl.css sets `.maplibregl-map { position: relative }`
          unlayered, which outranks Tailwind's layered `absolute` utility and collapses the map to 0px. */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-label="World map" role="region" />
      {hover && (
        <div className="glass pointer-events-none absolute z-10 max-w-xs px-2.5 py-1.5 text-xs" style={{ left: hover.x + 14, top: hover.y + 14 }} role="tooltip">
          <div className="font-bold">{hover.title}</div>
          {hover.lines.map((l, i) => (
            <div key={i} className={i === 0 && hover.lines.length > 1 ? "mt-0.5 line-clamp-2 text-fg" : "telemetry mt-0.5 text-muted"}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
