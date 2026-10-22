import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { bboxToPoint, MAX_RADIUS_NM, parseAdsb, parseBBox, parseFeodo, parseGdacsRss, parseIoda, parseTfl } from "@/server/live";

import { parseEonet, parseUsgs, quakeSeverity } from "./parse";
import { broadcastItems, parseStrategic, type StrategicFile } from "./static";
import { cyberItems, outageSeverity } from "./useLiveLayers";

describe("parseUsgs", () => {
  const feed = {
    features: [
      { id: "a", geometry: { coordinates: [165.6, -13.9, 10] }, properties: { mag: 4.9, place: "Vanuatu", time: 1792671777822, url: "https://u/a", tsunami: 0, alert: null } },
      { id: "b", geometry: { coordinates: [142.1, 38.2, 120] }, properties: { mag: 6.4, place: "Japan", time: 1792671777822, tsunami: 1, alert: "yellow" } },
      { id: "bad", geometry: { coordinates: [999, 0, 0] }, properties: { mag: 3 } },
      { id: "nomag", geometry: { coordinates: [0, 0, 0] }, properties: { mag: null } }
    ]
  };
  it("normalizes valid events and drops malformed ones", () => {
    const out = parseUsgs(feed);
    expect(out.map((q) => q.id)).toEqual(["usgs:a", "usgs:b"]);
    expect(out[0]).toMatchObject({ kind: "quake", coord: [165.6, -13.9], value: 4.9, severity: "medium", category: "shallow" });
    expect(out[1]?.facts).toEqual(["M 6.4", "depth 120 km", "tsunami flag", "PAGER yellow"]);
    expect(out[1]?.category).toBe("deep");
    expect(parseUsgs(null)).toEqual([]);
  });
  it("grades severity by magnitude and PAGER alert", () => {
    expect(quakeSeverity(3)).toBe("low");
    expect(quakeSeverity(5)).toBe("medium");
    expect(quakeSeverity(6.1)).toBe("high");
    expect(quakeSeverity(4, "orange")).toBe("high");
  });
});

describe("parseEonet", () => {
  it("skips sea ice, de-dupes per event, takes track end points", () => {
    const out = parseEonet({
      features: [
        { geometry: { type: "Point", coordinates: [10, 10] }, properties: { id: "EONET_1", title: "Iceberg A68", categories: [{ id: "seaLakeIce" }] } },
        { geometry: { type: "LineString", coordinates: [[1, 1], [2, 2], [3, 3]] }, properties: { id: "EONET_2", title: "Cyclone X", date: "2026-10-21T00:00:00Z", categories: [{ id: "severeStorms", title: "Severe Storms" }], magnitudeValue: 90, magnitudeUnit: "kts" } },
        { geometry: { type: "Point", coordinates: [5, 5] }, properties: { id: "EONET_2", title: "Cyclone X (older)", categories: [{ id: "severeStorms" }] } }
      ]
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "eonet:EONET_2", coord: [3, 3], category: "severeStorms", severity: "medium", facts: ["Severe Storms", "90 kts"] });
  });
});

