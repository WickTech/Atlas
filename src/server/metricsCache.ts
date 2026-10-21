import type { Metrics } from "@/types/metrics";

import { createCache } from "./cache";
import { generateMetrics } from "./metrics";

// Alpha Vantage free tier is ~25 req/day, so per-request fetches would exhaust
// it almost immediately.
const TTL_MS = Number(process.env.METRICS_TTL_MS) || 60_000;

// "Real" news means at least one article from a live provider (not the safe
// fallback item). News-first dashboard: never surface a blank feed when an
// earlier refresh had one.
const hasRealNews = (m: Metrics) => m.news.some((n) => n.provider !== "Fallback");

export const retainLastGoodNews = (fresh: Metrics, prev: Metrics | null): Metrics => {
  if (hasRealNews(fresh) || !prev || !hasRealNews(prev)) return fresh;
  return { ...fresh, news: prev.news, sentiment: prev.sentiment, topTickers: prev.topTickers, newsStale: true };
};

export const metricsCache = createCache(generateMetrics, TTL_MS, retainLastGoodNews);
