import { compactNumber, sentimentColor } from "../lib/format";
import KpiCard from "./KpiCard";

// Top KPI strip: sentiment-first summary of the live news/signals feed.
export default function DashboardCards({ metrics }) {
  const s = metrics.sentiment || {};
  const topDriver = s.topTickers?.[0];
  const highSignals = (metrics.signals || []).filter((sig) => sig.severity === "high").length;

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
    { label: "Active Signals", value: compactNumber((metrics.signals || []).length), delta: null, accent: highSignals ? "var(--accent)" : undefined }
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </section>
  );
}
