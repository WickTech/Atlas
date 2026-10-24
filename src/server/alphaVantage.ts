// Alpha Vantage: top gainer + rich per-article news sentiment. Free tier is
// ~25 req/day, so callers must sit behind the metrics cache (never per-request).
import type { Article, BestStock } from "@/types/metrics";

import { asNumber, fetchWithTimeout, USER_AGENT } from "./fetchWithTimeout";

const alphaVantageUrl = (params: Record<string, string>) => {
  const search = new URLSearchParams({ ...params, apikey: process.env.ALPHA_VANTAGE_API_KEY || "demo" });
  return `https://www.alphavantage.co/query?${search.toString()}`;
};

/**
 * Alpha Vantage reports rate limits, bad keys and premium-only endpoints as a normal
 * HTTP 200 whose JSON is just `{"Information": "..."}` (or `Note` / `Error Message`).
 * Without this check that looks like "no articles" and the cause is invisible.
 */
export const avMessage = (payload: unknown): string | null => {
  const p = payload as { Information?: unknown; Note?: unknown; "Error Message"?: unknown } | null;
  const msg = p?.Information ?? p?.Note ?? p?.["Error Message"];
  return typeof msg === "string" && msg ? msg : null;
};

/**
 * "This is a premium endpoint": the key is valid but the plan can't use that function. As of
 * 2026 NEWS_SENTIMENT is premium-only, so on a free key asking again can never succeed.
 */
export const isPremiumMessage = (message: string) => /premium (endpoint|plan)/i.test(message);

class AvPremiumError extends Error {}

const PREMIUM_RECHECK_MS = 24 * 60 * 60_000;
/** function name -> time until which we don't ask again because the plan lacks it. */
const premiumUntil = new Map<string, number>();

const fetchJson = async (url: string, fn?: string): Promise<unknown> => {
  const response = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const payload = await response.json();
  const message = avMessage(payload);
  if (message) {
    if (fn && isPremiumMessage(message)) {
      premiumUntil.set(fn, Date.now() + PREMIUM_RECHECK_MS);
      throw new AvPremiumError(message.slice(0, 160));
    }
    throw new Error(message.slice(0, 160));
  }
  return payload;
};

const logFailure = (fn: string, error: unknown) =>
  console.warn(`[av] ${fn} failed: ${error instanceof Error ? error.message : "unknown"}`);

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
    const payload = (await fetchJson(alphaVantageUrl({ function: "TOP_GAINERS_LOSERS" }), "TOP_GAINERS_LOSERS")) as {
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
  } catch (error) {
    logFailure("TOP_GAINERS_LOSERS", error);
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

/** Empty array (not the fallback article) means "this plan has no news sentiment": nothing to retry. */
export const fetchWorldNews = async (): Promise<Article[]> => {
  if ((premiumUntil.get("NEWS_SENTIMENT") ?? 0) > Date.now()) return [];
  try {
    const payload = (await fetchJson(
      alphaVantageUrl({
        function: "NEWS_SENTIMENT",
        topics: "financial_markets,economy_macro,technology,finance",
        sort: "LATEST",
        limit: "50"
      }),
      "NEWS_SENTIMENT"
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
  } catch (error) {
    if (error instanceof AvPremiumError) {
      console.warn("[av] NEWS_SENTIMENT is premium-only on this key's plan; skipping it for 24 h. Sentiment now comes from headline wording.");
      return [];
    }
    logFailure("NEWS_SENTIMENT", error);
    return [FALLBACK_ARTICLE];
  }
};

// ---------------------------------------------------------------------------
// Quota-safe access. The free tier allows ~25 requests/day AND 1 request/second,
// but the metrics refresh runs every minute and used to fire both calls at once.
// So: one bundle, calls spaced out, results kept for hours, and a failed refresh
// retried only after a pause (while the last good data keeps being served).
// ---------------------------------------------------------------------------
export interface AvBundle {
  news: Article[];
  bestStock: BestStock;
}

export interface AvBundleOptions {
  /** How long a good bundle is reused. 2 calls per refresh, ~25/day => at most ~12 refreshes/day. */
  ttlMs?: number;
  /** After a refresh in which a call failed, wait this long before asking again. */
  retryAfterMs?: number;
  /** Gap between the two calls (the 1 req/s limit). */
  spacingMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  loadNews?: () => Promise<Article[]>;
  loadStock?: () => Promise<BestStock>;
}

// [] = "not available on this plan" (a settled answer); only the fallback article means a failed call.
const isFallbackNews = (news: Article[]) => news.length > 0 && news.every((n) => n.provider === "Fallback");
const isFallbackStock = (s: BestStock) => s.source === "Fallback";
const FALLBACK_STOCK: BestStock = { symbol: "N/A", name: "Market data unavailable", changePercent: null, price: null, volume: null, source: "Fallback" };

export const createAvBundle = ({
  ttlMs = 3 * 60 * 60_000,
  retryAfterMs = 20 * 60_000,
  spacingMs = 1200,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  loadNews = fetchWorldNews,
  loadStock = fetchBestPerformingStock
}: AvBundleOptions = {}) => {
  // `at` is when the bundle stops being fresh minus ttl; a bundle with a failed half is
  // stamped so that it expires after only `retryAfterMs`, which is the retry pause.
  let current: { bundle: AvBundle; at: number } = { bundle: { news: [FALLBACK_ARTICLE], bestStock: FALLBACK_STOCK }, at: -Infinity };
  let inflight: Promise<AvBundle> | null = null;

  const refresh = async (): Promise<AvBundle> => {
    // News first (it carries the sentiment), then the gap, then the top gainer.
    const news = await loadNews();
    await sleep(spacingMs);
    const bestStock = await loadStock();
    const newsFailed = isFallbackNews(news);
    const stockFailed = isFallbackStock(bestStock);
    // Keep whichever half worked, and the last good data for whichever half did not.
    const bundle: AvBundle = {
      news: newsFailed ? current.bundle.news : news,
      bestStock: stockFailed ? current.bundle.bestStock : bestStock
    };
    current = { bundle, at: newsFailed || stockFailed ? now() - ttlMs + retryAfterMs : now() };
    return bundle;
  };

  return {
    get: async (): Promise<AvBundle> => {
      if (now() - current.at < ttlMs) return current.bundle;
      inflight ??= refresh().finally(() => {
        inflight = null;
      });
      return inflight;
    }
  };
};

/** Shared by every metrics refresh on this instance. */
export const avBundle = createAvBundle();
