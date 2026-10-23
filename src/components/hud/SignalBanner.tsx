import type { Signal } from "@/types/metrics";

// Full-width strip for the top high-severity signal. Labelled "TOP SIGNAL", not
// "BREAKING": signals are volume/convergence patterns, so the strip leads with
// what fired (e.g. "India hotspot · risk 83/100") and shows the latest related
// headline as context, rather than presenting an arbitrary story as breaking.
export function SignalBanner({ signal, onSelectCountry }: { signal: Signal | null; onSelectCountry: (name: string) => void }) {
  if (!signal) return null;
  const clickable = signal.type === "hotspot" || signal.type === "convergence";
  const headline = signal.samples[0]?.title;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onSelectCountry(signal.subject)}
      className="flex h-8 w-full shrink-0 items-center gap-2.5 border-b border-border bg-sev-5-soft px-3 py-1.5 text-left text-fg enabled:hover:bg-sev-5/15 sm:px-4"
      title={clickable ? `Focus ${signal.subject} on the map` : undefined}
    >
      <span className="telemetry flex-none bg-sev-5 px-1.5 py-px text-[10px] font-semibold tracking-[.1em] text-on-sev">TOP SIGNAL</span>
      <span className="flex-none text-[12.5px] font-extrabold">{signal.label}</span>
      <span className="hidden flex-none text-[11px] text-muted sm:inline">· {signal.detail}</span>
      {headline && <span className="min-w-0 flex-1 truncate text-[12px] text-muted">— latest: {headline}</span>}
    </button>
  );
}
