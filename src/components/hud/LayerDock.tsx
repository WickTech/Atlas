"use client";

import { Layers, X } from "lucide-react";

import { LAYERS, type LayerDef, type LayerGroup } from "@/layers/registry";
import { compactNumber } from "@/lib/format";
import { useConsole } from "@/state/store";
import type { LayerStatus } from "@/state/types";

const STATUS_COLOR: Record<LayerStatus, string> = {
  idle: "var(--neutral)",
  loading: "var(--amber)",
  ready: "var(--bull)",
  stale: "var(--amber)",
  error: "var(--accent)"
};

const GROUPS: LayerGroup[] = ["Intel", "Hazards", "Movement", "Infrastructure", "Media"];
const byGroup = GROUPS.map((g) => [g, LAYERS.filter((l) => l.group === g)] as const).filter(([, ls]) => ls.length);

/** Floating glass dock over the map: per-layer switch, live entity count, status, opacity. */
export function LayerDock({ collapsed = false }: { collapsed?: boolean }) {
  const open = useConsole((s) => s.ui.leftOpen) && !collapsed;
  const setUi = useConsole((s) => s.setUi);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => (collapsed ? useConsole.getState().select(null) : setUi({ leftOpen: true }))}
        className={`glass absolute z-20 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold tracking-wider uppercase hover:text-accent-400 ${collapsed ? "top-3 left-[21.5rem] max-lg:left-3" : "top-3 left-3"}`}
        aria-label="Show layers ([)"
      >
        <Layers size={13} /> Layers
      </button>
    );
  }

  return (
    <aside className="glass absolute top-3 left-3 z-20 flex max-h-[calc(100%-1.5rem)] w-64 max-w-[calc(100%-1.5rem)] flex-col" aria-label="Map layers">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="eyebrow">Intelligence layers</span>
        <button type="button" onClick={() => setUi({ leftOpen: false })} className="text-muted hover:text-fg" aria-label="Hide layers ([)">
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {byGroup.map(([group, defs]) => (
          <section key={group} aria-label={group}>
            <h3 className="telemetry border-b border-border bg-surface-2/40 px-3 py-1 text-[9.5px] tracking-[.14em] text-muted uppercase">{group}</h3>
            <ul className="flex flex-col">
              {defs.map((def) => (
                <LayerRow key={def.id} def={def} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted">Hover a layer for its method · press its key to toggle</p>
    </aside>
  );
}

function LayerRow({ def }: { def: LayerDef }) {
  const st = useConsole((s) => s.layers[def.id]);
  const toggleLayer = useConsole((s) => s.toggleLayer);
  const setLayer = useConsole((s) => s.setLayer);
  // An enabled layer that's idle is waiting on a precondition (e.g. zoom) — say which.
  const showHint = st.enabled && st.status === "idle" && def.hint;
  const statusTitle = st.error ? `error: ${st.error}` : `status: ${st.status}`;

  return (
    <li className="border-b border-border px-3 py-2 last:border-b-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={st.enabled}
          aria-label={`${def.label} layer`}
          onClick={() => toggleLayer(def.id)}
          className={`relative h-4 w-7 shrink-0 border transition-colors ${st.enabled ? "border-accent bg-accent" : "border-border bg-surface-2"}`}
        >
          <span className={`absolute top-0.5 h-2.5 w-2.5 bg-white transition-[left] ${st.enabled ? "left-3.5" : "left-0.5"}`} />
        </button>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: def.swatch }} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold" title={`${def.description}\nSource: ${def.source}`}>
          {def.label}
        </span>
        <span className="telemetry text-muted" title={statusTitle}>
          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${st.status === "loading" ? "animate-pulse" : ""}`} style={{ background: STATUS_COLOR[st.status] }} />
          {showHint ? def.hint : st.enabled ? compactNumber(st.count) : "off"}
        </span>
        <kbd className="telemetry border border-border px-1 text-[10px] text-muted uppercase">{def.hotkey}</kbd>
      </div>
      {st.enabled && (
        <label className="mt-1.5 flex items-center gap-2 pl-9 text-[10px] text-muted">
          <span className="sr-only">{def.label} opacity</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={st.opacity}
            onChange={(e) => setLayer(def.id, { opacity: Number(e.target.value) })}
            className="h-1 flex-1 accent-[var(--accent)]"
          />
          <span className="telemetry w-8 text-right">{Math.round(st.opacity * 100)}%</span>
        </label>
      )}
      {st.enabled && st.status === "error" && <p className="mt-1 pl-9 text-[10px] text-accent-400">Source unavailable — retrying</p>}
    </li>
  );
}
