// Alpha Vantage: top gainer + rich per-article news sentiment. Free tier is
// ~25 req/day, so callers must sit behind the metrics cache (never per-request).
import type { Article, BestStock } from "@/types/metrics";

import { asNumber, fetchWithTimeout, USER_AGENT } from "./fetchWithTimeout";

const alphaVantageUrl = (params: Record<string, string>) => {
  const search = new URLSearchParams({ ...params, apikey: process.env.ALPHA_VANTAGE_API_KEY || "demo" });
  return `https://www.alphavantage.co/query?${search.toString()}`;
};

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
};

interface AvGainer {
  ticker: string;
  price: string;
  change_percentage: string;
  volume: string;
}

interface AvFeedItem {
  title: string;
  url: string;
  source: string;
  source_domain?: string;
  time_published?: string;
  summary?: string;
  banner_image?: string;
  overall_sentiment_score?: number | string;
  overall_sentiment_label?: string;
  topics?: { topic?: string }[];
  ticker_sentiment?: {
    ticker: string;
    ticker_sentiment_score?: string;
    ticker_sentiment_label?: string;
    relevance_score?: string;
  }[];
}

export const fetchBestPerformingStock = async (): Promise<BestStock> => {
  try {
    const payload = (await fetchJson(alphaVantageUrl({ function: "TOP_GAINERS_LOSERS" }))) as {
      top_gainers?: AvGainer[];
    };
    const topGainer = payload?.top_gainers?.[0];
    if (!topGainer) throw new Error("No top gainer returned");

    return {
      symbol: topGainer.ticker,
      name: topGainer.ticker,
      changePercent: asNumber((topGainer.change_percentage || "").replace(/%/g, "")),
      price: asNumber(topGainer.price),
      volume: asNumber(topGainer.volume),
      source: "Alpha Vantage"
    };
  } catch {
    return { symbol: "N/A", name: "Market data unavailable", changePercent: null, price: null, volume: null, source: "Fallback" };
  }
};

/** Parses Alpha Vantage's "YYYYMMDDTHHMMSS" timestamp into ISO; null when unparseable. */
export const parseAvTime = (raw: string | undefined | null): string | null => {
  if (!raw || raw.length < 15) return null;
  const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const FALLBACK_ARTICLE: Article = {
  title: "Live world news is temporarily unavailable.",
  url: "https://www.alphavantage.co/documentation/",
  source: "Fallback",
  sourceDomain: "alphavantage.co",
  timePublished: null,
  summary: "",
  bannerImage: null,
  sentimentScore: null,
  sentimentLabel: "Neutral",
  topics: [],
  tickerSentiment: [],
  provider: "Fallback"
};

export const fetchWorldNews = async (): Promise<Article[]> => {
  try {
    const payload = (await fetchJson(
      alphaVantageUrl({
        function: "NEWS_SENTIMENT",
        topics: "financial_markets,economy_macro,technology,finance",
        sort: "LATEST",
        limit: "50"
      })
    )) as { feed?: AvFeedItem[] };

    const items: Article[] = Array.isArray(payload?.feed)
      ? payload.feed.slice(0, 50).map((item) => ({
          title: item.title,
          url: item.url,
          source: item.source,
          sourceDomain: item.source_domain || null,
          timePublished: parseAvTime(item.time_published),
          summary: item.summary || "",
          bannerImage: item.banner_image || null,
          sentimentScore: asNumber(item.overall_sentiment_score),
          sentimentLabel: item.overall_sentiment_label || "Neutral",
          topics: Array.isArray(item.topics) ? item.topics.map((t) => t.topic).filter((t): t is string => !!t) : [],
          tickerSentiment: Array.isArray(item.ticker_sentiment)
            ? item.ticker_sentiment.map((t) => ({
                ticker: t.ticker,
                score: asNumber(t.ticker_sentiment_score),
                label: t.ticker_sentiment_label || "Neutral",
                relevance: asNumber(t.relevance_score)
              }))
            : [],
          provider: "Alpha Vantage"
        }))
      : [];

    if (!items.length) throw new Error("No news returned");
    return items;
  } catch {
    return [FALLBACK_ARTICLE];
  }
};
