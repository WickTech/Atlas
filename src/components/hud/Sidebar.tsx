"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { useConsole } from "@/state/store";
import type { RightTab } from "@/state/types";

export const TABS: { id: RightTab; label: string }[] = [
  { id: "intel", label: "Intel" },
  { id: "markets", label: "Markets" },
  { id: "news", label: "News" },
  { id: "brief", label: "Brief" }
];

/**
 * Right-hand intel panel. Docked beside the map on wide screens (so the map
 * never sits underneath it); a bottom sheet over the map on narrow ones.
 */
export function Sidebar({ panels }: { panels: Record<RightTab, ReactNode> }) {
  const { rightOpen, rightTab } = useConsole((s) => s.ui);
  const setUi = useConsole((s) => s.setUi);
  if (!rightOpen) return null;

  return (
    <aside
      aria-label="Intel panel"
      className="fixed inset-x-0 bottom-8 z-30 flex h-[58dvh] flex-col border-t border-border bg-surface shadow-panel lg:static lg:z-auto lg:h-auto lg:w-[380px] lg:shrink-0 lg:border-t-0 lg:border-l lg:shadow-none"
    >
      <div role="tablist" aria-label="Intel panel sections" className="flex shrink-0 border-b border-border">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={rightTab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setUi({ rightTab: t.id })}
            className={`flex-1 px-2 py-2.5 text-[11px] font-bold tracking-wider uppercase transition-colors ${
              rightTab === t.id ? "border-b-2 border-accent text-fg" : "border-b-2 border-transparent text-muted hover:text-fg"
            }`}
          >
            {t.label}
            <span className="telemetry ml-1 hidden text-[9px] text-muted lg:inline">{i + 1}</span>
          </button>
        ))}
        <button type="button" onClick={() => setUi({ rightOpen: false })} className="px-3 text-muted hover:text-fg lg:hidden" aria-label="Close panel">
          <X size={15} />
        </button>
      </div>
      <div role="tabpanel" id={`panel-${rightTab}`} aria-labelledby={`tab-${rightTab}`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {panels[rightTab]}
      </div>
    </aside>
  );
}
