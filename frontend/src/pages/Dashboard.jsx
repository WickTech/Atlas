import { lazy, Suspense, useMemo, useState } from "react";

import AiBriefs from "../components/AiBriefs";
import AssetDetailDrawer from "../components/AssetDetailDrawer";
import CommandPalette from "../components/CommandPalette";
import CountryRiskPanel from "../components/CountryRiskPanel";
import DashboardCards from "../components/DashboardCards";
import FinanceRadar from "../components/FinanceRadar";
import MarketContext from "../components/MarketContext";
import NewsFeed from "../components/NewsFeed";
import SentimentGauge from "../components/SentimentGauge";
import SignalsPanel from "../components/SignalsPanel";
import TopBar from "../components/TopBar";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { useMetrics } from "../hooks/useMetrics";
import { useTheme } from "../hooks/useTheme";

// Map pulls in topojson + react-simple-maps; load it lazily to keep first paint fast.
const WorldNewsMap = lazy(() => import("../components/WorldNewsMap"));

export default function Dashboard() {
  const { metrics, status, error } = useMetrics();
  const { theme, toggleTheme } = useTheme();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("india"); // India-first for the Indian audience
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [category, setCategory] = useState("all");
  const [selectedTicker, setSelectedTicker] = useState(null);

  // Build command-palette actions from the live data.
  const commands = useMemo(() => {
    const cmds = [
      { id: "scope-india", group: "Scope", label: "Show India news", run: () => setScope("india") },
      { id: "scope-world", group: "Scope", label: "Show World news", run: () => setScope("world") },
      { id: "theme", group: "View", label: "Toggle light/dark theme", run: toggleTheme },
      { id: "cat-all", group: "Category", label: "All categories", run: () => setCategory("all") }
    ];
    for (const c of metrics?.categories || []) {
      cmds.push({ id: `cat-${c.key}`, group: "Category", label: c.label, hint: `${c.count}`, run: () => setCategory(c.key) });
    }
    for (const c of (metrics?.countryIndex?.countries || []).slice(0, 12)) {
      cmds.push({ id: `country-${c.name}`, group: "Country", label: c.name, hint: `risk ${c.score}`, run: () => setSelectedCountry(c.name) });
    }
    for (const t of metrics?.sentiment?.topTickers || []) {
      cmds.push({ id: `ticker-${t.ticker}`, group: "Ticker", label: t.ticker, hint: `${t.mentions} mentions`, run: () => setSelectedTicker(t.ticker) });
    }
    for (const i of metrics?.finance?.instruments || []) {
      cmds.push({ id: `fin-${i.symbol}`, group: "Market", label: i.name, run: () => setSelectedTicker(i.symbol) });
    }
    return cmds;
  }, [metrics, toggleTheme]);

  const header = (
    <TopBar
      status={status}
      updatedAt={metrics?.updatedAt}
      search={search}
      onSearch={setSearch}
      theme={theme}
      onToggleTheme={toggleTheme}
      scope={scope}
      onScopeChange={setScope}
      onOpenPalette={() => setPaletteOpen(true)}
    />
  );

  if (error && !metrics) {
    return (
      <>
        {header}
        <div className="grid min-h-[60vh] place-content-center px-4 text-center text-muted">{error}</div>
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

        {/* Situational awareness: map + country risk + signals */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Suspense
              fallback={<div className="panel grid h-[480px] place-content-center text-muted">Loading map…</div>}
            >
              <WorldNewsMap
                countryIndex={metrics.countryIndex}
                selectedCountry={selectedCountry}
                onSelectCountry={setSelectedCountry}
              />
            </Suspense>
          </div>
          <div className="flex flex-col gap-4">
            <CountryRiskPanel
              countryIndex={metrics.countryIndex}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
            />
            <SignalsPanel signals={metrics.signals} onSelectCountry={setSelectedCountry} />
          </div>
        </section>

        {/* AI briefs */}
        <AiBriefs briefs={metrics.briefs} />

        {/* Sentiment overview */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <SentimentGauge overall={metrics.sentiment?.overall} />
          <div className="lg:col-span-3 grid grid-cols-1 gap-4">
            <FinanceRadar finance={metrics.finance} onSelectInstrument={(i) => setSelectedTicker(i.symbol)} />
          </div>
        </section>

        {/* Centerpiece: news feed with scope + categories + country filter */}
        <NewsFeed
          news={metrics.news}
          search={search}
          scope={scope}
          selectedCountry={selectedCountry}
          category={category}
          categories={metrics.categories}
          onCategory={setCategory}
          onClearCountry={() => setSelectedCountry(null)}
          onSelectTicker={setSelectedTicker}
        />

        {/* Supporting crypto-market charts */}
        <MarketContext metrics={metrics} onSelectTicker={setSelectedTicker} />

        <footer className="pb-6 text-center text-xs text-muted">
          Sources: {(metrics.dataSources || []).join(" · ")} · Feature concepts adapted from
          koala73/worldmonitor (AGPL-3.0)
        </footer>
      </main>

      <AssetDetailDrawer ticker={selectedTicker} metrics={metrics} onClose={() => setSelectedTicker(null)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </>
  );
}
