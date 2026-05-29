import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function LineChart({ labels, data, datasetLabel = "Value" }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: datasetLabel,
        data,
        borderColor: "#00ff9c",
        backgroundColor: "#00ff9c33",
        fill: true,
        tension: 0.35
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#ecf0f1" } }
    },
    scales: {
      x: { ticks: { color: "#95a5a6" }, grid: { color: "#1f2d3a" } },
      y: { ticks: { color: "#95a5a6" }, grid: { color: "#1f2d3a" } }
    }
  };

  return <Line data={chartData} options={options} />;
}
