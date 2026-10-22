"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { fetchJson } from "@/lib/fetchJson";
import { isoToCountry, quantizeBBox } from "@/lib/geo";
import type { CyberPayload, FlightTuple, LivePayload } from "@/server/live";
import { useConsole } from "@/state/store";
import type { LayerId, LayerStatus } from "@/state/types";

import { parseUsgs } from "./parse";
import { broadcastItems, parseStrategic, type StrategicFile } from "./static";
import type { GeoItem } from "./types";

const MIN = 60_000;
export const FLIGHTS_MIN_ZOOM = 4;

/** Severity buckets for IODA's composite score (orders of magnitude apart in practice). */
export const outageSeverity = (score: number) => (score >= 1e6 ? "high" : score >= 1e4 ? "medium" : "low") as GeoItem["severity"];

/** Country-level cyber records -> GeoItems at each country's anchor (C2 hosts fanned out slightly). */
export const cyberItems = (p: CyberPayload, anchors: Map<string, [number, number]>): GeoItem[] => {
  const out: GeoItem[] = [];
  for (const o of p.outages) {
    const name = isoToCountry(o.code);
    const coord = name ? anchors.get(name) : undefined;
    if (!name || !coord) continue;
    out.push({
      id: `ioda:${o.code}`,
      kind: "outage",
      coord,
      title: `${name} — connectivity disruption`,
      ts: p.fetchedAt,
      severity: outageSeverity(o.score),
      source: "IODA",
      url: `https://ioda.inetintel.cc.gatech.edu/country/${o.code}`,
      facts: [`score ${Math.round(o.score).toLocaleString("en-US")}`, o.signals.join(" · ") || "composite", `${o.events} event${o.events === 1 ? "" : "s"} / 24 h`],
      value: Math.log10(Math.max(1, o.score))
    });
  }
  const perCountry = new Map<string, number>();
  p.c2.forEach((c, i) => {
    const name = isoToCountry(c.country);
    const anchor = name ? anchors.get(name) : undefined;
    if (!name || !anchor) return;
    const k = perCountry.get(name) ?? 0;
    perCountry.set(name, k + 1);
    const angle = k * 2.4; // golden-angle fan so co-located hosts don't stack
    out.push({
      id: `c2:${i}`,
      kind: "c2",
      coord: [anchor[0] + Math.cos(angle) * (0.8 + k * 0.3), anchor[1] + Math.sin(angle) * (0.8 + k * 0.3)],
      title: `${c.malware} C2 server`,
      ts: c.lastOnline,
      severity: c.status === "online" ? "high" : "low",
      source: "abuse.ch Feodo Tracker",
      url: "https://feodotracker.abuse.ch/",
      facts: [`status ${c.status}`, c.asName, `hosted in ${name}`].filter(Boolean)
    });
  });
  return out;
};

const statusOf = (q: UseQueryResult<unknown>, enabled: boolean): LayerStatus => {
  if (!enabled) return "idle";
  if (q.isError) return q.data ? "stale" : "error";
  if (q.data) return q.isRefetchError ? "stale" : "ready";
  return "loading";
};

export interface LiveData {
  quakes: GeoItem[];
  hazards: GeoItem[];
  cyber: GeoItem[];
  cctv: GeoItem[];
  broadcasts: GeoItem[];
  strategic: GeoItem[];
  flights: FlightTuple[];
}

/**
 * All live-layer queries. Each runs only while its layer is enabled, polls at a
 * cadence matched to the source, pauses in hidden tabs (QueryClient default),
 * and reports status/count/error back to the dock via the store.
 */
