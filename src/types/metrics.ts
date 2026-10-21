// Wire contract for GET /api/metrics. Shared by the server pipeline
// (src/server) and every client module, so a field rename breaks the build
// instead of silently blanking a panel.

export type SentimentBucket = "bullish" | "neutral" | "bearish";
export type SentimentLabel = "Bullish" | "Neutral" | "Bearish";
export type Severity = "high" | "medium" | "low";
export type Provider = "Alpha Vantage" | "GDELT" | "RSS" | "Fallback";

export interface TickerSentiment {
  ticker: string;
  score: number | null;
  label: string;
  relevance: number | null;
}

export interface Article {
  title: string;
  url: string;
  source: string | null;
  sourceDomain: string | null;
  timePublished: string | null;
  summary: string;
  bannerImage: string | null;
  sentimentScore: number | null;
  sentimentLabel: string;
  topics: string[];
  tickerSentiment: TickerSentiment[];
  provider: Provider;
  country?: string | null;
  language?: string | null;
  indiaRelated?: boolean;
}

/** Article after metrics enrichment: always classified + country-normalized. */
export interface EnrichedArticle extends Article {
  indiaRelated: boolean;
  category: string;
  countryNorm: string | null;
}

export interface Category {
  key: string;
  label: string;
}

export interface CategoryCount extends Category {
  count: number;
}

export interface ToneBin {
  tone: number | null;
  count: number | null;
}

export interface WorldTone {
  bins: ToneBin[];
  average: number | null;
}

export interface TopTicker {
  ticker: string;
  mentions: number;
  avgScore: number;
  label: SentimentLabel;
}

export interface Sentiment {
  overall: { score: number | null; label: SentimentLabel; bucket: SentimentBucket };
  distribution: Record<SentimentBucket, number>;
  trend: { label: string; value: number }[];
  topTickers: TopTicker[];
  worldTone: WorldTone;
}

export interface SampleStory {
  title: string;
  url: string;
}

export interface CountryRisk {
  name: string;
  count: number;
  avgScore: number | null;
  negShare: number | null;
  score: number;
  sample: SampleStory | null;
}

export interface CountryIndex {
  countries: CountryRisk[];
  max: number;
  india: CountryRisk | null;
}

export interface Signal {
  type: "category" | "hotspot" | "convergence";
  subject: string;
  label: string;
  detail: string;
  severity: Severity;
  count: number;
  samples: SampleStory[];
}

export interface Briefs {
  source: "groq" | "openrouter" | "rule-based";
  model?: string;
  india: string;
  global: string;
  categories: { key?: string; label: string; text: string }[];
  generatedAt: string;
}

export type InstrumentKind = "index" | "forex" | "stock" | "commodity";

export interface Instrument {
  symbol: string;
  name: string;
  currency: "INR" | "USD" | "JPY";
  region: "india" | "global";
  kind: InstrumentKind;
  price: number | null;
  changePercent: number | null;
  sparkline: number[];
  source: "Yahoo Finance" | "Fallback";
}

export interface Finance {
  instruments: Instrument[];
  composite: { label: "Risk-on" | "Risk-off" | "Mixed" | "Unknown"; value: number | null };
  updatedAt: string;
}

export interface BestStock {
  symbol: string;
  name: string;
  changePercent: number | null;
  price: number | null;
  volume: number | null;
  source: "Alpha Vantage" | "Fallback";
}

export interface Metrics {
  sentiment: Sentiment;
  news: EnrichedArticle[];
  topTickers: TopTicker[];
  bestStock: BestStock;
  countryIndex: CountryIndex;
  signals: Signal[];
  categories: CategoryCount[];
  briefs: Briefs;
  finance: Finance;
  dataSources: string[];
  updatedAt: string;
  /** Set when upstream news was empty and the last good feed was retained. */
  newsStale?: boolean;
}
