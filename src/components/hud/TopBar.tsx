"use client";

import { Command, Moon, PanelLeft, PanelRight, Search, Sun } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";

import type { MetricsStatus } from "@/hooks/useMetrics";
import type { Theme } from "@/hooks/useTheme";
import { LENSES, type Scope } from "@/lib/constants";
import { THREAT_COLOR, type ThreatLevel } from "@/lib/threat";
import { useConsole } from "@/state/store";

const STATUS: Record<MetricsStatus, { label: string; color: string }> = {
  live: { label: "LIVE", color: "var(--bull)" },
  reconnecting: { label: "RETRYING", color: "var(--amber)" },
  connecting: { label: "LINKING", color: "var(--muted)" }
};

const SCOPES: { k: Scope; label: string }[] = [
  { k: "india", label: "India" },
  { k: "world", label: "World" }
];

const seg = (active: boolean, first: boolean) =>
  `px-2.5 py-1 text-[11px] font-bold ${first ? "" : "border-l border-border"} ${active ? "bg-accent text-white" : "text-fg hover:bg-surface-2"}`;

const iconBtn = "grid h-8 w-8 place-content-center border border-border text-muted transition hover:border-accent hover:text-fg aria-pressed:text-fg";

/** Ticking UTC clock — client-only so SSR markup never disagrees with hydration. */
function UtcClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="telemetry hidden text-muted xl:inline">{now ? `${now.toISOString().slice(11, 19)}Z` : "--:--:--Z"}</span>;
}

interface Props {
  status: MetricsStatus;
  threat: { level: ThreatLevel; highs: number } | null;
  theme: Theme;
  onToggleTheme: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

/** Command bar: brand, threat posture, lens + scope, live link, search, panels, ⌘K, theme. */
export function TopBar({ status, threat, theme, onToggleTheme, searchRef }: Props) {
  const filters = useConsole((s) => s.filters);
  const setFilters = useConsole((s) => s.setFilters);
  const ui = useConsole((s) => s.ui);
  const setUi = useConsole((s) => s.setUi);
  const st = STATUS[status];

  return (
    <header className="z-40 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-bg px-3 py-2 sm:px-4">
      <div className="flex items-baseline gap-1.5">
        <h1 className="text-lg font-extrabold tracking-tight">ATLAS</h1>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
      </div>

      {threat && (
        <span
          className="telemetry inline-flex items-center gap-1.5 border px-2 py-0.5 font-semibold"
          style={{ color: THREAT_COLOR[threat.level], borderColor: THREAT_COLOR[threat.level] }}
          title={`Threat posture from live signals: ${threat.highs} high-severity signal${threat.highs === 1 ? "" : "s"} (0 low · 1 guarded · 2–3 elevated · 4+ high)`}
        >
          THREAT {threat.level}
        </span>
      )}

      <div className="inline-flex border border-border" role="group" aria-label="Lens">
        {LENSES.map((l, i) => (
          <button key={l} type="button" aria-pressed={l === filters.lens} onClick={() => setFilters({ lens: l })} className={seg(l === filters.lens, i === 0)}>
            {l}
          </button>
        ))}
      </div>

      <div className="inline-flex border border-border" role="group" aria-label="Scope">
        {SCOPES.map((sc, i) => (
          <button key={sc.k} type="button" aria-pressed={filters.scope === sc.k} onClick={() => setFilters({ scope: sc.k })} className={seg(filters.scope === sc.k, i === 0)}>
            {sc.label}
          </button>
        ))}
      </div>

      <span className="telemetry ml-auto inline-flex items-center gap-1.5 font-semibold" style={{ color: st.color }} role="status">
        <span className="live-dot" style={{ background: st.color, color: st.color }} />
        {st.label}
      </span>
      <UtcClock />

      <label className="relative order-last w-full sm:order-none sm:w-56">
        <span className="sr-only">Search news</span>
        <Search size={13} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="Search news…  /"
          className="w-full border border-border bg-transparent py-1 pr-2 pl-7 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
        />
      </label>

      <div className="flex items-center gap-1.5">
        <button type="button" className={iconBtn} aria-pressed={ui.leftOpen} aria-label="Toggle layer dock ([)" title="Layers  [" onClick={() => setUi({ leftOpen: !ui.leftOpen })}>
          <PanelLeft size={15} />
        </button>
        <button type="button" className={iconBtn} aria-pressed={ui.rightOpen} aria-label="Toggle intel panel (])" title="Intel panel  ]" onClick={() => setUi({ rightOpen: !ui.rightOpen })}>
          <PanelRight size={15} />
        </button>
        <button type="button" className={`${iconBtn} hidden w-auto gap-1 px-2 sm:inline-flex sm:items-center`} title="Command palette (⌘K)" onClick={() => setUi({ modal: "palette" })}>
          <Command size={12} aria-hidden="true" />
          <span className="text-[11px] font-bold">K</span>
        </button>
        <button type="button" className={iconBtn} onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
