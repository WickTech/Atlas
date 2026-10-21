"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useMetrics } from "@/hooks/useMetrics";
import { useTheme } from "@/hooks/useTheme";
import { LENS_CATEGORY, LENSES, type Lens, type Scope } from "@/lib/constants";

import { BreakingBanner } from "./hud/BreakingBanner";
import { CommandPalette, type Command } from "./hud/CommandPalette";
import { TopBar } from "./hud/TopBar";
import { AiBriefs } from "./modules/AiBriefs";
import { AssetDetailDrawer } from "./modules/AssetDetailDrawer";
import { CountryRiskPanel } from "./modules/CountryRiskPanel";
import { KpiStrip } from "./modules/KpiStrip";
import { LatestFeed } from "./modules/LatestFeed";
import { MarketsPanel } from "./modules/MarketsPanel";
import { NewsFeed } from "./modules/NewsFeed";
import { SentimentGauge } from "./modules/SentimentGauge";
import { SignalsPanel } from "./modules/SignalsPanel";

// MapLibre + WebGL is the heaviest dependency; keep it out of the initial chunk
// and off the server entirely.
const RiskMap = dynamic(() => import("@/map/RiskMap"), {
  ssr: false,
  loading: () => <div className="grid h-[440px] place-content-center text-muted">Loading map…</div>
});

export function Console() {
  const { metrics, status, error } = useMetrics();
  const { theme, toggleTheme } = useTheme();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("india"); // India-first for the Indian audience
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState<Lens>("World");

  const newsCategory = LENS_CATEGORY[activeLens] ?? category;

  const marketInstruments = useMemo(() => {
    const all = metrics?.finance.instruments ?? [];
    return activeLens === "Commodity" ? all.filter((i) => i.kind === "commodity") : all;
  }, [metrics, activeLens]);

  const topBreakingSignal = useMemo(() => metrics?.signals.find((s) => s.severity === "high") ?? null, [metrics]);

  // Command-palette actions built from live data.
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      { id: "scope-india", group: "Scope", label: "Show India news", run: () => setScope("india") },
      { id: "scope-world", group: "Scope", label: "Show World news", run: () => setScope("world") },
      { id: "theme", group: "View", label: "Toggle light/dark theme", run: toggleTheme }
    ];
    for (const l of LENSES) cmds.push({ id: `lens-${l}`, group: "Lens", label: `Switch to ${l} lens`, run: () => setActiveLens(l) });
    cmds.push({ id: "cat-all", group: "Category", label: "All categories", run: () => setCategory("all") });
    for (const c of metrics?.categories ?? []) cmds.push({ id: `cat-${c.key}`, group: "Category", label: c.label, hint: `${c.count}`, run: () => setCategory(c.key) });
    for (const c of (metrics?.countryIndex.countries ?? []).slice(0, 12))
      cmds.push({ id: `country-${c.name}`, group: "Country", label: c.name, hint: `risk ${c.score}`, run: () => setSelectedCountry(c.name) });
    for (const t of metrics?.sentiment.topTickers ?? [])
      cmds.push({ id: `ticker-${t.ticker}`, group: "Ticker", label: t.ticker, hint: `${t.mentions} mentions`, run: () => setSelectedTicker(t.ticker) });
    for (const i of metrics?.finance.instruments ?? []) cmds.push({ id: `fin-${i.symbol}`, group: "Market", label: i.name, run: () => setSelectedTicker(i.symbol) });
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

  if (!metrics) {
    return (
      <>
        {header}
        <div className="grid min-h-[60vh] place-content-center px-4 text-center text-muted" role="status">
          {error || "Loading console…"}
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <BreakingBanner signal={topBreakingSignal} onSelectCountry={setSelectedCountry} />

      <main className="mx-auto flex max-w-7xl flex-col px-4 py-5">
        <div className="mb-5">
          <KpiStrip metrics={metrics} />
        </div>

        {/* Operations Room: instability index | map | signals + markets */}
        <div className="grid grid-cols-1 border border-border ops:grid-cols-[300px_1fr_340px]">
          <div className="flex flex-col border-b border-border ops:border-r ops:border-b-0">
            <CountryRiskPanel countryIndex={metrics.countryIndex} selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />
          </div>
          <div className="flex min-h-0 flex-col">
            <RiskMap countryIndex={metrics.countryIndex} selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} theme={theme} />
          </div>
          <div className="flex flex-col border-t border-border ops:border-t-0 ops:border-l">
            <SignalsPanel signals={metrics.signals} onSelectCountry={setSelectedCountry} />
            <MarketsPanel instruments={marketInstruments} onSelectInstrument={(i) => setSelectedTicker(i.symbol)} />
          </div>
        </div>

        <section className="mt-5">
          <SentimentGauge overall={metrics.sentiment.overall} />
        </section>

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

        <div className="mt-5 grid grid-cols-1 gap-9 border-t border-border pt-5 md:grid-cols-2">
          <AiBriefs briefs={metrics.briefs} />
          <LatestFeed news={metrics.news} />
        </div>

        <footer className="py-6 text-center text-xs text-muted">
          Sources: {metrics.dataSources.join(" · ")} · Basemap © OpenStreetMap contributors, OpenFreeMap · Feature concepts adapted from koala73/worldmonitor
          (AGPL-3.0)
        </footer>
      </main>

      <AssetDetailDrawer ticker={selectedTicker} metrics={metrics} onClose={() => setSelectedTicker(null)} />
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} commands={commands} />}
    </>
  );
}
