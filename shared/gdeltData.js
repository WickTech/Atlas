// Global world-news + tone from the GDELT Project DOC 2.0 API.
// Free, no API key, high volume — used to complement Alpha Vantage's richer (but
// heavily rate-limited) per-article sentiment. Every fetcher self-falls-back so a
// GDELT outage or a malformed response never breaks the dashboard payload.
const { fetchWithTimeout } = require("./fetchWithTimeout");

const GDELT_BASE = process.env.GDELT_BASE || "https://api.gdeltproject.org/api/v2/doc/doc";

// Atlas is India-first: bias the query toward India + South Asia while still
// pulling global markets/geopolitics for the "World" scope. The frontend India/
// World toggle then filters client-side using the `indiaRelated` flag below
// (the SSE stream is shared, so scope can't be a per-client server param).
const DEFAULT_QUERY =
  process.env.GDELT_QUERY ||
  "(India OR Bharat OR Modi OR RBI OR Sensex OR Nifty OR Rupee OR economy OR markets OR geopolitics)";

const asNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

// Heuristic: is this article India-relevant? Drives the India/World scope toggle
// and India-boosted ranking. Exported so the metrics layer can reuse it.
const INDIA_RE =
  /\b(india|indian|bharat|modi|new delhi|delhi|mumbai|bengaluru|bangalore|kolkata|chennai|hyderabad|sensex|nifty|\brbi\b|rupee|sebi|adani|reliance|infosys|\btcs\b)\b/i;
const isIndiaRelated = ({ title = "", country = "", summary = "" } = {}) =>
  country === "India" || INDIA_RE.test(`${title} ${summary}`);

const gdeltUrl = (params) => {
  const search = new URLSearchParams(params);
  return `${GDELT_BASE}?${search.toString()}`;
};

// GDELT sometimes returns HTML/plain-text errors with a 200 status, so we read as
// text first and only parse when it looks like JSON.
const fetchGdeltJson = async (url) => {
  const response = await fetchWithTimeout(url, {
    headers: { Accept: "application/json", "User-Agent": "Atlas/1.0" }
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    throw new Error("Non-JSON GDELT response");
  }
  return JSON.parse(trimmed);
};

// GDELT timestamps are "YYYYMMDDTHHMMSSZ" (or "YYYYMMDDHHMMSS"). Normalize to ISO.
const parseGdeltTime = (raw) => {
  if (!raw) return null;
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length < 14) return null;
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(
    6,
    8
  )}T${digits.slice(8, 10)}:${digits.slice(10, 12)}:${digits.slice(12, 14)}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// World news article list -> merged into the main news feed.
const fetchGdeltNews = async () => {
  try {
    const payload = await fetchGdeltJson(
      gdeltUrl({
        query: DEFAULT_QUERY,
        mode: "ArtList",
        format: "json",
        maxrecords: "50",
        sort: "DateDesc"
      })
    );

    const articles = Array.isArray(payload?.articles) ? payload.articles : [];
    return articles.slice(0, 60).map((a) => {
      const country = a.sourcecountry || null;
      return {
        title: a.title,
        url: a.url,
        source: a.domain,
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
    });
  } catch (_error) {
    return [];
  }
};

// Aggregate tone distribution for the broad query -> sentiment context when
// Alpha Vantage volume is thin. Returns { bins: [{ tone, count }], average }.
const fetchWorldTone = async () => {
  try {
    const payload = await fetchGdeltJson(
      gdeltUrl({
        query: DEFAULT_QUERY,
        mode: "ToneChart",
        format: "json"
      })
    );

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
  } catch (_error) {
    return { bins: [], average: null };
  }
};

// Two GDELT endpoints, fetched concurrently (each self-falls-back on error so
// one throttled/failed call never blocks the other).
const fetchGdeltBundle = async () => {
  const [news, tone] = await Promise.all([fetchGdeltNews(), fetchWorldTone()]);
  return { news, tone };
};

module.exports = {
  fetchGdeltNews,
  fetchWorldTone,
  fetchGdeltBundle,
  parseGdeltTime,
  isIndiaRelated
};
