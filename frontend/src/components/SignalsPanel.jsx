import { sevColor } from "../lib/format";

// Cross-stream signals — converging/abnormal patterns across the news set.
export default function SignalsPanel({ signals = [], onSelectCountry }) {
  return (
    <div className="border-b border-border px-5 py-[18px]">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[.12em] text-accent-400">Top signals</div>
      {signals.length ? (
        <div className="flex flex-col gap-3">
          {signals.map((s, i) => {
            const clickable = s.type === "hotspot" || s.type === "convergence";
            const headline = s.samples?.[0]?.title || s.label;
            const url = s.samples?.[0]?.url;
            return (
              <div key={`${s.label}-${i}`} className="flex gap-2">
                <span
                  className="mt-1.5 h-[7px] w-[7px] flex-none rounded-full"
                  style={{ background: sevColor(s.severity) }}
                />
                <span className="min-w-0 flex-1 text-[12.5px] leading-snug">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block font-semibold text-fg hover:text-accent-400"
                    >
                      {headline}
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => clickable && onSelectCountry?.(s.subject)}
                      className={`block text-left font-semibold text-fg ${clickable ? "hover:text-accent-400" : "cursor-default"}`}
                    >
                      {headline}
                    </button>
                  )}
                  <span className="text-[10.5px] text-muted">{s.detail}</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">No notable signals right now.</p>
      )}
    </div>
  );
}
