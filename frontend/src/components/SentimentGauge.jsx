import { sentimentColor } from "../lib/format";

// Headline market-mood meter. Maps an overall sentiment score in [-1, 1] to a
// flat bar meter (Modernist has no dial/gauge motif) with a marker + label.
export default function SentimentGauge({ overall }) {
  const score = overall?.score ?? 0;
  const label = overall?.label ?? "Neutral";
  const color = sentimentColor(overall?.bucket ?? label);

  const clamped = Math.max(-1, Math.min(1, score));
  const pct = ((clamped + 1) / 2) * 100;

  return (
    <div className="panel flex flex-col justify-center p-5">
      <p className="mb-3 text-xs uppercase tracking-wide text-muted">Market Mood</p>

      <div className="relative mb-3 h-1.5 w-full" style={{ background: "var(--neutral)", opacity: 0.3 }}>
        <div className="absolute inset-y-0 left-0 h-full" style={{ width: `${pct}%`, background: color }} />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 border-2 border-bg"
          style={{ left: `calc(${pct}% - 6px)`, background: color }}
        />
      </div>

      <p className="text-2xl font-bold" style={{ color }}>
        {label}
      </p>
      <p className="text-sm text-muted">Score {score == null ? "N/A" : score.toFixed(2)}</p>
    </div>
  );
}
