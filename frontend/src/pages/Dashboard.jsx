import { useState } from "react";

import AssetDetailDrawer from "../components/AssetDetailDrawer";
import DashboardCards from "../components/DashboardCards";
import MarketContext from "../components/MarketContext";
import NewsFeed from "../components/NewsFeed";
import SentimentDistributionChart from "../components/SentimentDistributionChart";
import SentimentGauge from "../components/SentimentGauge";
import SentimentTrendChart from "../components/SentimentTrendChart";
import TopBar from "../components/TopBar";
import TopTickersChart from "../components/TopTickersChart";
import { useMetrics } from "../hooks/useMetrics";
import { useTheme } from "../hooks/useTheme";

export default function Dashboard() {
  const { metrics, status, error } = useMetrics();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [selectedTicker, setSelectedTicker] = useState(null);

  const header = (
    <TopBar
      status={status}
      updatedAt={metrics?.updatedAt}
      search={search}
      onSearch={setSearch}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );

  if (error && !metrics) {
    return (
      <>
        {header}
        <div className="grid min-h-[60vh] place-content-center px-4 text-center text-muted">
          {error}
        </div>
      </>
    );
  }

  if (!metrics) {
    return (
      <>
        {header}
        <div className="grid min-h-[60vh] place-content-center text-muted">Loading dashboard…</div>
      </>
    );
  }

  return (
    <>
      {header}
      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5">
        <DashboardCards metrics={metrics} />

        {/* Sentiment overview: gauge + analytics charts */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <SentimentGauge overall={metrics.sentiment?.overall} />
          <div className="lg:col-span-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SentimentDistributionChart distribution={metrics.sentiment?.distribution} />
            <SentimentTrendChart trend={metrics.sentiment?.trend} />
            <TopTickersChart
              topTickers={metrics.sentiment?.topTickers}
              onSelectTicker={setSelectedTicker}
            />
          </div>
        </section>

        {/* Centerpiece: world news + sentiment feed */}
        <NewsFeed news={metrics.news} search={search} onSelectTicker={setSelectedTicker} />

        {/* Supporting market data */}
        <MarketContext metrics={metrics} onSelectTicker={setSelectedTicker} />

        <footer className="pb-6 text-center text-xs text-muted">
          Sources: {(metrics.dataSources || []).join(" · ")}
        </footer>
      </main>

      <AssetDetailDrawer
        ticker={selectedTicker}
        metrics={metrics}
        onClose={() => setSelectedTicker(null)}
      />
    </>
  );
}
