import { SEVERITY_CLASS } from "../lib/constants";

const ICON = { category: "📊", hotspot: "📍", convergence: "🔀" };

// Cross-stream signals — converging/abnormal patterns across the news set.
export default function SignalsPanel({ signals = [], onSelectCountry }) {
  if (!signals.length) {
    return (
      <article className="panel p-4">
        <h3 className="mb-2 text-sm font-semibold">Signals</h3>
        <p className="text-sm text-muted">No notable signals right now.</p>
      </article>
    );
  }

  return (
    <article className="panel p-4">
      <h3 className="mb-3 text-sm font-semibold">Signals</h3>
      <ul className="flex flex-col gap-2">
        {signals.map((s, i) => {
          const clickable = s.type === "hotspot" || s.type === "convergence";
          return (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onSelectCountry?.(s.subject)}
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left ${
                  clickable ? "transition hover:bg-surface-2" : "cursor-default"
                }`}
              >
                <span aria-hidden>{ICON[s.type] || "•"}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{s.label}</span>
                    <span className={`chip shrink-0 ${SEVERITY_CLASS[s.severity]}`}>{s.severity}</span>
                  </span>
                  <span className="block truncate text-xs text-muted">{s.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
