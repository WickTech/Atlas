// Sentiment overview block (gauge, distribution, time-trend, top tickers)
// derived from the merged news list. Alpha Vantage thresholds: >=0.15 bullish,
// <=-0.15 bearish.
import type { Article, Sentiment, SentimentBucket, SentimentLabel, WorldTone } from "@/types/metrics";

export const bucketForScore = (score: number | null | undefined): SentimentBucket => {
  if (score == null) return "neutral";
  if (score >= 0.15) return "bullish";
  if (score <= -0.15) return "bearish";
  return "neutral";
};

const LABELS: Record<SentimentBucket, SentimentLabel> = { bullish: "Bullish", neutral: "Neutral", bearish: "Bearish" };
export const labelForScore = (score: number | null | undefined): SentimentLabel => LABELS[bucketForScore(score)];

// Falls back to GDELT aggregate tone for the gauge when no article carries a
// per-article score.
export const computeSentiment = (news: Article[], worldTone: WorldTone | null): Sentiment => {
  const scored = news.filter((n): n is Article & { sentimentScore: number } => typeof n.sentimentScore === "number");

  const distribution: Record<SentimentBucket, number> = { bullish: 0, neutral: 0, bearish: 0 };
  for (const n of news) distribution[bucketForScore(n.sentimentScore)] += 1;

  // Gauge: average per-article score, else normalized GDELT tone (-10..10 -> -1..1).
  let overallScore: number | null = null;
  if (scored.length) {
    overallScore = scored.reduce((sum, n) => sum + n.sentimentScore, 0) / scored.length;
  } else if (worldTone?.average != null) {
    overallScore = Math.max(-1, Math.min(1, worldTone.average / 10));
  }
  overallScore = overallScore == null ? null : Number(overallScore.toFixed(3));

  // Trend: bucket scored articles by calendar day, average score per day.
  const dayMap = new Map<string, { sum: number; count: number }>();
  for (const n of scored) {
    if (!n.timePublished) continue;
    const day = n.timePublished.slice(0, 10);
    const entry = dayMap.get(day) ?? { sum: 0, count: 0 };
    entry.sum += n.sentimentScore;
    entry.count += 1;
    dayMap.set(day, entry);
  }
  const trend = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, { sum, count }]) => ({
      label: new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      value: Number((sum / count).toFixed(3))
    }));

  // Top tickers by mention count across articles (avg sentiment for color).
  const tickerMap = new Map<string, { count: number; sum: number }>();
  for (const n of scored) {
    for (const t of n.tickerSentiment) {
      if (!t.ticker) continue;
      const entry = tickerMap.get(t.ticker) ?? { count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += t.score ?? 0;
      tickerMap.set(t.ticker, entry);
    }
  }
  const topTickers = [...tickerMap.entries()]
    .map(([ticker, { count, sum }]) => ({
      ticker,
      mentions: count,
      avgScore: Number((sum / count).toFixed(3)),
      label: labelForScore(sum / count)
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 8);

  return {
    overall: { score: overallScore, label: labelForScore(overallScore), bucket: bucketForScore(overallScore) },
    distribution,
    trend,
    topTickers,
    worldTone: worldTone ?? { bins: [], average: null }
  };
};
