import {
  Chart as ChartJS,
  LineElement,
  LinearScale,
  CategoryScale,
  PointElement,
  Filler
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, LinearScale, CategoryScale, PointElement, Filler);

// Minimal, axis-less trend line for KPI cards and asset detail.
export default function Sparkline({ data = [], color = "var(--accent)", height = 40 }) {
  if (!data.length) return <div style={{ height }} />;

  // Color trend by direction: up = bull, down = bear, flat = accent.
  const trendColor =
    data[data.length - 1] >= data[0] ? "var(--bull)" : "var(--bear)";
  const stroke = color === "auto" ? trendColor : color;

  return (
    <div style={{ height }}>
      <Line
        data={{
          labels: data.map((_, i) => i),
          datasets: [
            {
              data,
              borderColor: stroke,
              backgroundColor: "transparent",
              borderWidth: 1.5,
              pointRadius: 0,
              tension: 0.4
            }
          ]
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          elements: { line: { borderJoinStyle: "round" } }
        }}
      />
    </div>
  );
}
