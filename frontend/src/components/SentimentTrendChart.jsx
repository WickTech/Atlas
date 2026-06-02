import { readTokens } from "../lib/chartTheme";
import LineChart from "./LineChart";

// Average news sentiment over time (per day). Driven by metrics.sentiment.trend.
export default function SentimentTrendChart({ trend = [] }) {
  const t = readTokens();
  const hasData = trend.length > 1;

  return (
    <article className="panel flex flex-col p-4">
      <h3 className="mb-2 text-sm font-semibold">Sentiment Trend</h3>
      <div className="h-52">
        {hasData ? (
          <LineChart
            labels={trend.map((p) => p.label)}
            data={trend.map((p) => p.value)}
            datasetLabel="Avg sentiment"
            color={t.accent}
          />
        ) : (
          <p className="grid h-full place-content-center text-sm text-muted">
            Not enough scored history yet
          </p>
        )}
      </div>
    </article>
  );
}
