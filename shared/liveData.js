const { fetchWithTimeout } = require("./fetchWithTimeout");

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "demo";

const alphaVantageUrl = (params) => {
  const search = new URLSearchParams({ ...params, apikey: ALPHA_VANTAGE_API_KEY });
  return `https://www.alphavantage.co/query?${search.toString()}`;
};

const asNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const fetchJson = async (url) => {
  const response = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "Atlas/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.json();
};

const fetchBestPerformingStock = async () => {
  try {
    const payload = await fetchJson(alphaVantageUrl({ function: "TOP_GAINERS_LOSERS" }));
    const topGainer = payload?.top_gainers?.[0];

    if (!topGainer) {
      throw new Error("No top gainer returned");
    }

    return {
      symbol: topGainer.ticker,
      name: topGainer.ticker,
      changePercent: asNumber((topGainer.change_percentage || "").replace(/%/g, "")),
      price: asNumber(topGainer.price),
      volume: asNumber(topGainer.volume),
      source: "Alpha Vantage"
    };
  } catch (_error) {
    return {
      symbol: "N/A",
      name: "Market data unavailable",
      changePercent: null,
      price: null,
      volume: null,
      source: "Fallback"
    };
  }
};

// Parses Alpha Vantage's "YYYYMMDDTHHMMSS" timestamp into an ISO string the
// frontend can pass straight to `new Date(...)`. Returns null when unparseable.
const parseAvTime = (raw) => {
  if (!raw || raw.length < 15) return null;
  const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(
    9,
    11
  )}:${raw.slice(11, 13)}:${raw.slice(13, 15)}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const fetchWorldNews = async () => {
  try {
    const payload = await fetchJson(
      alphaVantageUrl({
        function: "NEWS_SENTIMENT",
        topics: "financial_markets,economy_macro,technology,finance",
        sort: "LATEST",
        limit: "50"
      })
    );

    const items = Array.isArray(payload?.feed)
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
          topics: Array.isArray(item.topics)
            ? item.topics.map((t) => t.topic).filter(Boolean)
            : [],
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

    if (!items.length) {
      throw new Error("No news returned");
    }

    return items;
  } catch (_error) {
    return [
      {
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
      }
    ];
  }
};

module.exports = { fetchBestPerformingStock, fetchWorldNews, parseAvTime };
