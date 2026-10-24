// Assembles the full /api/metrics payload from live sources (publisher RSS,
// Alpha Vantage stock + news, GDELT world news + tone, Yahoo Finance
// instruments). Each source self-falls-back, so this resolves even when an
// upstream is down.
import type { Article, CategoryCount, EnrichedArticle, Metrics } from "@/types/metrics";

import { avBundle } from "./alphaVantage";
import { ruleBasedBriefs } from "./briefs";
import { ALL_CATEGORIES, classifyArticle } from "./categories";
import { computeCountryIndex } from "./countryIndex";
import { fetchFinance } from "./finance";
import { fetchGdeltBundle, isIndiaRelated } from "./gdelt";
import { normalizeCountryName } from "./geo";
import { fetchRssNews } from "./rss";
import { computeSentiment } from "./sentiment";
import { computeSignals } from "./signals";

// Keeps payloads small: the feed, map and risk index only need the freshest slice.
const MAX_ARTICLES = 200;

// De-dupes articles from every source by URL (falling back to title), preferring
// the entry that carries a real sentiment score (Alpha Vantage). Newest first.
export const mergeNews = (items: Article[]): Article[] => {
  const byKey = new Map<string, Article>();
  for (const item of items) {
    if (!item?.title && !item?.url) continue;
    const key = (item.url || item.title || "").trim().toLowerCase();
    const existing = byKey.get(key);
    if (!existing || (existing.sentimentScore == null && item.sentimentScore != null)) byKey.set(key, item);
  }
  const ts = (a: Article) => (a.timePublished ? Date.parse(a.timePublished) : 0);
  const newestFirst = (a: Article, b: Article) => ts(b) - ts(a);
  // Articles with a real sentiment score (Alpha Vantage) are what the sentiment gauge and ticker
  // list are computed from, and they are fetched only every few hours. A burst of newer RSS items
  // must not push them out of the cap, so they are always kept and the plain items fill the rest.
  const all = [...byKey.values()];
  const scored = all.filter((a) => a.sentimentScore != null).sort(newestFirst).slice(0, MAX_ARTICLES);
  const plain = all.filter((a) => a.sentimentScore == null).sort(newestFirst).slice(0, MAX_ARTICLES - scored.length);
  return [...scored, ...plain].sort(newestFirst);
};

export const enrich = (n: Article): EnrichedArticle => ({
  ...n,
  indiaRelated: n.indiaRelated ?? isIndiaRelated(n),
  category: classifyArticle(n),
  // Normalized to the map's topojson name so map/risk clicks filter the feed.
  countryNorm: normalizeCountryName(n.country)
});

export const generateMetrics = async (): Promise<Metrics> => {
  const [{ bestStock, news: avNews }, rssNews, gdelt, finance] = await Promise.all([
    avBundle.get(),
    fetchRssNews(),
    fetchGdeltBundle(),
    fetchFinance()
  ]);

  // The AV fallback placeholder only belongs in the feed when nothing real arrived.
  const live = [...avNews.filter((n) => n.provider !== "Fallback"), ...rssNews, ...gdelt.news];
  const news = mergeNews(live.length ? live : avNews).map(enrich);
  const sentiment = computeSentiment(news, gdelt.tone);
  const countryIndex = computeCountryIndex(news);
  const signals = computeSignals(news, countryIndex);

  const catCounts = news.reduce<Record<string, number>>((acc, n) => {
    acc[n.category] = (acc[n.category] ?? 0) + 1;
    return acc;
  }, {});
  const categories: CategoryCount[] = ALL_CATEGORIES.map((c) => ({ ...c, count: catCounts[c.key] ?? 0 })).filter((c) => c.count > 0);

  // The LLM briefing is deliberately NOT generated here: a free-tier model takes 5-15 s,
  // which used to be added on top of the fan-out on every cold refresh. This payload
  // carries the instant rule-based digest; /api/briefing serves the AI version separately.
  const briefs = ruleBasedBriefs(news);

  return {
    sentiment,
    news,
    topTickers: sentiment.topTickers,
    bestStock,
    countryIndex,
    signals,
    categories,
    briefs,
    finance,
    dataSources: [
      ...new Set([...news.map((n) => n.provider), "Yahoo Finance"].filter((p) => p !== "Fallback"))
    ].map((p) => (p === "RSS" ? "Publisher RSS" : p)),
    updatedAt: new Date().toISOString()
  };
};
