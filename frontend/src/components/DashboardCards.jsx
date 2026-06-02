import { compactNumber, compactUsd, sentimentColor } from "../lib/format";
import KpiCard from "./KpiCard";

// Top KPI strip. Sentiment-first: market mood + news volume + top driver lead,
// followed by supporting crypto-market context cards (incl. the previously
// unused "Active Markets" count).
export default function DashboardCards({ metrics }) {
  const c = metrics.cards || {};
  const s = metrics.sentiment || {};
  const btcSpark = metrics.btcSeries?.d7?.prices || [];
  const topDriver = s.topTickers?.[0];

  const cards = [
    {
      label: "Market Mood",
      value: s.overall?.label ?? "Neutral",
      accent: sentimentColor(s.overall?.bucket ?? "neutral")
    },
    { label: "News Tracked", value: compactNumber(metrics.news?.length ?? 0) },
    {
      label: "Top Driver",
      value: topDriver ? topDriver.ticker : "—",
      accent: topDriver ? sentimentColor(topDriver.label) : undefined
    },
    {
      label: "Total Market Cap",
      value: compactUsd(c.marketCap),
      delta: c.marketCapChange24h,
      sparkline: btcSpark
    },
    { label: "24h Volume", value: compactUsd(c.volume24h) },
    {
      label: "BTC Dominance",
      value: c.btcDominance == null ? "N/A" : `${c.btcDominance}%`
    },
    { label: "Active Markets", value: compactNumber(c.markets) }
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </section>
  );
}
