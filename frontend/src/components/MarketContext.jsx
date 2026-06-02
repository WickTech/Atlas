import { useState } from "react";

import BarChart from "./BarChart";
import LineChart from "./LineChart";
import MarketHighlights from "./MarketHighlights";
import PieChart from "./PieChart";
import RangeToggle from "./RangeToggle";

// Collapsible "supporting" crypto-market section: BTC price (range toggle), top
// coins by market cap (clickable -> drill-down), dominance, and best stock.
export default function MarketContext({ metrics, onSelectTicker }) {
  const [open, setOpen] = useState(true);
  const [range, setRange] = useState("d7");

  const series = metrics.btcSeries?.[range] || { labels: [], prices: [] };
  const coins = metrics.topCoins?.coins || [];

  return (
    <section className="panel p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <h2 className="text-lg font-semibold">Market Context</h2>
        <span className="text-sm text-muted">{open ? "Hide ▲" : "Show ▼"}</span>
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <article className="panel p-4 xl:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Bitcoin Price (USD)</h3>
              <RangeToggle value={range} onChange={setRange} />
            </div>
            <div className="h-56">
              <LineChart labels={series.labels} data={series.prices} datasetLabel="BTC (USD)" />
            </div>
          </article>

          <article className="panel p-4">
            <h3 className="mb-2 text-sm font-semibold">Top Coins (B USD)</h3>
            <div className="h-56">
              <BarChart
                labels={metrics.topCoins?.labels}
                data={metrics.topCoins?.marketCaps}
                datasetLabel="Market Cap (B USD)"
                onSelect={(i) => coins[i] && onSelectTicker?.(coins[i].symbol)}
              />
            </div>
          </article>

          <article className="panel p-4">
            <h3 className="mb-2 text-sm font-semibold">Market Dominance</h3>
            <div className="h-56">
              <PieChart
                labels={metrics.dominance?.labels}
                data={metrics.dominance?.values}
                datasetLabel="Dominance %"
                doughnut
              />
            </div>
          </article>

          <MarketHighlights bestStock={metrics.bestStock} />
        </div>
      )}
    </section>
  );
}
