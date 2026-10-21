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
    <section className="grid grid-cols-2 gap-px border-b border-border bg-border">
      {cards.map((c) => (
        <article key={c.label} className="flex flex-col gap-0.5 bg-surface px-4 py-3">
          <p className="text-[10px] tracking-wider text-muted uppercase">{c.label}</p>
          <p className="text-xl font-bold" style={c.accent ? { color: c.accent } : undefined}>
            {c.value}
          </p>
        </article>
      ))}
    </section>
  );
}
