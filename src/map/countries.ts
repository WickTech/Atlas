import type { FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

import { countryAnchor, unwrapGeometry } from "./geometry";

export type CountryProps = { name: string };
export type Countries = FeatureCollection<Geometry, CountryProps>;

export interface CountryData {
  geojson: Countries;
  /** topojson name -> [lng, lat] marker anchor */
  anchors: Map<string, [number, number]>;
}

let promise: Promise<CountryData> | null = null;

/** Vendored world-atlas 110m topology (same names the risk index normalizes to). Fetched once per session. */
export const loadCountries = (): Promise<CountryData> =>
  (promise ??= fetch("/data/countries-110m.json")
    .then((r) => r.json() as Promise<Topology<{ countries: GeometryCollection<CountryProps> }>>)
    .then((topo) => {
      const fc = feature(topo, topo.objects.countries) as Countries;
      const features = fc.features.map((f) => ({ ...f, geometry: unwrapGeometry(f.geometry) }));
      const anchors = new Map<string, [number, number]>();
      for (const f of features) {
        const a = countryAnchor(f.geometry);
        if (a) anchors.set(f.properties.name, a);
      }
      return { geojson: { ...fc, features }, anchors };
    }));
