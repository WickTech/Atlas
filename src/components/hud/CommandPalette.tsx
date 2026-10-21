"use client";

import { useMemo, useState, type KeyboardEvent } from "react";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  run: () => void;
}

/** ⌘/Ctrl-K command palette. Mounted only while open, so state resets per open. */
export function CommandPalette({ onClose, commands }: { onClose: () => void; commands: Command[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? commands.filter((c) => `${c.label} ${c.hint ?? ""} ${c.group ?? ""}`.toLowerCase().includes(q)) : commands).slice(0, 50);
  }, [commands, query]);

  const choose = (cmd: Command | undefined) => {
    if (!cmd) return;
    onClose(); // close first so a command may open another overlay
    cmd.run();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg overflow-hidden border border-border bg-surface-2 shadow-panel">
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
          placeholder="Search countries, tickers, categories, actions…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-fg outline-none placeholder:text-muted"
        />
        <ul id="palette-results" role="listbox" className="max-h-80 overflow-y-auto py-1">
          {results.length ? (
            results.map((c, i) => (
              <li key={c.id} id={`cmd-${c.id}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${i === active ? "bg-surface text-fg" : "text-muted"}`}
                >
                  <span className="truncate">
                    {c.group && <span className="mr-2 text-xs text-muted/70 uppercase">{c.group}</span>}
                    {c.label}
                  </span>
                  {c.hint && <span className="telemetry shrink-0 text-muted/70">{c.hint}</span>}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-center text-sm text-muted">No matches</li>
          )}
        </ul>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted">↑↓ navigate · ↵ select · esc close</div>
      </div>
    </div>
  );
}
