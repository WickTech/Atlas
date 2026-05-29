import { useEffect, useState } from "react";

import { fetchMetrics, subscribeToMetrics } from "../api/api";
import BarChart from "../components/BarChart";
import DashboardCards from "../components/DashboardCards";
import LineChart from "../components/LineChart";
import MarketHighlights from "../components/MarketHighlights";
import PieChart from "../components/PieChart";
import WorldNewsCorner from "../components/WorldNewsCorner";

const STATUS_LABELS = {
  live: "Live",
  reconnecting: "Reconnecting…",
  polling: "Polling"
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    let isMounted = true;
    let pollTimer = null;

    const applyData = (data) => {
      if (!isMounted) return;
      setMetrics(data);
      setError("");
    };

    // Fallback: poll the REST snapshot if the browser/proxy can't hold an SSE
    // connection. Started lazily so we don't double-fetch when the stream works.
    const startPolling = async () => {
      if (pollTimer) return;
      setStatus("polling");
      const poll = async () => {
        try {
          applyData(await fetchMetrics());
        } catch (_requestError) {
          if (isMounted) setError("Unable to load metrics. Start backend on port 5000.");
        }
      };
      await poll();
      pollTimer = setInterval(poll, 60000);
    };

    if (typeof EventSource === "undefined") {
      startPolling();
      return () => {
        isMounted = false;
        if (pollTimer) clearInterval(pollTimer);
      };
    }

    const unsubscribe = subscribeToMetrics({
      onData: applyData,
      onStatus: (next) => isMounted && setStatus(next)
    });

    // If the stream never delivers an initial frame, fall back to polling.
    const grace = setTimeout(() => {
      if (isMounted && !metrics) startPolling();
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(grace);
      if (pollTimer) clearInterval(pollTimer);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div className="state-message">{error}</div>;
  if (!metrics) return <div className="state-message">Loading dashboard...</div>;

  const statusKey = STATUS_LABELS[status] ? status : "live";

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>World Monitor Analytics Dashboard</h1>
        <span className={`live-status live-status--${statusKey}`}>
          <span className="live-dot" />
          {STATUS_LABELS[statusKey]}
        </span>
      </header>
      <DashboardCards metrics={metrics} />
      <section className="charts-grid">
        <article className="chart-panel">
          <h3>Bitcoin · 7-Day Price (USD)</h3>
          <LineChart
            labels={metrics.btcSeries?.labels}
            data={metrics.btcSeries?.prices}
            datasetLabel="BTC Price (USD)"
          />
        </article>
        <article className="chart-panel">
          <h3>Top Coins by Market Cap (B USD)</h3>
          <BarChart
            labels={metrics.topCoins?.labels}
            data={metrics.topCoins?.marketCaps}
            datasetLabel="Market Cap (B USD)"
          />
        </article>
        <article className="chart-panel">
          <h3>Market Dominance</h3>
          <PieChart
            labels={metrics.dominance?.labels}
            data={metrics.dominance?.values}
            datasetLabel="Dominance %"
          />
        </article>
        <MarketHighlights bestStock={metrics.bestStock} updatedAt={metrics.updatedAt} />
      </section>
      <WorldNewsCorner newsItems={metrics.worldNews} />
    </main>
  );
}
