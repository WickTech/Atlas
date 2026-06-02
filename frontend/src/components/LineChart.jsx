import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

import { baseChartOptions, readTokens } from "../lib/chartTheme";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Filler, Tooltip, Legend);

export default function LineChart({ labels, data, datasetLabel = "Value", color }) {
  const tokens = readTokens();
  const line = color || tokens.accent;

  const chartData = {
    labels,
    datasets: [
      {
        label: datasetLabel,
        data,
        borderColor: line,
        backgroundColor: `${line}22`,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.35
      }
    ]
  };

  return <Line data={chartData} options={baseChartOptions(tokens)} />;
}
