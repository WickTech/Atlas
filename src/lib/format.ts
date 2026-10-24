// Shared formatting + sentiment helpers. Atlas is India-first: numbers use the
// en-IN locale (lakh/crore grouping) and timestamps render in IST.
import type { Severity } from "@/types/metrics";

const IST_TZ = "Asia/Kolkata";

type Num = number | null | undefined;

export const inr = (value: Num, { compact = true } = {}) =>
  value == null
    ? "N/A"
    : `₹${Number(value).toLocaleString("en-IN", { notation: compact ? "compact" : "standard", maximumFractionDigits: 2 })}`;

export const formatIndianNumber = (value: Num) => (value == null ? "N/A" : Number(value).toLocaleString("en-IN"));

export const compactNumber = (value: Num) =>
  value == null ? "N/A" : Number(value).toLocaleString("en-IN", { notation: "compact" });

export const formatPercent = (value: Num, withSign = true) => {
  if (value == null) return "N/A";
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(2)}%`;
};

export const istTime = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("en-IN", { timeZone: IST_TZ, hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

/** "3h ago" style relative time from an ISO string. */
export const relativeTime = (iso: string | null | undefined, now = Date.now()) => {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((now - then) / 1000);
  const units: [string, number][] = [
    ["y", 31536000],
    ["mo", 2592000],
    ["d", 86400],
    ["h", 3600],
    ["m", 60]
  ];
  for (const [unit, secs] of units) {
    const v = Math.floor(diffSec / secs);
    if (v >= 1) return `${v}${unit} ago`;
  }
  return "just now";
};

export type Bucket = "bull" | "neutral" | "bear";

/** Normalizes any sentiment label/bucket/score to bull | neutral | bear. */
export const sentimentBucket = (labelOrScore: string | number | null | undefined): Bucket => {
  if (typeof labelOrScore === "number") {
    if (labelOrScore >= 0.15) return "bull";
    if (labelOrScore <= -0.15) return "bear";
    return "neutral";
  }
  const l = String(labelOrScore ?? "").toLowerCase();
  if (l.includes("bull")) return "bull";
  if (l.includes("bear")) return "bear";
  return "neutral";
};

const CHIP: Record<Bucket, string> = {
  bull: "text-bull bg-bull/10",
  bear: "text-bear bg-bear/10",
  neutral: "text-muted bg-neutral/10"
};
export const sentimentChipClass = (v: string | number | null | undefined) => CHIP[sentimentBucket(v)];

const COLOR: Record<Bucket, string> = { bull: "var(--bull)", bear: "var(--bear)", neutral: "var(--neutral)" };
export const sentimentColor = (v: string | number | null | undefined) => COLOR[sentimentBucket(v)];

/** Direction glyph so a price move is never signalled by colour alone. Zero counts as up, like deltaClass. */
export const deltaArrow = (value: Num) => (value == null ? "" : value >= 0 ? "▲" : "▼");

/** Wording-based scores describe the news, not the market, so the tile says so. */
export const moodLabel = (method: "alpha-vantage" | "headline-wording" | "gdelt-tone" | "none") => (method === "headline-wording" ? "News Mood" : "Market Mood");

export const deltaClass = (value: Num) => (value == null ? "text-muted" : value >= 0 ? "text-bull" : "text-bear");

const SEV: Record<Severity, string> = { high: "var(--sev-5)", medium: "var(--sev-3)", low: "var(--sev-1)" };
export const sevColor = (severity: Severity) => SEV[severity];
