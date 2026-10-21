import { describe, expect, it, vi } from "vitest";

import type { Article, EnrichedArticle, Instrument, Metrics } from "@/types/metrics";

import { parseAvTime } from "./alphaVantage";
import { createCache } from "./cache";
import { classifyArticle } from "./categories";
import { computeCountryIndex } from "./countryIndex";
import { computeComposite } from "./finance";
import { isIndiaRelated, parseGdeltTime } from "./gdelt";
import { normalizeCountryName } from "./geo";
import { parseJsonLoose } from "./llm";
import { enrich, mergeNews } from "./metrics";
import { retainLastGoodNews } from "./metricsCache";
import { computeSentiment } from "./sentiment";
import { computeSignals } from "./signals";

const NOW = Date.parse("2026-10-21T12:00:00Z");

const article = (over: Partial<Article> = {}): Article => ({
  title: "Headline",
  url: `https://example.com/${Math.random()}`,
  source: "example.com",
  sourceDomain: "example.com",
  timePublished: "2026-10-21T10:00:00.000Z",
  summary: "",
  bannerImage: null,
  sentimentScore: null,
  sentimentLabel: "Neutral",
  topics: [],
  tickerSentiment: [],
  provider: "GDELT",
  ...over
});

describe("timestamp parsers", () => {
  it("parses Alpha Vantage and GDELT formats, rejects garbage", () => {
    expect(parseAvTime("20261021T093000")).toBe("2026-10-21T09:30:00.000Z");
    expect(parseAvTime("2026")).toBeNull();
    expect(parseGdeltTime("20261021T093000Z")).toBe("2026-10-21T09:30:00.000Z");
    expect(parseGdeltTime("not a date")).toBeNull();
    expect(parseGdeltTime(undefined)).toBeNull();
  });
});

describe("classifyArticle", () => {
  it("prefers topic tags over keywords", () => {
    expect(classifyArticle({ title: "Army drills", summary: "", topics: ["earnings"] })).toBe("business");
  });
  it("matches keywords on word boundaries only", () => {
    // "said"/"again" must not trip the "ai" technology keyword
    expect(classifyArticle({ title: "Officials said talks would resume again", summary: "", topics: [] })).toBe("general");
    expect(classifyArticle({ title: "New AI chip unveiled", summary: "", topics: [] })).toBe("technology");
    expect(classifyArticle({ title: "Missile strike reported", summary: "", topics: [] })).toBe("defense");
  });
});

describe("geo + india relevance", () => {
  it("normalizes GDELT names to topojson names", () => {
    expect(normalizeCountryName("United States")).toBe("United States of America");
    expect(normalizeCountryName("  India ")).toBe("India");
    expect(normalizeCountryName("")).toBeNull();
  });
  it("flags India-related stories without substring false positives", () => {
    expect(isIndiaRelated({ title: "Sensex closes higher" })).toBe(true);
    expect(isIndiaRelated({ title: "Anything", country: "India" })).toBe(true);
    expect(isIndiaRelated({ title: "Indiana weather update" })).toBe(false);
  });
});

describe("mergeNews", () => {
  it("dedupes by URL preferring the scored copy, newest first", () => {
    const a = article({ url: "https://x/1", timePublished: "2026-10-21T08:00:00Z" });
    const scored = article({ url: "https://x/1", sentimentScore: 0.4, provider: "Alpha Vantage", timePublished: "2026-10-21T08:00:00Z" });
    const newer = article({ url: "https://x/2", timePublished: "2026-10-21T11:00:00Z" });
    const out = mergeNews([a, scored, newer]);
    expect(out).toHaveLength(2);
    expect(out[0]?.url).toBe("https://x/2");
    expect(out[1]?.sentimentScore).toBe(0.4);
  });
});

describe("sentiment", () => {
  it("averages scored articles and falls back to GDELT tone", () => {
    const s = computeSentiment([article({ sentimentScore: 0.3 }), article({ sentimentScore: 0.1 })], null);
    expect(s.overall.score).toBe(0.2);
    expect(s.overall.label).toBe("Bullish");
    const t = computeSentiment([article()], { bins: [], average: -4 });
    expect(t.overall.score).toBe(-0.4);
    expect(t.overall.bucket).toBe("bearish");
  });
});

describe("country index + signals", () => {
  const news: EnrichedArticle[] = [
    ...Array.from({ length: 6 }, (_, i) => enrich(article({ title: `Missile strike ${i}`, country: "Ukraine", sentimentScore: -0.5 }))),
    enrich(article({ title: "Election results", country: "India" })),
    enrich(article({ title: "Oil prices", country: "India" })),
    enrich(article({ title: "Cricket final", country: "India" }))
  ];

  it("ranks by recency-weighted activity + negativity and pins India", () => {
    const idx = computeCountryIndex(news, NOW);
    expect(idx.countries[0]?.name).toBe("Ukraine");
    expect(idx.india?.count).toBe(3);
    expect(idx.max).toBe(idx.countries[0]?.score);
  });

  it("emits hotspot + convergence signals, high severity first", () => {
    const signals = computeSignals(news, computeCountryIndex(news, NOW), NOW);
    expect(signals.some((s) => s.type === "hotspot" && s.subject === "Ukraine")).toBe(true);
    expect(signals.some((s) => s.type === "convergence" && s.subject === "India")).toBe(true);
    const ranks = signals.map((s) => ({ high: 0, medium: 1, low: 2 })[s.severity]);
    expect([...ranks].sort()).toEqual(ranks);
  });

  it("is safe on empty input", () => {
    expect(computeCountryIndex([], NOW)).toEqual({ countries: [], max: 0, india: null });
    expect(computeSignals([], undefined, NOW)).toEqual([]);
  });
});

describe("finance composite", () => {
  it("labels risk-on/off from Indian index moves", () => {
    const base: Omit<Instrument, "symbol" | "changePercent"> = { name: "", currency: "INR", region: "india", kind: "index", price: 1, sparkline: [], source: "Yahoo Finance" };
    expect(computeComposite([{ ...base, symbol: "A", changePercent: 1 }, { ...base, symbol: "B", changePercent: 0.2 }]).label).toBe("Risk-on");
    expect(computeComposite([{ ...base, symbol: "A", changePercent: null }]).label).toBe("Unknown");
  });
});

describe("parseJsonLoose", () => {
  it("handles fences and surrounding prose", () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('Sure! {"a":2} hope that helps')).toEqual({ a: 2 });
    expect(parseJsonLoose("nope")).toBeNull();
  });
});

describe("createCache", () => {
  it("coalesces concurrent cold calls and serves stale on failure", async () => {
    let n = 0;
    const load = vi.fn(async () => {
      n += 1;
      if (n === 2) throw new Error("upstream down");
      return n;
    });
    const cache = createCache(load, 0);
    const [a, b] = await Promise.all([cache.get(), cache.get()]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(a.data).toBe(1);
    expect(b.data).toBe(1);
    expect((await cache.get()).data).toBe(1); // second load throws -> last good value
  });
});

describe("retainLastGoodNews", () => {
  it("keeps the previous real feed when a refresh only has the fallback item", () => {
    const real = { news: [enrich(article())], sentiment: {}, topTickers: [] } as unknown as Metrics;
    const empty = { news: [enrich(article({ provider: "Fallback" }))], sentiment: {}, topTickers: [] } as unknown as Metrics;
    const out = retainLastGoodNews(empty, real);
    expect(out.newsStale).toBe(true);
    expect(out.news).toBe(real.news);
    expect(retainLastGoodNews(real, empty)).toBe(real);
  });
});
