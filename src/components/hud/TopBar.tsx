"use client";

import { Command, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import type { MetricsStatus } from "@/hooks/useMetrics";
import type { Theme } from "@/hooks/useTheme";
import { LENSES, type Lens, type Scope } from "@/lib/constants";
import { istTime } from "@/lib/format";

const STATUS: Record<MetricsStatus, { label: string; color: string }> = {
  live: { label: "Live", color: "var(--bull)" },
  reconnecting: { label: "Reconnecting…", color: "var(--amber)" },
  connecting: { label: "Connecting…", color: "var(--muted)" }
};

const SCOPES: { k: Scope; label: string }[] = [
  { k: "india", label: "India" },
  { k: "world", label: "World" }
];

const seg = (active: boolean, first: boolean) =>
  `px-3 py-1.5 text-xs font-bold ${first ? "" : "border-l border-border"} ${active ? "bg-accent text-white" : "text-fg hover:bg-surface-2"}`;

/** Ticking UTC clock — rendered client-only to avoid a hydration mismatch. */
function UtcClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="telemetry hidden text-muted lg:inline">{now ? `${now.toISOString().slice(11, 19)}Z` : "--:--:--Z"}</span>;
}

interface Props {
  status: MetricsStatus;
  updatedAt?: string;
  search: string;
  onSearch: (q: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  scope: Scope;
  onScopeChange: (s: Scope) => void;
  activeLens: Lens;
  onLensChange: (l: Lens) => void;
  onOpenPalette: () => void;
}

/** Command bar: brand, lens switcher, scope, live status, clocks, search, ⌘K, theme. */
export function TopBar({ status, updatedAt, search, onSearch, theme, onToggleTheme, scope, onScopeChange, activeLens, onLensChange, onOpenPalette }: Props) {
  const s = STATUS[status];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[22px] font-extrabold tracking-tight">ATLAS</h1>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </div>

        <div className="inline-flex border border-border" role="group" aria-label="Lens">
          {LENSES.map((l, i) => (
            <button key={l} type="button" aria-pressed={l === activeLens} onClick={() => onLensChange(l)} className={seg(l === activeLens, i === 0)}>
              {l}
            </button>
          ))}
        </div>

        <div className="inline-flex border border-border" role="group" aria-label="Scope">
          {SCOPES.map((sc, i) => (
            <button key={sc.k} type="button" aria-pressed={scope === sc.k} onClick={() => onScopeChange(sc.k)} className={seg(scope === sc.k, i === 0)}>
              {sc.label}
            </button>
          ))}
        </div>

        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: s.color }} role="status">
          <span className="live-dot" style={{ background: s.color }} />
          {s.label}
        </span>

        <UtcClock />
        {updatedAt && <span className="telemetry hidden text-muted md:inline">{istTime(updatedAt)} IST</span>}

        <label className="relative order-last w-full sm:order-none sm:w-auto sm:max-w-xs sm:flex-1">
          <span className="sr-only">Search news</span>
          <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search news…"
            className="w-full border border-border bg-transparent py-1.5 pr-3 pl-8 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
          />
        </label>

        <button
          type="button"
          onClick={onOpenPalette}
          title="Command palette (Ctrl/⌘K)"
          className="hidden items-center gap-1.5 border border-border px-2.5 py-1.5 text-xs text-muted hover:border-accent hover:text-fg sm:inline-flex"
        >
          Jump to…
          <span className="inline-flex items-center gap-0.5 border border-border px-1.5 py-0.5 font-bold">
            <Command size={10} aria-hidden="true" />K
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="grid h-9 w-9 place-content-center border border-border bg-surface-2 text-fg transition hover:text-accent"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
