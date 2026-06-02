import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

import { baseChartOptions, readTokens } from "../lib/chartTheme";

export default function BarChart({ labels, data, datasetLabel = "Value", colors, onSelect }) {
  const tokens = readTokens();
  ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

  const palette = colors || [tokens.accent, "#4cc9f0", tokens.bear, "#fca311", "#9b5de5", "#00bbf9"];

  const chartData = {
    labels,
    datasets: [
      {
        label: datasetLabel,
        data,
        backgroundColor: labels?.map((_, i) => palette[i % palette.length]),
        borderRadius: 6,
        maxBarThickness: 48
      }
    ]
  };

  const options = {
    ...baseChartOptions(tokens),
    plugins: { ...baseChartOptions(tokens).plugins, legend: { display: false } },
    onClick: onSelect
      ? (_evt, elements) => {
          if (elements?.length) onSelect(elements[0].index);
        }
      : undefined
  };

  return <Bar data={chartData} options={options} />;
}
