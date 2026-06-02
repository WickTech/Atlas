const { fetchBestPerformingStock, fetchWorldNews } = require("./liveData");
const { fetchGdeltBundle } = require("./gdeltData");
const { fetchGlobalMarket, fetchTopCoins, fetchBtcSeries } = require("./cryptoData");

// Maps a numeric sentiment score to a coarse bull/neutral/bear bucket using
// Alpha Vantage's documented thresholds (>=0.15 bullish, <=-0.15 bearish).
const bucketForScore = (score) => {
  if (score == null) return "neutral";
  if (score >= 0.15) return "bullish";
  if (score <= -0.15) return "bearish";
  return "neutral";
};

const labelForScore = (score) => {
  const b = bucketForScore(score);
  return b === "bullish" ? "Bullish" : b === "bearish" ? "Bearish" : "Neutral";
};

// De-dupes merged AV + GDELT articles by URL (falling back to title), preferring
// the entry that carries a real sentiment score (Alpha Vantage).
const mergeNews = (avNews, gdeltNews) => {
  const byKey = new Map();
  for (const item of [...avNews, ...gdeltNews]) {
    if (!item?.title && !item?.url) continue;
    const key = (item.url || item.title || "").trim().toLowerCase();
    const existing = byKey.get(key);
    if (!existing || (existing.sentimentScore == null && item.sentimentScore != null)) {
      byKey.set(key, item);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => {
    const ta = a.timePublished ? Date.parse(a.timePublished) : 0;
    const tb = b.timePublished ? Date.parse(b.timePublished) : 0;
    return tb - ta;
  });
};

// Derives the sentiment overview block (gauge, distribution, time-trend, top
// tickers) from the merged news list. Falls back to GDELT aggregate tone for the
// gauge when no article carries a per-article score.
const computeSentiment = (news, worldTone) => {
  const scored = news.filter((n) => typeof n.sentimentScore === "number");

  const distribution = { bullish: 0, neutral: 0, bearish: 0 };
  for (const n of news) distribution[bucketForScore(n.sentimentScore)] += 1;

  // Gauge: average per-article score, else normalized GDELT tone (-10..10 -> -1..1).
  let overallScore = null;
  if (scored.length) {
    overallScore =
      scored.reduce((sum, n) => sum + n.sentimentScore, 0) / scored.length;
  } else if (worldTone?.average != null) {
    overallScore = Math.max(-1, Math.min(1, worldTone.average / 10));
  }
  overallScore = overallScore == null ? null : Number(overallScore.toFixed(3));

  // Trend: bucket scored articles by calendar day, average score per day.
  const dayMap = new Map();
  for (const n of scored) {
    if (!n.timePublished) continue;
    const day = n.timePublished.slice(0, 10);
    const entry = dayMap.get(day) || { sum: 0, count: 0 };
    entry.sum += n.sentimentScore;
    entry.count += 1;
    dayMap.set(day, entry);
  }
  const trend = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, { sum, count }]) => ({
      label: new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      }),
      value: Number((sum / count).toFixed(3))
    }));

  // Top tickers by mention count across articles (avg sentiment for color).
  const tickerMap = new Map();
  for (const n of scored) {
    for (const t of n.tickerSentiment || []) {
      if (!t.ticker) continue;
      const entry = tickerMap.get(t.ticker) || { count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += t.score ?? 0;
      tickerMap.set(t.ticker, entry);
    }
  }
  const topTickers = Array.from(tickerMap.entries())
    .map(([ticker, { count, sum }]) => ({
      ticker,
      mentions: count,
      avgScore: Number((sum / count).toFixed(3)),
      label: labelForScore(sum / count)
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 8);

  return {
    overall: {
      score: overallScore,
      label: labelForScore(overallScore),
      bucket: bucketForScore(overallScore)
    },
    distribution,
    trend,
    topTickers,
    worldTone: worldTone || { bins: [], average: null }
  };
};

// Assembles the full dashboard payload from live sources (CoinGecko global +
// markets + BTC series, Alpha Vantage stock + news, GDELT world news + tone).
// Each source self-falls-back, so this resolves even when an upstream is down.
const generateMetrics = async () => {
  const [global, topCoins, btcSeries, bestStock, avNews, gdelt] = await Promise.all([
    fetchGlobalMarket(),
    fetchTopCoins(),
    fetchBtcSeries(),
    fetchBestPerformingStock(),
    fetchWorldNews(),
    fetchGdeltBundle()
  ]);

  const news = mergeNews(avNews, gdelt.news);
  const sentiment = computeSentiment(news, gdelt.tone);

  return {
    cards: global.cards,
    sentiment,
    news,
    topTickers: sentiment.topTickers,
    btcSeries,
    topCoins,
    dominance: global.dominance,
    bestStock,
    dataSources: ["CoinGecko", "Alpha Vantage", "GDELT"],
    updatedAt: new Date().toISOString()
  };
};

module.exports = { generateMetrics };
