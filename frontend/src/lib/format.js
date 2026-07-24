// Shared formatting + sentiment helpers used across dashboard components.
// Atlas is India-first: numbers use the en-IN locale (lakh/crore grouping) and
// timestamps render in IST by default.

const IST_TZ = "Asia/Kolkata";

export const compactUsd = (value) => {
  if (value == null) return "N/A";
  return `$${Number(value).toLocaleString("en-IN", {
    notation: "compact",
    maximumFractionDigits: 2
  })}`;
};

// Indian Rupee with en-IN grouping (₹1,23,456 / compact ₹1.2 Cr style).
export const inr = (value, { compact = true } = {}) => {
  if (value == null) return "N/A";
  return `₹${Number(value).toLocaleString("en-IN", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 2
  })}`;
};

// Plain number with Indian (lakh/crore) digit grouping.
export const formatIndianNumber = (value) => {
  if (value == null) return "N/A";
  return Number(value).toLocaleString("en-IN");
};

export const compactNumber = (value) => {
  if (value == null) return "N/A";
  return Number(value).toLocaleString("en-IN", { notation: "compact" });
};

export const formatNumber = (value) => {
  if (value == null) return "N/A";
  return Number(value).toLocaleString("en-IN");
};

// Absolute date/time in IST (e.g. "2 Jun 2026, 9:30 pm IST").
export const istDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleString("en-IN", {
    timeZone: IST_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })} IST`;
};

// Time-of-day only, in IST.
export const istTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", {
    timeZone: IST_TZ,
    hour: "numeric",
    minute: "2-digit"
  });
};

export const formatPercent = (value, withSign = true) => {
  if (value == null) return "N/A";
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(2)}%`;
};

// "3h ago" style relative time from an ISO string.
export const relativeTime = (iso) => {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((Date.now() - then) / 1000);
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];
  for (const [unit, secs] of units) {
    const v = Math.floor(diffSec / secs);
    if (v >= 1) return `${v}${unit[0]} ago`;
  }
  return "just now";
};

// Normalizes any sentiment label/bucket to one of bull | neutral | bear.
export const sentimentBucket = (labelOrScore) => {
  if (typeof labelOrScore === "number") {
    if (labelOrScore >= 0.15) return "bull";
    if (labelOrScore <= -0.15) return "bear";
    return "neutral";
  }
  const l = String(labelOrScore || "").toLowerCase();
  if (l.includes("bull")) return "bull";
  if (l.includes("bear")) return "bear";
  return "neutral";
};

// Tailwind chip classes (text + tinted background) per sentiment bucket.
export const sentimentChipClass = (labelOrScore) => {
  const bucket = sentimentBucket(labelOrScore);
  if (bucket === "bull") return "text-bull bg-[color:var(--bull)]/10";
  if (bucket === "bear") return "text-bear bg-[color:var(--bear)]/10";
  return "text-muted bg-[color:var(--neutral)]/10";
};

export const sentimentColor = (labelOrScore) => {
  const bucket = sentimentBucket(labelOrScore);
  if (bucket === "bull") return "var(--bull)";
  if (bucket === "bear") return "var(--bear)";
  return "var(--neutral)";
};

export const deltaClass = (value) =>
  value == null ? "text-muted" : value >= 0 ? "text-bull" : "text-bear";

// Severity -> CSS color for signal dots/badges (high=accent, medium=amber, low=muted).
export const sevColor = (severity) =>
  severity === "high" ? "var(--accent)" : severity === "medium" ? "#e0952a" : "var(--neutral)";
