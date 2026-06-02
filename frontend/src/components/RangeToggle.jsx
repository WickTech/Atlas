const RANGES = [
  { key: "d1", label: "24h" },
  { key: "d7", label: "7d" },
  { key: "d30", label: "30d" }
];

// Segmented 24h / 7d / 30d control. `options` lets callers limit the set.
export default function RangeToggle({ value, onChange, options = RANGES }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            value === r.key ? "bg-accent text-[#04130d]" : "text-muted hover:text-fg"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
