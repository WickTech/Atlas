// Pure flight helpers — kept out of src/map so importing them doesn't pull
// deck.gl into the initial bundle (the inspector needs flightItem eagerly).
import type { FlightTuple } from "@/server/live";

import type { GeoItem } from "./types";

/** Flight tuple -> GeoItem, built lazily (hover/click only) so thousands of planes stay as compact arrays. */
export const flightItem = (f: FlightTuple): GeoItem => {
  const [hex, call, lng, lat, alt, gs, track, type, mil] = f;
  return {
    id: `ac:${hex}`,
    kind: "flight",
    coord: [lng, lat],
    title: call || hex.toUpperCase(),
    ts: null,
    severity: mil ? "medium" : "low",
    source: "adsb.lol",
    url: `https://globe.adsb.lol/?icao=${hex}`,
    facts: [type || "unknown type", alt < 0 ? "on ground" : `${alt.toLocaleString("en-US")} ft`, `${gs} kt · ${track}°`, ...(mil ? ["military-flagged"] : [])],
    heading: track
  };
};
