/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Semantic tokens wired to CSS variables in styles.css so the same class
      // names resolve correctly in both light and dark themes.
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        bull: "var(--bull)",
        neutral: "var(--neutral)",
        bear: "var(--bear)"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"]
      },
      boxShadow: {
        panel: "0 6px 24px rgba(0, 0, 0, 0.18)"
      },
      borderRadius: {
        xl: "14px"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};
