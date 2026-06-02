import { useEffect, useMemo, useRef, useState } from "react";

// Lightweight ⌘/Ctrl-K command palette (no external dep). `commands` is a flat
// list of { id, label, hint, group, run } built by the Dashboard.
export default function CommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? commands.filter((c) => `${c.label} ${c.hint || ""} ${c.group || ""}`.toLowerCase().includes(q))
      : commands;
    return list.slice(0, 50);
  }, [commands, query]);

  if (!open) return null;

  const choose = (cmd) => {
    if (!cmd) return;
    cmd.run();
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-bg shadow-panel">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search countries, tickers, categories, actions…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-fg outline-none placeholder:text-muted"
        />
        <ul className="max-h-80 overflow-y-auto py-1">
          {results.length ? (
            results.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                    i === active ? "bg-surface-2 text-fg" : "text-muted"
                  }`}
                >
                  <span className="truncate">
                    {c.group && <span className="mr-2 text-xs uppercase text-muted/70">{c.group}</span>}
                    {c.label}
                  </span>
                  {c.hint && <span className="shrink-0 text-xs text-muted/70">{c.hint}</span>}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-center text-sm text-muted">No matches</li>
          )}
        </ul>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted">
          ↑↓ navigate · ↵ select · esc close
        </div>
      </div>
    </div>
  );
}
