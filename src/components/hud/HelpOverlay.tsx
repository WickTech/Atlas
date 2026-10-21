"use client";

import { SHORTCUTS } from "@/hooks/useHotkeys";
import { LAYERS } from "@/layers/registry";

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  const rows = [...SHORTCUTS, ...LAYERS.map((l) => ({ keys: l.hotkey.toUpperCase(), label: `Toggle ${l.label.toLowerCase()}` }))];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm border border-border bg-surface shadow-panel">
        <div className="eyebrow border-b border-border px-4 py-3">Keyboard shortcuts</div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-4 py-3 text-sm">
          {rows.map((r) => (
            <div key={r.keys + r.label} className="contents">
              <dt>
                <kbd className="telemetry border border-border px-1.5 py-0.5">{r.keys}</kbd>
              </dt>
              <dd className="text-muted">{r.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
