// Static reference datasets: strategic places and live broadcast channels.
// Never presented as live data; the UI labels them "static reference".
import type { GeoItem } from "./types";

interface Place {
  id: string;
  name: string;
  coord: [number, number];
  note?: string;
  url?: string;
}

export interface StrategicFile {
  compiled: string;
  notice: string;
  chokepoints: Place[];
  ports: Place[];
  portsSource: { label: string; url: string };
  flashpoints: Place[];
  flashpointsSource: { label: string; url: string };
}

export const parseStrategic = (f: StrategicFile): GeoItem[] => [
  ...f.chokepoints.map(
    (p): GeoItem => ({
      id: `choke:${p.id}`,
      kind: "chokepoint",
      coord: p.coord,
      title: p.name,
      ts: null,
      severity: "medium",
      source: p.url ? "U.S. EIA" : "Static reference",
      url: p.url,
      facts: [p.note ?? "Maritime chokepoint", "static reference"]
    })
  ),
  ...f.ports.map(
    (p): GeoItem => ({
      id: `port:${p.id}`,
      kind: "port",
      coord: p.coord,
      title: p.name,
      ts: null,
      severity: "low",
      source: f.portsSource.label,
      url: f.portsSource.url,
      facts: ["Major container port", "static reference"]
    })
  ),
  ...f.flashpoints.map(
    (p): GeoItem => ({
      id: `flash:${p.id}`,
      kind: "flashpoint",
      coord: p.coord,
      title: p.name,
      ts: null,
      severity: "medium",
      source: f.flashpointsSource.label,
      url: f.flashpointsSource.url,
      facts: ["Long-running conflict / tension area", "not live — check current status"]
    })
  )
];

// 24/7 news channels, pinned at their newsroom city. IDs verified against the
// channel pages 2026-10-22. `live_stream?channel=` plays whatever the channel
// is currently streaming; the modal links out if it's offline.
export const BROADCASTS: { id: string; name: string; channelId: string; city: string; coord: [number, number] }[] = [
  { id: "aljazeera", name: "Al Jazeera English", channelId: "UCNye-wNBqNL5ZzHSJj3l8Bg", city: "Doha", coord: [51.53, 25.29] },
  { id: "france24", name: "FRANCE 24 English", channelId: "UCQfwfsi5VrQ8yKZ-UWmAEFg", city: "Paris", coord: [2.27, 48.83] },
  { id: "dw", name: "DW News", channelId: "UCknLrEdhRCp1aegoMqRaCZg", city: "Berlin", coord: [13.4, 52.52] },
  { id: "sky", name: "Sky News", channelId: "UCoMdktPbSTixAyNGwb-UYkQ", city: "London", coord: [-0.33, 51.48] },
  { id: "wion", name: "WION", channelId: "UC_gUM8rL-Lrg6O3adPW9K1g", city: "New Delhi", coord: [77.21, 28.61] },
  { id: "ndtv", name: "NDTV", channelId: "UCZFMm1mMw0F81Z37aaEzTUA", city: "New Delhi", coord: [77.25, 28.55] },
  { id: "euronews", name: "euronews", channelId: "UCSrZ3UV4jOidv8ppoVuvW9Q", city: "Lyon", coord: [4.84, 45.76] },
  { id: "abc-au", name: "ABC News (Australia)", channelId: "UCVgO39Bk5sMo66-6o6Spn6Q", city: "Sydney", coord: [151.2, -33.87] }
];

export const broadcastItems = (): GeoItem[] =>
  BROADCASTS.map((b) => ({
    id: `tv:${b.id}`,
    kind: "broadcast",
    coord: b.coord,
    title: b.name,
    ts: null,
    severity: "low",
    source: "YouTube live",
    url: `https://www.youtube.com/channel/${b.channelId}/live`,
    facts: [`Newsroom: ${b.city}`, "click to watch live"],
    media: `https://www.youtube-nocookie.com/embed/live_stream?channel=${b.channelId}&autoplay=1&mute=1`
  }));
