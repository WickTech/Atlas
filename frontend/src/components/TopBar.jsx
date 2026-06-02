import ThemeToggle from "./ThemeToggle";

const STATUS_LABELS = {
  live: "Live",
  reconnecting: "Reconnecting…",
  polling: "Polling",
  connecting: "Connecting…"
};

const STATUS_COLOR = {
  live: "var(--bull)",
  polling: "#3498db",
  reconnecting: "#f39c12",
  connecting: "var(--muted)"
};

// Sticky header: brand, India/World scope, live-status, search, theme toggle.
export default function TopBar({
  status,
  updatedAt,
  search,
  onSearch,
  theme,
  onToggleTheme,
  scope = "world",
  onScopeChange,
  onOpenPalette
}) {
  const key = STATUS_LABELS[status] ? status : "live";
  const color = STATUS_COLOR[key];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-content-center rounded-lg bg-accent text-[#04130d]">
            🌐
          </span>
          <h1 className="text-lg font-bold leading-tight">
            Atlas
            <span className="ml-2 hidden text-xs font-normal text-muted sm:inline">
              News &amp; Sentiment
            </span>
          </h1>
        </div>

        <span
          className="chip border"
          style={{ color, borderColor: `${color}59`, background: `${color}14` }}
        >
          <span className="live-dot" style={{ background: color }} />
          {STATUS_LABELS[key]}
        </span>

        {/* India / World scope toggle */}
        <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
          {[
            { k: "india", label: "🇮🇳 India" },
            { k: "world", label: "🌍 World" }
          ].map((s) => (
            <button
              key={s.k}
              type="button"
              onClick={() => onScopeChange?.(s.k)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                scope === s.k ? "bg-accent text-[#04130d]" : "text-muted hover:text-fg"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="order-last w-full sm:order-none sm:ml-auto sm:w-auto sm:flex-1 sm:max-w-xs">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search news…"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
          />
        </div>

        {updatedAt && (
          <span className="hidden text-xs text-muted md:inline">
            Updated {new Date(updatedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST
          </span>
        )}

        {/* Command palette launcher */}
        <button
          type="button"
          onClick={onOpenPalette}
          title="Command palette (Ctrl/⌘K)"
          className="hidden items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs text-muted hover:text-fg sm:inline-flex"
        >
          ⌘K
        </button>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
