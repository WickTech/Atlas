import { deltaClass, formatPercent } from "../lib/format";
import Sparkline from "./Sparkline";

// Single KPI tile: label, big value, optional delta % (colored up/down) and an
// optional sparkline trend.
export default function KpiCard({ label, value, delta, sparkline, accent }) {
  return (
    <article className="panel flex flex-col gap-1 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-2xl font-bold" style={accent ? { color: accent } : undefined}>
          {value}
        </h2>
        {delta != null && (
          <span className={`text-sm font-semibold ${deltaClass(delta)}`}>
            {formatPercent(delta)}
          </span>
        )}
      </div>
      {sparkline?.length ? <Sparkline data={sparkline} color="auto" height={32} /> : null}
    </article>
  );
}
