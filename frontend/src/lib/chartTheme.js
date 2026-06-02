// Canvas (Chart.js) can't resolve CSS variables, so read the current computed
// token values from :root. Called on each render; because a theme toggle
// re-renders the tree, charts always pick up the active theme's colors.
export const readTokens = () => {
  if (typeof window === "undefined") {
    return {
      fg: "#e8eef4",
      muted: "#8aa0b4",
      border: "#1f3346",
      accent: "#00e6a8",
      bull: "#16c784",
      neutral: "#8aa0b4",
      bear: "#f6465d"
    };
  }
  const s = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (s.getPropertyValue(name) || fallback).trim();
  return {
    fg: v("--fg", "#e8eef4"),
    muted: v("--muted", "#8aa0b4"),
    border: v("--border", "#1f3346"),
    accent: v("--accent", "#00e6a8"),
    bull: v("--bull", "#16c784"),
    neutral: v("--neutral", "#8aa0b4"),
    bear: v("--bear", "#f6465d")
  };
};

// Shared axis/legend/tooltip options for line & bar charts.
export const baseChartOptions = (tokens) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { labels: { color: tokens.fg, boxWidth: 12 } },
    tooltip: {
      backgroundColor: tokens.border,
      titleColor: tokens.fg,
      bodyColor: tokens.fg,
      borderColor: tokens.accent,
      borderWidth: 1,
      padding: 10
    }
  },
  scales: {
    x: { ticks: { color: tokens.muted }, grid: { color: `${tokens.border}55` } },
    y: { ticks: { color: tokens.muted }, grid: { color: `${tokens.border}55` } }
  }
});
