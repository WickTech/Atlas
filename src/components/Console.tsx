"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";

import { useHotkeys } from "@/hooks/useHotkeys";
import { useMetrics } from "@/hooks/useMetrics";
import { useTheme } from "@/hooks/useTheme";
import { LAYERS } from "@/layers/registry";
import { LENSES } from "@/lib/constants";
import { threatLevel } from "@/lib/threat";
import { selectedCountryOf, useConsole } from "@/state/store";
import { useUrlSync } from "@/state/urlSync";

import { SignalBanner } from "./hud/SignalBanner";
import { CommandPalette, type Command } from "./hud/CommandPalette";
import { HelpOverlay } from "./hud/HelpOverlay";
import { LayerDock } from "./hud/LayerDock";
import { MediaViewer } from "./hud/MediaViewer";
import { Sidebar } from "./hud/Sidebar";
import { StatusBar } from "./hud/StatusBar";
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
  const setUi = useConsole((s) => s.setUi);
  const toggleLayer = useConsole((s) => s.toggleLayer);

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
      { id: "help", group: "View", label: "Keyboard shortcuts", hint: "?", run: () => setUi({ modal: "help" }) }
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
      {metrics && <SignalBanner signal={topSignal} onSelectCountry={(name) => select({ kind: "country", name })} />}

      <div className="relative flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1" aria-label="Map">
          {metrics ? (
            <>
              <MapCanvas metrics={metrics} theme={theme} />
              <LayerDock />
              {selected && (
                <button
                  type="button"
                  onClick={() => select(null)}
                  className="glass telemetry absolute bottom-3 left-3 z-20 inline-flex items-center gap-2 px-2.5 py-1.5 hover:text-accent-400"
                  title="Clear selection (Esc)"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> FOCUS {selected.toUpperCase()} ✕
                </button>
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
                  <AiBriefs briefs={metrics.briefs} />
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

      {metrics && <AssetDetailDrawer ticker={ui.ticker} metrics={metrics} onClose={() => setUi({ ticker: null })} />}
      {ui.modal === "palette" && <CommandPalette onClose={() => setUi({ modal: null })} commands={commands} />}
      {ui.modal === "help" && <HelpOverlay onClose={() => setUi({ modal: null })} />}
      <MediaViewer />
    </div>
  );
}
