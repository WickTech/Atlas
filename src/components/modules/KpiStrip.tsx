import { compactNumber, moodLabel, sentimentColor } from "@/lib/format";
import type { Metrics } from "@/types/metrics";

interface Kpi {
  label: string;
  value: string;
  accent?: string;
  /** Small muted line under the value. Plain text, so meaning never depends on colour. */
  note?: string;
}

// How the mood number was produced, so the tile never implies more than it is.
const MOOD_NOTE: Record<Metrics["sentiment"]["method"], string | undefined> = {
  "alpha-vantage": "Alpha Vantage news sentiment",
  "headline-wording": "from headline wording",
  "gdelt-tone": "GDELT news tone",
  none: undefined
};

/** Top KPI strip: sentiment-first summary of the live news/signals feed. */
export function KpiStrip({ metrics }: { metrics: Metrics }) {
  const s = metrics.sentiment;
  const topDriver = s.topTickers[0];
  // Without per-ticker sentiment (a premium Alpha Vantage feature) the most-covered topic is the honest "driver".
  const topTopic = [...metrics.categories].filter((c) => c.key !== "general").sort((a, b) => b.count - a.count)[0];
  const highSignals = metrics.signals.filter((sig) => sig.severity === "high").length;

  const cards: Kpi[] = [
    { label: moodLabel(s.method), value: s.overall.label, accent: sentimentColor(s.overall.bucket), note: MOOD_NOTE[s.method] },
    { label: "News Tracked", value: compactNumber(metrics.news.length) },
    topDriver
      ? { label: "Top Driver", value: topDriver.ticker, accent: sentimentColor(topDriver.label) }
      : topTopic
        ? { label: "Top Topic", value: topTopic.label, note: `${topTopic.count} stories` }
        : { label: "Top Driver", value: "—" },
    { label: "Active Signals", value: compactNumber(metrics.signals.length), note: highSignals ? `${highSignals} high severity` : undefined }
  ];

  return (
    <section className="grid grid-cols-2 gap-px border-b border-border bg-border">
      {cards.map((c) => (
        <article key={c.label} className="flex flex-col gap-0.5 bg-surface px-4 py-3">
          <p className="text-[10px] tracking-wider text-muted uppercase">{c.label}</p>
          <p className="text-xl font-bold" style={c.accent ? { color: c.accent } : undefined}>
            {c.value}
          </p>
          {c.note && <p className="text-[11px] text-muted">{c.note}</p>}
        </article>
      ))}
    </section>
  );
}
