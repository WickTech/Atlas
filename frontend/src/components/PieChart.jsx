import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut, Pie } from "react-chartjs-2";

import { readTokens } from "../lib/chartTheme";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart({ labels, data, datasetLabel = "Value", colors, doughnut = false }) {
  const tokens = readTokens();
  const palette = colors || [tokens.accent, "#4361ee", tokens.bear, "#fca311"];
  const Chart = doughnut ? Doughnut : Pie;

  return (
    <Chart
      data={{
        labels,
        datasets: [
          {
            label: datasetLabel,
            data,
            backgroundColor: palette,
            borderColor: tokens.border,
            borderWidth: 2
          }
        ]
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: doughnut ? "62%" : 0,
        plugins: {
          legend: { position: "bottom", labels: { color: tokens.fg, boxWidth: 12, padding: 12 } },
          tooltip: {
            backgroundColor: tokens.border,
            titleColor: tokens.fg,
            bodyColor: tokens.fg
          }
        }
      }}
    />
  );
}
