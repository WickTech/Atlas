import { describe, expect, it } from "vitest";

import type { EnrichedArticle } from "@/types/metrics";

import { clusterByCountry, effectiveCategory, filterNews } from "./news";

const a = (o: Partial<EnrichedArticle>): EnrichedArticle => ({
  title: "t",
  url: `u${Math.random()}`,
  source: "s",
  sourceDomain: null,
  timePublished: "2026-10-21T00:00:00Z",
  summary: "",
  bannerImage: null,
  sentimentScore: null,
  sentimentLabel: "Neutral",
  topics: [],
  tickerSentiment: [],
  provider: "RSS",
  indiaRelated: false,
  category: "general",
  countryNorm: null,
  ...o
});

const base = { scope: "world", lens: "World", category: "all", search: "" } as const;

describe("filterNews", () => {
  const news = [
    a({ title: "Sensex rally", indiaRelated: true, category: "markets" }),
    a({ title: "Oil shock", category: "energy" }),
    a({ title: "Election day", category: "politics" })
  ];
  it("applies scope, lens-forced category and search", () => {
    expect(filterNews(news, { ...base, scope: "india" })).toHaveLength(1);
    expect(filterNews(news, { ...base, lens: "Energy", category: "politics" }).map((n) => n.title)).toEqual(["Oil shock"]);
    expect(filterNews(news, { ...base, search: "ELECTION" })).toHaveLength(1);
    expect(effectiveCategory({ lens: "World", category: "politics" })).toBe("politics");
  });
});

describe("clusterByCountry", () => {
  it("groups by country, keeps the newest headline, skips unanchored", () => {
    const anchors = new Map<string, [number, number]>([["India", [78, 22]], ["France", [2, 46]]]);
    const out = clusterByCountry(
      [
        a({ countryNorm: "India", title: "old", timePublished: "2026-10-20T00:00:00Z" }),
        a({ countryNorm: "India", title: "new", timePublished: "2026-10-21T05:00:00Z" }),
        a({ countryNorm: "France" }),
        a({ countryNorm: "Atlantis" }),
        a({ countryNorm: null })
      ],
      anchors
    );
    expect(out.map((c) => [c.name, c.count])).toEqual([["France", 1], ["India", 2]]);
    expect(out[1]?.latest.title).toBe("new");
    expect(out[1]?.coord).toEqual([78, 22]);
  });
});
