import { sentimentColor } from "../lib/format";

// Headline market-mood gauge. Maps an overall sentiment score in [-1, 1] to a
// semicircular needle with a bull/neutral/bear label.
export default function SentimentGauge({ overall }) {
  const score = overall?.score ?? 0;
  const label = overall?.label ?? "Neutral";
  const color = sentimentColor(overall?.bucket ?? label);

  // Map score [-1,1] -> angle [-90deg, 90deg].
  const clamped = Math.max(-1, Math.min(1, score));
  const angle = clamped * 90;

  return (
    <div className="panel flex flex-col items-center justify-center p-5">
      <p className="mb-1 self-start text-xs uppercase tracking-wide text-muted">Market Mood</p>
      <div className="relative h-24 w-48 overflow-hidden">
        <div
          className="absolute inset-0 rounded-t-full"
          style={{
            background:
              "conic-gradient(from 270deg at 50% 100%, var(--bear) 0deg, var(--neutral) 90deg, var(--bull) 180deg)"
          }}
        />
        <div className="absolute inset-x-6 bottom-0 top-6 rounded-t-full bg-surface" />
        {/* needle */}
        <div
          className="absolute bottom-0 left-1/2 h-20 w-0.5 origin-bottom rounded-full transition-transform duration-500"
          style={{ background: color, transform: `translateX(-50%) rotate(${angle}deg)` }}
        />
        <div
          className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full"
          style={{ background: color }}
        />
      </div>
      <p className="mt-2 text-2xl font-bold" style={{ color }}>
        {label}
      </p>
      <p className="text-sm text-muted">
        Score {score == null ? "N/A" : score.toFixed(2)}
      </p>
    </div>
  );
}
