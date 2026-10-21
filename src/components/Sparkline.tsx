// Axis-less SVG trend line (replaces the chart.js canvas: zero runtime deps,
// crisp at any DPR, themeable via CSS variables).
export function Sparkline({ data, height = 40, color = "auto" }: { data: number[]; height?: number; color?: string }) {
  if (data.length < 2) return <div style={{ height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(2)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(2)}`);
  const last = data[data.length - 1] ?? 0;
  const first = data[0] ?? 0;
  const stroke = color === "auto" ? (last >= first ? "var(--bull)" : "var(--bear)") : color;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true">
      <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
