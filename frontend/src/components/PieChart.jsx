import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart({ labels, data, datasetLabel = "Value" }) {
  return (
    <Pie
      data={{
        labels,
        datasets: [
          {
            label: datasetLabel,
            data,
            backgroundColor: ["#00ff9c", "#4361ee", "#f72585"]
          }
        ]
      }}
    />
  );
}
