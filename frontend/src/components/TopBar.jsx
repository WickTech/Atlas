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

// Sticky header: brand, live-status pill, news search, last-updated, theme toggle.
export default function TopBar({ status, updatedAt, search, onSearch, theme, onToggleTheme }) {
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
            World Monitor
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
            Updated {new Date(updatedAt).toLocaleTimeString()}
          </span>
        )}

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
