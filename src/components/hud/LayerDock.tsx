"use client";

import { Layers, X } from "lucide-react";

import { LAYERS } from "@/layers/registry";
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

/** Floating glass dock over the map: per-layer switch, live entity count, status, opacity. */
export function LayerDock() {
  const open = useConsole((s) => s.ui.leftOpen);
  const layers = useConsole((s) => s.layers);
  const toggleLayer = useConsole((s) => s.toggleLayer);
  const setLayer = useConsole((s) => s.setLayer);
  const setUi = useConsole((s) => s.setUi);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setUi({ leftOpen: true })}
        className="glass absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold tracking-wider uppercase hover:text-accent-400"
        aria-label="Show layers ([)"
      >
        <Layers size={13} /> Layers
      </button>
    );
  }

  return (
    <aside className="glass absolute top-3 left-3 z-20 w-64 max-w-[calc(100%-1.5rem)]" aria-label="Map layers">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="eyebrow">Intelligence layers</span>
        <button type="button" onClick={() => setUi({ leftOpen: false })} className="text-muted hover:text-fg" aria-label="Hide layers ([)">
          <X size={14} />
        </button>
      </div>
      <ul className="flex flex-col">
        {LAYERS.map((def) => {
          const st = layers[def.id];
          return (
            <li key={def.id} className="border-b border-border px-3 py-2 last:border-b-0">
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
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold" title={def.description}>
                  {def.label}
                </span>
                <span className="telemetry text-muted" title={`status: ${st.status}`}>
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[st.status] }} />
                  {compactNumber(st.count)}
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
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted">Hover a layer for its method · press its key to toggle</p>
    </aside>
  );
}
