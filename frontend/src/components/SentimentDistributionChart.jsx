import { readTokens } from "../lib/chartTheme";
import PieChart from "./PieChart";

// Doughnut of bullish / neutral / bearish article counts.
export default function SentimentDistributionChart({ distribution }) {
  const t = readTokens();
  const d = distribution || { bullish: 0, neutral: 0, bearish: 0 };
  const total = d.bullish + d.neutral + d.bearish;

  return (
    <article className="panel flex flex-col p-4">
      <h3 className="mb-2 text-sm font-semibold">Sentiment Distribution</h3>
      <div className="relative mx-auto h-52 w-full">
        {total ? (
          <PieChart
            labels={["Bullish", "Neutral", "Bearish"]}
            data={[d.bullish, d.neutral, d.bearish]}
            colors={[t.bull, t.neutral, t.bear]}
            doughnut
          />
        ) : (
          <p className="grid h-full place-content-center text-sm text-muted">No scored articles</p>
        )}
      </div>
    </article>
  );
}
