import { LENSES } from "../lib/constants";
import ThemeToggle from "./ThemeToggle";

const STATUS_LABELS = {
  live: "Live",
  reconnecting: "Reconnecting…",
  polling: "Polling",
  connecting: "Connecting…"
};

const STATUS_COLOR = {
  live: "var(--bull)",
  polling: "var(--accent-400)",
  reconnecting: "#e0952a",
  connecting: "var(--muted)"
};

// Sticky header: brand, lens switcher, India/World scope, live-status, search,
// ⌘K launcher, theme toggle.
export default function TopBar({
  status,
  updatedAt,
  search,
  onSearch,
  theme,
  onToggleTheme,
  scope = "world",
  onScopeChange,
  activeLens = "World",
  onLensChange,
  onOpenPalette
}) {
  const key = STATUS_LABELS[status] ? status : "live";
  const color = STATUS_COLOR[key];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[22px] font-extrabold tracking-tight">ATLAS</h1>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </div>

        {/* Lens switcher */}
        <div className="inline-flex border border-border" role="group" aria-label="Lens">
          {LENSES.map((l, i) => (
            <button
              key={l}
              type="button"
              aria-pressed={l === activeLens}
              onClick={() => onLensChange?.(l)}
              className={`px-3 py-1.5 text-xs font-bold ${i > 0 ? "border-l border-border" : ""} ${
                l === activeLens ? "bg-accent text-white" : "text-fg hover:bg-surface-2"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* India / World scope toggle */}
        <div className="inline-flex border border-border">
          {[
            { k: "india", label: "India" },
            { k: "world", label: "World" }
          ].map((s, i) => (
            <button
              key={s.k}
              type="button"
              onClick={() => onScopeChange?.(s.k)}
              className={`px-3 py-1.5 text-xs font-bold ${i > 0 ? "border-l border-border" : ""} ${
                scope === s.k ? "bg-accent text-white" : "text-fg hover:bg-surface-2"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color }}>
          <span className="live-dot" style={{ background: color }} />
          {STATUS_LABELS[key]}
        </span>

        {updatedAt && (
          <span className="hidden font-mono text-[11px] text-muted md:inline">
            {new Date(updatedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })} IST
          </span>
        )}

        <div className="order-last w-full sm:order-none sm:w-auto sm:max-w-xs sm:flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search news…"
            className="w-full border border-border bg-transparent px-3 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
          />
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          title="Command palette (Ctrl/⌘K)"
          className="hidden items-center gap-1.5 border border-border px-2.5 py-1.5 text-xs text-muted hover:border-accent hover:text-fg sm:inline-flex"
        >
          Search or jump to…
          <span className="border border-border px-1.5 py-0.5 font-bold">⌘K</span>
        </button>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
