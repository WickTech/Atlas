import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "wm-theme";

const getInitialTheme = () => {
  if (typeof document !== "undefined") {
    if (document.documentElement.classList.contains("light")) return "light";
    if (document.documentElement.classList.contains("dark")) return "dark";
  }
  return "dark";
};

// Light/dark theme controller. The initial class is applied pre-paint by an inline
// script in index.html; this hook keeps React state in sync and persists changes.
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_e) {
      // ignore storage failures (private mode)
    }
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    []
  );

  return { theme, toggleTheme };
}