describe("parseGdacsRss", () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?><rss xmlns:gdacs="http://www.gdacs.org" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#"><channel>
<item><title>Red earthquake (Magnitude 7M, Depth:18km) in China</title><link>http://www.gdacs.org/report.aspx?eventtype=EQ&amp;eventid=1573141</link>
<gdacs:alertlevel>Red</gdacs:alertlevel><gdacs:eventtype>EQ</gdacs:eventtype><gdacs:eventid>1573141</gdacs:eventid><gdacs:country>China</gdacs:country>
<gdacs:severity>Magnitude 7M, Depth:18km</gdacs:severity><gdacs:iscurrent>true</gdacs:iscurrent><gdacs:todate>Thu, 22 Oct 2026 14:33:40 GMT</gdacs:todate>
<geo:Point><geo:lat>32.3805</geo:lat><geo:long>93.7797</geo:long></geo:Point></item>
<item><title>dup</title><gdacs:alertlevel>Red</gdacs:alertlevel><gdacs:eventtype>EQ</gdacs:eventtype><gdacs:eventid>1573141</gdacs:eventid><gdacs:iscurrent>true</gdacs:iscurrent><geo:Point><geo:lat>1</geo:lat><geo:long>1</geo:long></geo:Point></item>
<item><title>Flood X</title><gdacs:alertlevel>Green</gdacs:alertlevel><gdacs:eventtype>FL</gdacs:eventtype><gdacs:eventid>77</gdacs:eventid><gdacs:severity>Magnitude 0 </gdacs:severity><gdacs:country>France</gdacs:country><gdacs:iscurrent>true</gdacs:iscurrent><geo:Point><geo:lat>46</geo:lat><geo:long>2</geo:long></geo:Point></item>
<item><title>Small fire</title><gdacs:alertlevel>Green</gdacs:alertlevel><gdacs:eventtype>WF</gdacs:eventtype><gdacs:eventid>5</gdacs:eventid><gdacs:iscurrent>true</gdacs:iscurrent><geo:Point><geo:lat>1</geo:lat><geo:long>1</geo:long></geo:Point></item>
<item><title>Old flood</title><gdacs:alertlevel>Orange</gdacs:alertlevel><gdacs:eventtype>FL</gdacs:eventtype><gdacs:eventid>9</gdacs:eventid><gdacs:iscurrent>false</gdacs:iscurrent><geo:Point><geo:lat>1</geo:lat><geo:long>1</geo:long></geo:Point></item>
</channel></rss>`;
  it("keeps current events once, maps level/type, upgrades links to https", () => {
    const out = parseGdacsRss(xml);
    expect(out).toHaveLength(2);
    expect(out[1]?.facts).toEqual(["GDACS Green alert", "France"]); // placeholder severity dropped
    expect(out[0]).toMatchObject({
      id: "gdacs:EQ:1573141",
      coord: [93.7797, 32.3805],
      severity: "high",
      category: "earthquakes",
      url: "https://www.gdacs.org/report.aspx?eventtype=EQ&eventid=1573141",
      ts: "2026-10-22T14:33:40.000Z",
      facts: ["GDACS Red alert", "Magnitude 7M, Depth:18km", "China"]
    });
    expect(parseGdacsRss("<html/>")).toEqual([]);
  });
});

describe("flights", () => {
  it("validates and clamps bbox", () => {
    expect(parseBBox("-2,50,2,52")).toEqual([-2, 50, 2, 52]);
    expect(parseBBox("-200,-95,200,95")).toEqual([-180, -90, 180, 90]);
    expect(parseBBox("2,50,-2,52")).toBeNull();
    expect(parseBBox("a,b,c,d")).toBeNull();
    expect(parseBBox(null)).toBeNull();
  });
  it("covers the box with a capped radius", () => {
    const p = bboxToPoint([-2, 50, 2, 52]);
    expect(p.lat).toBe(51);
    expect(p.radiusNm).toBeGreaterThan(60);
    expect(p.radiusNm).toBeLessThan(150);
    expect(bboxToPoint([-30, 0, 30, 30]).radiusNm).toBe(MAX_RADIUS_NM);
  });
  it("trims aircraft to the box and flags military/ground", () => {
    const out = parseAdsb(
      {
        ac: [
          { hex: "abc", flight: "BAW12  ", lat: 51.5, lon: -0.1, alt_baro: 35000, gs: 450.4, track: 90.6, t: "A320", dbFlags: 0 },
          { hex: "def", lat: 51.4, lon: 0.2, alt_baro: "ground", gs: 3, track: 0, dbFlags: 1 },
          { hex: "out", lat: 60, lon: 10, alt_baro: 1000 },
          { hex: "twr", lat: 51.47, lon: -0.45, alt_baro: "ground", t: "TWR" },
          { hex: "veh", flight: "@@@@@@@@", lat: 51.47, lon: -0.45, alt_baro: "ground" },
          { hex: "c2", lat: 51.47, lon: -0.45, alt_baro: "ground", category: "C2" },
          { flight: "nohex", lat: 51, lon: 0 }
        ]
      },
      [-2, 50, 2, 52]
    );
    expect(out).toEqual([
      ["abc", "BAW12", -0.1, 51.5, 35000, 450, 91, "A320", 0],
      ["def", "", 0.2, 51.4, -1, 3, 0, "", 1]
    ]);
  });
});

describe("cyber", () => {
  const ioda = parseIoda({
    data: [
      { entity: { code: "CF", name: "Central African Republic", type: "country" }, scores: { "bgp.median": 1370, "gtr.sarima": 5619, overall: 7700771 }, event_cnt: 2 },
      { entity: { code: "TJ", name: "Tajikistan", type: "country" }, scores: { overall: 29 }, event_cnt: 1 },
      { entity: { code: "X", name: "Region", type: "region" }, scores: { overall: 5 } }
    ]
  });
  const feodo = parseFeodo([
    { country: "US", malware: "Emotet", status: "offline", as_name: "DIGITALOCEAN-ASN", last_online: "2026-03-07" },
    { country: "US", malware: "QakBot", status: "online", as_name: "X" },
    { country: null, malware: "?" }
  ]);
  it("parses IODA country summaries and Feodo entries", () => {
    expect(ioda.map((o) => o.code)).toEqual(["CF", "TJ"]);
    expect(ioda[0]?.signals).toEqual(["BGP", "Google traffic"]);
    expect(feodo).toHaveLength(2);
  });
  it("places records at country anchors and fans out co-located C2 hosts", () => {
    const anchors = new Map<string, [number, number]>([["Central African Rep.", [20, 6]], ["United States of America", [-98, 39]]]);
    const items = cyberItems({ outages: ioda, c2: feodo, sources: [], fetchedAt: "2026-10-22T00:00:00Z" }, anchors);
    expect(items.map((i) => i.id)).toEqual(["ioda:CF", "c2:0", "c2:1"]); // TJ has no anchor here
    expect(items[0]?.severity).toBe("high");
    expect(items[1]?.coord).not.toEqual(items[2]?.coord);
    expect(items[2]?.severity).toBe("high"); // online C2
    expect(outageSeverity(29)).toBe("low");
  });
});

describe("parseTfl", () => {
  it("keeps available cameras with https stills", () => {
    const out = parseTfl([
      { id: "JamCams_1", commonName: "A406 Billet", lat: 51.6, lon: -0.016, additionalProperties: [{ key: "available", value: "true" }, { key: "imageUrl", value: "https://s3/x.jpg" }, { key: "view", value: "West" }] },
      { id: "JamCams_2", lat: 51.6, lon: -0.01, additionalProperties: [{ key: "available", value: "false" }, { key: "imageUrl", value: "https://s3/y.jpg" }] },
      { id: "JamCams_3", lat: 51.6, lon: -0.01, additionalProperties: [{ key: "imageUrl", value: "http://insecure/z.jpg" }] }
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "tfl:JamCams_1", media: "https://s3/x.jpg", facts: ["view West"] });
  });
});

describe("static reference data", () => {
  const file = JSON.parse(readFileSync(join(process.cwd(), "public/data/strategic.json"), "utf8")) as StrategicFile;
  const items = parseStrategic(file);
  it("has valid coordinates and unique ids", () => {
    for (const i of items) {
      expect(Math.abs(i.coord[0])).toBeLessThanOrEqual(180);
      expect(Math.abs(i.coord[1])).toBeLessThanOrEqual(90);
    }
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it("cites EIA only for the eight EIA chokepoints and labels everything static", () => {
    expect(items.filter((i) => i.source === "U.S. EIA")).toHaveLength(8);
    expect(items.every((i) => i.facts.some((f) => /static|not live/.test(f)))).toBe(true);
  });
  it("broadcast embeds use the privacy-enhanced host", () => {
    for (const b of broadcastItems()) expect(b.media).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/live_stream\?channel=UC[\w-]{22}&/);
  });
});
