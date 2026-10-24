"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";

import { useBriefing } from "@/hooks/useBriefing";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useMetrics } from "@/hooks/useMetrics";
import { useTheme } from "@/hooks/useTheme";
import { LAYERS } from "@/layers/registry";
import { useLiveLayers } from "@/layers/useLiveLayers";
import { LENSES } from "@/lib/constants";
import { threatLevel } from "@/lib/threat";
import { selectedCountryOf, useConsole } from "@/state/store";
import { useUrlSync } from "@/state/urlSync";
import { useCountries } from "@/map/useCountries";

import { SignalBanner } from "./hud/SignalBanner";
import type { Command } from "./hud/CommandPalette";
import { LayerDock } from "./hud/LayerDock";
import { Sidebar } from "./hud/Sidebar";
import { StatusBar } from "./hud/StatusBar";
import { TopBar } from "./hud/TopBar";
import { AiBriefs } from "./modules/AiBriefs";
import { CountryRiskPanel } from "./modules/CountryRiskPanel";
import { KevPanel } from "./modules/KevPanel";
import { KpiStrip } from "./modules/KpiStrip";
import { LatestFeed } from "./modules/LatestFeed";
import { MarketsPanel } from "./modules/MarketsPanel";
import { NewsFeed } from "./modules/NewsFeed";
import { SentimentGauge } from "./modules/SentimentGauge";
import { SignalsPanel } from "./modules/SignalsPanel";

// Code that only renders on interaction stays out of the initial chunk.
const Inspector = dynamic(() => import("./inspector/Inspector").then((m) => m.Inspector), { ssr: false });
const AiSettings = dynamic(() => import("./hud/AiSettings").then((m) => m.AiSettings), { ssr: false });
const CommandPalette = dynamic(() => import("./hud/CommandPalette").then((m) => m.CommandPalette), { ssr: false });
const HelpOverlay = dynamic(() => import("./hud/HelpOverlay").then((m) => m.HelpOverlay), { ssr: false });
const MediaViewer = dynamic(() => import("./hud/MediaViewer").then((m) => m.MediaViewer), { ssr: false });
const AssetDetailDrawer = dynamic(() => import("./modules/AssetDetailDrawer").then((m) => m.AssetDetailDrawer), { ssr: false });

// MapLibre + deck.gl are the heaviest dependencies; keep them out of the
// initial chunk and off the server entirely.
const MapCanvas = dynamic(() => import("@/map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-content-center telemetry text-muted">INITIALISING GLOBE…</div>
});

