import { describe, expect, it } from "vitest";

import { initialState } from "./store";
import { parse, serialize } from "./urlSync";

describe("url state", () => {
  it("round-trips layers, viewport, filters and selection", () => {
    const s = initialState();
    s.layers.news.enabled = false;
    s.viewport = { center: [12.3456, -45.6789], zoom: 3.14159 };
    s.filters = { ...s.filters, scope: "world", lens: "Energy", category: "defense" };
    s.selection = { kind: "country", name: "Côte d'Ivoire" };
    const p = parse(serialize(s));
    expect(p.layers?.news).toEqual({ enabled: false });
    expect(p.layers?.risk).toEqual({ enabled: true });
    expect(p.layers?.flights).toEqual({ enabled: false });
    expect(p.viewport).toEqual({ center: [12.35, -45.68], zoom: 3.1 });
    expect(p.filters).toEqual({ scope: "world", lens: "Energy", category: "defense" });
    expect(p.selection).toEqual({ kind: "country", name: "Côte d'Ivoire" });
  });

  it("omits defaults and ignores junk", () => {
    expect(serialize(initialState())).toBe("l=risk%2Cnews%2Cquakes%2Chazards%2Ccyber%2Cbroadcasts&v=80%2C22%2C2.4&s=india");
    expect(parse("v=abc,1,2&s=mars&lens=Crypto&cat=<script>&c=")).toEqual({});
    expect(parse("v=999,-999,99").viewport).toEqual({ center: [180, -85], zoom: 18 });
  });
});
