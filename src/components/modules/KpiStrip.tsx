import { compactNumber, sentimentColor } from "@/lib/format";
import type { Metrics } from "@/types/metrics";

interface Kpi {
  label: string;
  value: string;
  accent?: string;
}

/** Top KPI strip: sentiment-first summary of the live news/signals feed. */
export function KpiStrip({ metrics }: { metrics: Metrics }) {
  const s = metrics.sentiment;
  const topDriver = s.topTickers[0];
  const highSignals = metrics.signals.filter((sig) => sig.severity === "high").length;

  const cards: Kpi[] = [
    { label: "Market Mood", value: s.overall.label, accent: sentimentColor(s.overall.bucket) },
    { label: "News Tracked", value: compactNumber(metrics.news.length) },
    { label: "Top Driver", value: topDriver ? topDriver.ticker : "—", accent: topDriver ? sentimentColor(topDriver.label) : undefined },
    { label: "Active Signals", value: compactNumber(metrics.signals.length), accent: highSignals ? "var(--accent)" : undefined }
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <article key={c.label} className="panel flex flex-col gap-1 p-4">
          <p className="text-xs tracking-wide text-muted uppercase">{c.label}</p>
          <p className="text-2xl font-bold" style={c.accent ? { color: c.accent } : undefined}>
            {c.value}
          </p>
        </article>
      ))}
    </section>
  );
}
