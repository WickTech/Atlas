// Canvas (Chart.js) can't resolve CSS variables, so read the current computed
// token values from :root. Called on each render; because a theme toggle
// re-renders the tree, charts always pick up the active theme's colors.
export const readTokens = () => {
  if (typeof window === "undefined") {
    return {
      fg: "#f8f4f4",
      muted: "#a09d9c",
      border: "#4a4746",
      accent: "#ec3013",
      bull: "#5fd48c",
      neutral: "#a09d9c",
      bear: "#ec3013"
    };
  }
  const s = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (s.getPropertyValue(name) || fallback).trim();
  return {
    fg: v("--fg", "#f8f4f4"),
    muted: v("--muted", "#a09d9c"),
    border: v("--border", "#4a4746"),
    accent: v("--accent", "#ec3013"),
    bull: v("--bull", "#5fd48c"),
    neutral: v("--neutral", "#a09d9c"),
    bear: v("--bear", "#ec3013")
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
