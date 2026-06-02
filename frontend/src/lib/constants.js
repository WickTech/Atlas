// Small client-side constants. (The shared/ data layer is CommonJS/server-side,
// so the frontend keeps its own copies of the few values it needs.)
export const INDIA = "India";

// Severity → Tailwind chip classes for signals.
export const SEVERITY_CLASS = {
  high: "text-bear bg-[color:var(--bear)]/10",
  medium: "text-[color:#fca311] bg-[color:#fca311]/10",
  low: "text-muted bg-[color:var(--neutral)]/10"
};
