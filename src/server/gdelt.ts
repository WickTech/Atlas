// Global world-news + tone from the GDELT Project DOC 2.0 API. Free, no key,
// high volume — complements Alpha Vantage's richer (but heavily rate-limited)
// per-article sentiment. GDELT throttles aggressively (429), so this must only
// ever run behind a cache. Every fetcher self-falls-back.
import type { Article, WorldTone } from "@/types/metrics";

import { asNumber, fetchWithTimeout, USER_AGENT } from "./fetchWithTimeout";

const GDELT_BASE = process.env.GDELT_BASE || "https://api.gdeltproject.org/api/v2/doc/doc";

// Atlas is India-first: bias the query toward India + South Asia while still
// pulling global markets/geopolitics for the "World" scope. The client
// India/World toggle filters on the `indiaRelated` flag below.
const DEFAULT_QUERY =
  process.env.GDELT_QUERY ||
  "(India OR Bharat OR Modi OR RBI OR Sensex OR Nifty OR Rupee OR economy OR markets OR geopolitics)";

const INDIA_RE =
  /\b(india|indian|bharat|modi|new delhi|delhi|mumbai|bengaluru|bangalore|kolkata|chennai|hyderabad|sensex|nifty|rbi|rupee|sebi|adani|reliance|infosys|tcs)\b/i;

/** Is this article India-relevant? Drives the India/World scope toggle. */
export const isIndiaRelated = ({
  title = "",
  country = "",
  summary = ""
}: {
  title?: string | null;
  country?: string | null;
  summary?: string | null;
}): boolean => country === "India" || INDIA_RE.test(`${title ?? ""} ${summary ?? ""}`);

const gdeltUrl = (params: Record<string, string>) => `${GDELT_BASE}?${new URLSearchParams(params).toString()}`;

/**
 * GDELT is supplementary: it allows 1 request / 5 s per IP, so serverless IPs are
 * throttled or left hanging, and from Vercel it usually contributes nothing. It must
 * not hold up the whole metrics refresh, so it gets a short deadline (the default 7 s
 * made every cold /api/metrics call wait the full 7 s for an answer that never came).
 */
export const GDELT_TIMEOUT_MS = 2500;

// GDELT sometimes returns HTML/plain-text errors with a 200 status, so read as
// text first and only parse when it looks like JSON.
export const fetchGdeltJson = async (url: string, timeoutMs = GDELT_TIMEOUT_MS): Promise<unknown> => {
  const response = await fetchWithTimeout(
    url,
    { headers: { Accept: "application/json", "User-Agent": USER_AGENT } },
    timeoutMs
  );
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const trimmed = (await response.text()).trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) throw new Error("Non-JSON GDELT response");
  return JSON.parse(trimmed);
};

/** GDELT timestamps are "YYYYMMDDTHHMMSSZ" (or "YYYYMMDDHHMMSS"). Normalize to ISO. */
export const parseGdeltTime = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const d = String(raw).replace(/[^0-9]/g, "");
  if (d.length < 14) return null;
  const date = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(8, 10)}:${d.slice(10, 12)}:${d.slice(12, 14)}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

interface GdeltArticle {
  url: string;
  title: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

export const toArticle = (a: GdeltArticle): Article => {
  const country = a.sourcecountry || null;
  return {
    title: a.title,
    url: a.url,
    source: a.domain || null,
    sourceDomain: a.domain || null,
    timePublished: parseGdeltTime(a.seendate),
    summary: "",
    bannerImage: a.socialimage || null,
    sentimentScore: null, // ToneChart provides aggregate tone separately
    sentimentLabel: "Neutral",
    topics: [],
    tickerSentiment: [],
    country,
    language: a.language || null,
    indiaRelated: isIndiaRelated({ title: a.title, country }),
    provider: "GDELT"
  };
};

export const fetchGdeltNews = async (query = DEFAULT_QUERY, maxrecords = 50): Promise<Article[]> => {
  try {
    const payload = (await fetchGdeltJson(
      gdeltUrl({ query, mode: "ArtList", format: "json", maxrecords: String(maxrecords), sort: "DateDesc" })
    )) as { articles?: GdeltArticle[] };
    const articles = Array.isArray(payload?.articles) ? payload.articles : [];
    return articles.filter((a) => a.title && a.url).map(toArticle);
  } catch {
    return [];
  }
};

/** Aggregate tone distribution for the broad query -> sentiment context when AV volume is thin. */
export const fetchWorldTone = async (): Promise<WorldTone> => {
  try {
    const payload = (await fetchGdeltJson(gdeltUrl({ query: DEFAULT_QUERY, mode: "ToneChart", format: "json" }))) as {
      tonechart?: { bin: number | string; count: number | string }[];
    };
    const bins = Array.isArray(payload?.tonechart)
      ? payload.tonechart.map((b) => ({ tone: asNumber(b.bin), count: asNumber(b.count) }))
      : [];
    if (!bins.length) return { bins: [], average: null };

    let weighted = 0;
    let total = 0;
    for (const b of bins) {
      if (b.tone == null || b.count == null) continue;
      weighted += b.tone * b.count;
      total += b.count;
    }
    return { bins, average: total ? Number((weighted / total).toFixed(2)) : null };
  } catch {
    return { bins: [], average: null };
  }
};

// GDELT allows one request per 5 s per IP, so the two calls are deliberately
// sequential (firing them in parallel guaranteed a 429 on one of them), and the
// tone call is skipped when the article call was already throttled.
export const fetchGdeltBundle = async () => {
  const news = await fetchGdeltNews();
  const tone = news.length ? await fetchWorldTone() : { bins: [], average: null };
  return { news, tone };
};