export function useLiveLayers(anchors: Map<string, [number, number]> | null): LiveData {
  const layers = useConsole((s) => s.layers);
  const viewport = useConsole((s) => s.viewport);
  const setLayer = useConsole((s) => s.setLayer);
  const on = (id: LayerId) => layers[id].enabled;

  const quakes = useQuery({
    queryKey: ["layer", "quakes"],
    queryFn: ({ signal }) => fetchJson<unknown>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson", "USGS", signal),
    select: parseUsgs,
    enabled: on("quakes"),
    refetchInterval: 5 * MIN,
    staleTime: 4 * MIN,
    meta: { persist: true }
  });

  const hazards = useQuery({
    queryKey: ["layer", "hazards"],
    queryFn: ({ signal }) => fetchJson<LivePayload>("/api/hazards", "Hazards", signal, 25_000),
    enabled: on("hazards"),
    refetchInterval: 15 * MIN,
    staleTime: 10 * MIN,
    meta: { persist: true }
  });

  const cyber = useQuery({
    queryKey: ["layer", "cyber"],
    queryFn: ({ signal }) => fetchJson<CyberPayload>("/api/cyber", "Cyber", signal, 25_000, (d) => d.outages.length + d.c2.length),
    enabled: on("cyber"),
    refetchInterval: 15 * MIN,
    staleTime: 10 * MIN,
    meta: { persist: true }
  });

  const cctv = useQuery({
    queryKey: ["layer", "cctv"],
    queryFn: ({ signal }) => fetchJson<LivePayload>("/api/cctv", "TfL", signal, 25_000),
    enabled: on("cctv"),
    staleTime: 60 * MIN
  });

  const strategic = useQuery({
    queryKey: ["layer", "strategic"],
    queryFn: ({ signal }) =>
      fetchJson<StrategicFile>("/data/strategic.json", "Static", signal, 15_000, (d) => d.chokepoints.length + d.ports.length + d.flashpoints.length),
    select: parseStrategic,
    enabled: on("strategic"),
    staleTime: Infinity
  });

  // Flights: only when zoomed in enough for a ≤250 nm query to cover the view.
  const zoomOk = viewport.zoom >= FLIGHTS_MIN_ZOOM && !!viewport.bbox;
  const bboxKey = zoomOk && viewport.bbox ? quantizeBBox(viewport.bbox) : null;
  const flights = useQuery({
    queryKey: ["layer", "flights", bboxKey],
    queryFn: ({ signal }) => fetchJson<LivePayload<FlightTuple>>(`/api/flights?bbox=${bboxKey}`, "adsb.lol", signal, 20_000),
    enabled: on("flights") && !!bboxKey,
    refetchInterval: 15_000,
    staleTime: 10_000,
    placeholderData: (prev) => prev // keep planes on screen while the next box loads
  });

  const data: LiveData = useMemo(
    () => ({
      quakes: quakes.data ?? [],
      hazards: hazards.data?.items ?? [],
      cyber: cyber.data && anchors ? cyberItems(cyber.data, anchors) : [],
      cctv: cctv.data?.items ?? [],
      broadcasts: on("broadcasts") ? broadcastItems() : [],
      strategic: strategic.data ?? [],
      flights: zoomOk ? (flights.data?.items ?? []) : []
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `on` reads `layers`
    [quakes.data, hazards.data, cyber.data, cctv.data, strategic.data, flights.data, anchors, zoomOk, layers.broadcasts.enabled]
  );

  // Report status/count/error to the dock.
  useEffect(() => {
    const err = (q: UseQueryResult<unknown>) => (q.error instanceof Error ? q.error.message : undefined);
    setLayer("quakes", { status: statusOf(quakes, on("quakes")), count: data.quakes.length, error: err(quakes) });
    setLayer("hazards", { status: statusOf(hazards, on("hazards")), count: data.hazards.length, error: err(hazards) });
    setLayer("cyber", { status: statusOf(cyber, on("cyber")), count: data.cyber.length, error: err(cyber) });
    setLayer("cctv", { status: statusOf(cctv, on("cctv")), count: data.cctv.length, error: err(cctv) });
    setLayer("strategic", { status: statusOf(strategic, on("strategic")), count: data.strategic.length, error: err(strategic) });
    setLayer("broadcasts", { status: on("broadcasts") ? "ready" : "idle", count: data.broadcasts.length });
    setLayer("flights", {
      status: !on("flights") ? "idle" : !zoomOk ? "idle" : statusOf(flights, true),
      count: data.flights.length,
      error: err(flights)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- query objects are recreated each render; key on their state
  }, [data, quakes.status, hazards.status, cyber.status, cctv.status, strategic.status, flights.status, flights.isFetching, layers, zoomOk]);

  return data;
}
