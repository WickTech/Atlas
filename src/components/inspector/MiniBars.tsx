/**
 * Minimal bar chart for small counts over time. Accessible: the SVG carries a
 * text summary, and every bar has a <title> with its exact value.
 */
export function MiniBars({ values, label, unit, startLabel, endLabel = "now" }: { values: number[]; label: string; unit: string; startLabel: string; endLabel?: string }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const w = 100 / values.length;
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="flex items-baseline justify-between text-[10px] text-muted">
        <span className="eyebrow">{label}</span>
        <span className="telemetry">
          {total} {unit}
        </span>
      </figcaption>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-full" role="img" aria-label={`${label}: ${values.join(", ")} ${unit} per interval, ${startLabel} to ${endLabel}`}>
        {values.map((v, i) => {
          const h = v ? Math.max(2, (v / max) * 30) : 0.75;
          return (
            <rect key={i} x={i * w + w * 0.12} y={32 - h} width={w * 0.76} height={h} fill={v ? "var(--muted)" : "var(--border)"} opacity={v ? 0.85 : 1}>
              <title>{`${v} ${unit}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="telemetry flex justify-between text-[9.5px] text-muted">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </figure>
  );
}
