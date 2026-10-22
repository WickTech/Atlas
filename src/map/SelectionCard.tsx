import { ExternalLink, X } from "lucide-react";

import type { GeoItem } from "@/layers/types";
import { relativeTime, sevColor } from "@/lib/format";

/** Compact pinned summary of the selected map entity (stage 4 grows this into the inspector). */
export function SelectionCard({ item, onClose }: { item: GeoItem; onClose: () => void }) {
  const [lng, lat] = item.coord;
  return (
    <section
      className="glass absolute bottom-3 left-3 z-20 w-72 max-w-[calc(100%-1.5rem)] text-xs"
      aria-label={`Selected: ${item.title}`}
    >
      <header className="flex items-start gap-2 border-b border-border px-3 py-2">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: sevColor(item.severity) }} aria-hidden="true" />
        <h2 className="min-w-0 flex-1 text-[13px] leading-snug font-bold">{item.title}</h2>
        <button type="button" onClick={onClose} aria-label="Clear selection (Esc)" className="text-muted hover:text-fg">
          <X size={14} />
        </button>
      </header>
      <ul className="flex flex-col gap-0.5 px-3 py-2">
        {item.facts.map((f) => (
          <li key={f} className="text-fg/90">
            {f}
          </li>
        ))}
      </ul>
      <footer className="telemetry flex items-center justify-between gap-2 border-t border-border px-3 py-1.5 text-muted">
        <span>
          {lat.toFixed(2)}°, {lng.toFixed(2)}°{item.ts ? ` · ${relativeTime(item.ts)}` : ""}
        </span>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent-400">
            {item.source} <ExternalLink size={11} aria-hidden="true" />
          </a>
        ) : (
          <span>{item.source}</span>
        )}
      </footer>
    </section>
  );
}
