"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
const STORAGE_KEY = "atlas-theme";

// The <html> class is the single source of truth: the pre-paint script in
// layout.tsx sets it, toggleTheme mutates it, and this store observes it.
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};
const getSnapshot = (): Theme => (document.documentElement.classList.contains("light") ? "light" : "dark");
const getServerSnapshot = (): Theme => "dark";

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked (private mode) — theme still applies for this session
    }
  }, []);

  return { theme, toggleTheme };
}
