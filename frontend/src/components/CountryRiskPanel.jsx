import { INDIA } from "../lib/constants";

// Ranked Country Intelligence Index. India is pinned at the top for the Indian
// audience even if it isn't the highest-scoring; clicking a row filters the feed.
function RiskBar({ score, max }) {
  const pct = max ? Math.round((score / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: "var(--bear)" }}
      />
    </div>
  );
}

export default function CountryRiskPanel({ countryIndex, selectedCountry, onSelectCountry }) {
  const all = countryIndex?.countries || [];
  const max = countryIndex?.max || 1;

  const india = countryIndex?.india;
  const rest = all.filter((c) => c.name !== INDIA).slice(0, 8);
  const rows = india ? [india, ...rest] : rest;

  return (
    <article className="panel flex flex-col p-4">
      <h3 className="mb-3 text-sm font-semibold">Country Risk Index</h3>
      {rows.length ? (
        <ul className="flex flex-col gap-2.5">
          {rows.map((c) => {
            const isSel = selectedCountry === c.name;
            const pinned = c.name === INDIA;
            return (
              <li key={c.name}>
                <button
                  type="button"
                  onClick={() => onSelectCountry?.(isSel ? null : c.name)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-2 ${
                    isSel ? "bg-surface-2 ring-1 ring-accent" : ""
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">
                      {pinned && <span className="mr-1">🇮🇳</span>}
                      {c.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {c.score}
                      <span className="ml-1 text-xs">· {c.count}</span>
                    </span>
                  </div>
                  <RiskBar score={c.score} max={max} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted">Waiting for country data…</p>
      )}
    </article>
  );
}
