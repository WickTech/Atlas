import { readTokens } from "../lib/chartTheme";
import { sentimentColor } from "../lib/format";
import BarChart from "./BarChart";

// Most-mentioned tickers across news, bar-colored by average sentiment. Clicking
// a bar opens the asset drill-down.
export default function TopTickersChart({ topTickers = [], onSelectTicker }) {
  readTokens();
  const hasData = topTickers.length > 0;

  return (
    <article className="panel flex flex-col p-4">
      <h3 className="mb-2 text-sm font-semibold">Top Mentioned Tickers</h3>
      <div className="h-52">
        {hasData ? (
          <BarChart
            labels={topTickers.map((t) => t.ticker)}
            data={topTickers.map((t) => t.mentions)}
            datasetLabel="Mentions"
            colors={topTickers.map((t) => sentimentColor(t.label))}
            onSelect={(i) => onSelectTicker?.(topTickers[i].ticker)}
          />
        ) : (
          <p className="grid h-full place-content-center text-sm text-muted">
            No ticker mentions yet
          </p>
        )}
      </div>
    </article>
  );
}