export function Console() {
  const { metrics, status, error } = useMetrics();
  const { theme, toggleTheme } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);
  useUrlSync();
  useHotkeys(searchRef);

  const filters = useConsole((s) => s.filters);
  const setFilters = useConsole((s) => s.setFilters);
  const selected = useConsole(selectedCountryOf);
  const selectCountry = useConsole((s) => s.selectCountry);
  const select = useConsole((s) => s.select);
  const ui = useConsole((s) => s.ui);
  const cyberOn = useConsole((s) => s.layers.cyber.enabled);
  const { briefing, loading: briefingLoading } = useBriefing(!!metrics && ui.rightOpen && ui.rightTab === "brief");
  const setUi = useConsole((s) => s.setUi);
  const toggleLayer = useConsole((s) => s.toggleLayer);
  const selection = useConsole((s) => s.selection);

  // Live layers + geometry are owned here and shared by the map and inspector.
  const countries = useCountries();
  const live = useLiveLayers(countries?.anchors ?? null);

  // On narrow screens the inspector and intel panel are both bottom sheets; the
  // inspector wins while something is selected.
  useEffect(() => {
    if (selection && window.matchMedia("(max-width: 1023px)").matches) setUi({ rightOpen: false });
  }, [selection, setUi]);

  // Narrow screens start map-first: both panels collapsed (still one key/tap away).
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) setUi({ leftOpen: false, rightOpen: false });
  }, [setUi]);

  const marketInstruments = useMemo(() => {
    const all = metrics?.finance.instruments ?? [];
    return filters.lens === "Commodity" ? all.filter((i) => i.kind === "commodity") : all;
  }, [metrics, filters.lens]);

  const threat = useMemo(() => (metrics ? threatLevel(metrics.signals) : null), [metrics]);
  const topSignal = useMemo(() => metrics?.signals.find((s) => s.severity === "high") ?? null, [metrics]);

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      { id: "scope-india", group: "Scope", label: "Show India news", run: () => setFilters({ scope: "india" }) },
      { id: "scope-world", group: "Scope", label: "Show World news", run: () => setFilters({ scope: "world" }) },
      { id: "theme", group: "View", label: "Toggle light/dark theme", run: toggleTheme },
      { id: "help", group: "View", label: "Keyboard shortcuts", hint: "?", run: () => setUi({ modal: "help" }) },
      { id: "ai", group: "View", label: "AI brief settings (use your own key)", run: () => setUi({ modal: "ai" }) },
      { id: "pick", group: "View", label: "Pick a location on the map", hint: "G", run: () => setUi({ picking: true }) }
    ];
    for (const l of LAYERS) cmds.push({ id: `layer-${l.id}`, group: "Layer", label: `Toggle ${l.label.toLowerCase()}`, hint: l.hotkey.toUpperCase(), run: () => toggleLayer(l.id) });
    for (const l of LENSES) cmds.push({ id: `lens-${l}`, group: "Lens", label: `Switch to ${l} lens`, run: () => setFilters({ lens: l }) });
    cmds.push({ id: "cat-all", group: "Category", label: "All categories", run: () => setFilters({ category: "all" }) });
    for (const c of metrics?.categories ?? []) cmds.push({ id: `cat-${c.key}`, group: "Category", label: c.label, hint: `${c.count}`, run: () => setFilters({ category: c.key }) });
    for (const c of (metrics?.countryIndex.countries ?? []).slice(0, 20))
      cmds.push({ id: `country-${c.name}`, group: "Country", label: c.name, hint: `risk ${c.score}`, run: () => select({ kind: "country", name: c.name }) });
    for (const t of metrics?.sentiment.topTickers ?? [])
      cmds.push({ id: `ticker-${t.ticker}`, group: "Ticker", label: t.ticker, hint: `${t.mentions} mentions`, run: () => setUi({ ticker: t.ticker }) });
    for (const i of metrics?.finance.instruments ?? []) cmds.push({ id: `fin-${i.symbol}`, group: "Market", label: i.name, run: () => setUi({ ticker: i.symbol }) });
    return cmds;
  }, [metrics, toggleTheme, setFilters, setUi, select, toggleLayer]);

  const openTicker = (ticker: string) => setUi({ ticker });

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar status={status} threat={threat} theme={theme} onToggleTheme={toggleTheme} searchRef={searchRef} />
      {/* Hold the banner's row while metrics load so the map doesn't jump down (CLS). */}
      {metrics ? (
        <SignalBanner signal={topSignal} onSelectCountry={(name) => select({ kind: "country", name })} />
      ) : (
        <div className="h-8 shrink-0 border-b border-border" aria-hidden="true" />
      )}

      <div className="relative flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1" aria-label="Map">
          {metrics ? (
            <>
              <MapCanvas metrics={metrics} theme={theme} live={live} countries={countries} />
              {/* The inspector takes the left edge while something is selected; the dock collapses to its button. */}
              <LayerDock collapsed={!!selection} />
              {selection && <Inspector metrics={metrics} live={live} countries={countries} />}
              {ui.picking && (
                <div className="glass telemetry pointer-events-none absolute top-3 left-1/2 z-30 -translate-x-1/2 px-3 py-1.5" role="status">
                  CLICK THE MAP TO INSPECT A LOCATION · ESC TO CANCEL
                </div>
              )}
            </>
          ) : (
            <div className="grid h-full place-content-center px-4 text-center text-muted" role="status">
              {error || <span className="telemetry">ESTABLISHING LINK…</span>}
            </div>
          )}
        </main>

        {metrics && (
          <Sidebar
            panels={{
              intel: (
                <>
                  <KpiStrip metrics={metrics} />
                  <CountryRiskPanel countryIndex={metrics.countryIndex} selectedCountry={selected} onSelectCountry={selectCountry} />
                  <SignalsPanel signals={metrics.signals} onSelectCountry={(name) => select({ kind: "country", name })} />
                  {cyberOn && <KevPanel kev={live.kev} total={live.kevTotal} />}
                </>
              ),
              markets: (
                <>
                  <SentimentGauge overall={metrics.sentiment.overall} />
                  <MarketsPanel instruments={marketInstruments} onSelectInstrument={(i) => openTicker(i.symbol)} />
                </>
              ),
              news: (
                <NewsFeed
                  news={metrics.news}
                  filter={filters}
                  selectedCountry={selected}
                  categories={metrics.categories}
                  onCategory={(category) => setFilters({ category })}
                  onClearCountry={() => select(null)}
                  onSelectTicker={openTicker}
                />
              ),
              brief: (
                <>
                  <AiBriefs briefs={briefing ?? metrics.briefs} generating={briefingLoading} />
                  <div className="border-t border-border p-4">
                    <LatestFeed news={metrics.news} />
                  </div>
                  <p className="border-t border-border p-4 text-[10.5px] text-muted">
                    Sources: {metrics.dataSources.join(" · ")} · Basemap © OpenStreetMap contributors, OpenFreeMap · Concepts adapted from koala73/worldmonitor (AGPL-3.0)
                  </p>
                </>
              )
            }}
          />
        )}
      </div>

      {metrics && <StatusBar metrics={metrics} />}

      {metrics && ui.ticker && <AssetDetailDrawer ticker={ui.ticker} metrics={metrics} onClose={() => setUi({ ticker: null })} />}
      {ui.modal === "palette" && <CommandPalette onClose={() => setUi({ modal: null })} commands={commands} />}
      {ui.modal === "help" && <HelpOverlay onClose={() => setUi({ modal: null })} />}
      {ui.modal === "ai" && <AiSettings onClose={() => setUi({ modal: null })} />}
      {ui.media && <MediaViewer />}
    </div>
  );
}
