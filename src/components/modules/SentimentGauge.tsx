import { sentimentColor } from "@/lib/format";
import type { Sentiment } from "@/types/metrics";

// Headline market-mood meter: maps a score in [-1, 1] to a flat bar meter
// (Modernist has no dial motif) with a marker + label.
export function SentimentGauge({ overall }: { overall: Sentiment["overall"] }) {
  const score = overall.score;
  const color = sentimentColor(overall.bucket);
  const pct = ((Math.max(-1, Math.min(1, score ?? 0)) + 1) / 2) * 100;

  return (
    <div className="panel flex flex-col justify-center p-5">
      <p className="mb-3 text-xs tracking-wide text-muted uppercase">Market Mood</p>
      <div
        className="relative mb-3 h-1.5 w-full bg-neutral/30"
        role="meter"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={score ?? 0}
        aria-label="Market mood"
      >
        <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: color }} />
        <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 border-2 border-bg" style={{ left: `calc(${pct}% - 6px)`, background: color }} />
      </div>
      <p className="text-2xl font-bold" style={{ color }}>
        {overall.label}
      </p>
      <p className="telemetry text-sm text-muted">Score {score == null ? "N/A" : score.toFixed(2)}</p>
    </div>
  );
}
