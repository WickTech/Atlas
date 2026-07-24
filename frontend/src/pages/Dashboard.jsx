import { lazy, Suspense, useMemo, useState } from "react";

import AiBriefs from "../components/AiBriefs";
import AssetDetailDrawer from "../components/AssetDetailDrawer";
import BreakingBanner from "../components/BreakingBanner";
import CommandPalette from "../components/CommandPalette";
import CountryRiskPanel from "../components/CountryRiskPanel";
import DashboardCards from "../components/DashboardCards";
import LatestFeed from "../components/LatestFeed";
import MarketsPanel from "../components/MarketsPanel";
import NewsFeed from "../components/NewsFeed";
import SentimentGauge from "../components/SentimentGauge";
import SignalsPanel from "../components/SignalsPanel";
import TopBar from "../components/TopBar";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { useMetrics } from "../hooks/useMetrics";
import { useTheme } from "../hooks/useTheme";
import { LENSES } from "../lib/constants";

// Map pulls in topojson + react-simple-maps; load it lazily to keep first paint fast.
const WorldNewsMap = lazy(() => import("../components/WorldNewsMap"));

// Lens -> forced news category. World has no forced filter; Commodity has no
// dedicated news category so it falls back to Markets (closest real mapping).
const LENS_CATEGORY = { Finance: "markets", Commodity: "markets", Energy: "energy" };

export default function Dashboard() {
  const { metrics, status, error } = useMetrics();
  const { theme, toggleTheme } = useTheme();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("india"); // India-first for the Indian audience
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [category, setCategory] = useState("all");
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [activeLens, setActiveLens] = useState("World");

  const lensCategory = LENS_CATEGORY[activeLens] || null;
  const newsCategory = lensCategory || category;

  const marketInstruments = useMemo(() => {
    const all = metrics?.finance?.instruments || [];
    return activeLens === "Commodity" ? all.filter((i) => i.kind === "commodity") : all;
  }, [metrics, activeLens]);

  const topBreakingSignal = useMemo(
    () => (metrics?.signals || []).find((s) => s.severity === "high") || null,
    [metrics]
  );

  // Build command-palette actions from the live data.
  const commands = useMemo(() => {
    const cmds = [
      { id: "scope-india", group: "Scope", label: "Show India news", run: () => setScope("india") },
      { id: "scope-world", group: "Scope", label: "Show World news", run: () => setScope("world") },
      { id: "theme", group: "View", label: "Toggle light/dark theme", run: toggleTheme }
    ];
    for (const l of LENSES) {
      cmds.push({ id: `lens-${l}`, group: "Lens", label: `Switch to ${l} lens`, run: () => setActiveLens(l) });
    }
    cmds.push({ id: "cat-all", group: "Category", label: "All categories", run: () => setCategory("all") });
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
      activeLens={activeLens}
      onLensChange={setActiveLens}
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

      <BreakingBanner signal={topBreakingSignal} onSelectCountry={setSelectedCountry} />

      <main className="mx-auto flex max-w-7xl flex-col px-4 py-5">
        <div className="mb-5">
          <DashboardCards metrics={metrics} />
        </div>

        {/* Operations Room: instability index | map | signals + markets */}
        <div className="grid grid-cols-1 border border-border [@media(min-width:1180px)]:grid-cols-[300px_1fr_340px]">
          <div className="flex flex-col border-b border-border [@media(min-width:1180px)]:border-b-0 [@media(min-width:1180px)]:border-r">
            <CountryRiskPanel
              countryIndex={metrics.countryIndex}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
            />
          </div>

          <div className="flex flex-col">
            <Suspense
              fallback={<div className="grid h-[440px] place-content-center text-muted">Loading map…</div>}
            >
              <WorldNewsMap
                countryIndex={metrics.countryIndex}
                selectedCountry={selectedCountry}
                onSelectCountry={setSelectedCountry}
              />
            </Suspense>
          </div>

          <div className="flex flex-col border-t border-border [@media(min-width:1180px)]:border-t-0 [@media(min-width:1180px)]:border-l">
            <SignalsPanel signals={metrics.signals} onSelectCountry={setSelectedCountry} />
            <MarketsPanel
              instruments={marketInstruments}
              onSelectInstrument={(i) => setSelectedTicker(i.symbol)}
            />
          </div>
        </div>

        {/* Sentiment overview */}
        <section className="mt-5">
          <SentimentGauge overall={metrics.sentiment?.overall} />
        </section>

        {/* Centerpiece: news feed with scope + categories + country filter */}
        <div className="mt-5">
          <NewsFeed
            news={metrics.news}
            search={search}
            scope={scope}
            selectedCountry={selectedCountry}
            category={newsCategory}
            categories={metrics.categories}
            onCategory={setCategory}
            onClearCountry={() => setSelectedCountry(null)}
            onSelectTicker={setSelectedTicker}
          />
        </div>

        {/* World brief strip */}
        <div className="mt-5 grid grid-cols-1 gap-9 border-t border-border pt-5 md:grid-cols-2">
          <AiBriefs briefs={metrics.briefs} />
          <LatestFeed news={metrics.news} />
        </div>

        <footer className="py-6 text-center text-xs text-muted">
          Sources: {(metrics.dataSources || []).join(" · ")} · Feature concepts adapted from
          koala73/worldmonitor (AGPL-3.0)
        </footer>
      </main>

      <AssetDetailDrawer ticker={selectedTicker} metrics={metrics} onClose={() => setSelectedTicker(null)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </>
  );
}
