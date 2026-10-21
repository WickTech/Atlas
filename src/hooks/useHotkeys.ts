"use client";

import { useEffect } from "react";

import { layerByHotkey } from "@/layers/registry";
import { useConsole } from "@/state/store";

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export interface Shortcut {
  keys: string;
  label: string;
}

/** Shown in the `?` overlay — keep in sync with the handler below. */
export const SHORTCUTS: Shortcut[] = [
  { keys: "⌘K / Ctrl K", label: "Command palette" },
  { keys: "/", label: "Focus search" },
  { keys: "[", label: "Toggle layer dock" },
  { keys: "]", label: "Toggle intel panel" },
  { keys: "1–4", label: "Intel · Markets · News · Brief tabs" },
  { keys: "Esc", label: "Close overlay / clear selection" },
  { keys: "?", label: "This help" }
];

const TABS = ["intel", "markets", "news", "brief"] as const;

/**
 * Global console shortcuts. One listener, reads the store imperatively, so it
 * never re-binds and never causes renders. Ignored while typing in a field.
 */
export function useHotkeys(searchRef: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useConsole.getState();

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setUi({ modal: s.ui.modal === "palette" ? null : "palette" });
        return;
      }
      if (e.key === "Escape") {
        if (s.ui.modal) s.setUi({ modal: null });
        else if (s.ui.ticker) s.setUi({ ticker: null });
        else if (isTyping(e.target)) (e.target as HTMLElement).blur();
        else s.select(null);
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey || s.ui.modal) return;

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "?") {
        s.setUi({ modal: "help" });
      } else if (e.key === "[") {
        s.setUi({ leftOpen: !s.ui.leftOpen });
      } else if (e.key === "]") {
        s.setUi({ rightOpen: !s.ui.rightOpen });
      } else if (/^[1-4]$/.test(e.key)) {
        s.setUi({ rightOpen: true, rightTab: TABS[Number(e.key) - 1] });
      } else {
        const layer = layerByHotkey(e.key);
        if (layer) s.toggleLayer(layer.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchRef]);
}
