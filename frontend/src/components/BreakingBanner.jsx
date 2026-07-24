// Full-width red banner for the top high-severity signal. Only renders when a
// real high-severity signal exists — no fabricated "corroborated" counts or ages.
export default function BreakingBanner({ signal, onSelectCountry }) {
  if (!signal) return null;
  const headline = signal.samples?.[0]?.title || signal.label;

  return (
    <button
      type="button"
      onClick={() => signal.subject && onSelectCountry?.(signal.subject)}
      className="flex w-full items-center gap-2.5 bg-accent px-4 py-2 text-left text-white sm:px-7"
    >
      <span className="flex-none border border-white/60 px-1.5 py-0.5 text-[10px] font-extrabold tracking-[.1em]">
        BREAKING
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{headline}</span>
      <span className="hidden flex-none text-[11px] opacity-85 sm:inline">{signal.detail}</span>
    </button>
  );
}
