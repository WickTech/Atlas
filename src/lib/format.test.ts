import { describe, expect, it } from "vitest";

import { deltaArrow, deltaClass, moodLabel, formatIndianNumber, formatPercent, relativeTime, sentimentBucket, sentimentChipClass, sentimentColor, sevColor } from "./format";

describe("number formatting", () => {
  it("shows N/A for missing values", () => {
    expect(formatIndianNumber(null)).toBe("N/A");
    expect(formatPercent(undefined)).toBe("N/A");
  });
  it("groups digits the Indian way", () => {
    expect(formatIndianNumber(1234567)).toBe("12,34,567");
  });
  it("signs positive percentages only when asked", () => {
    expect(formatPercent(1.234)).toBe("+1.23%");
    expect(formatPercent(1.234, false)).toBe("1.23%");
    expect(formatPercent(-0.5)).toBe("-0.50%");
    expect(formatPercent(0)).toBe("0.00%");
  });
});

describe("relativeTime", () => {
  const now = Date.parse("2026-10-23T12:00:00Z");
  it("picks the largest whole unit", () => {
    expect(relativeTime("2026-10-23T11:59:30Z", now)).toBe("just now");
    expect(relativeTime("2026-10-23T11:55:00Z", now)).toBe("5m ago");
    expect(relativeTime("2026-10-23T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-10-20T12:00:00Z", now)).toBe("3d ago");
  });
  it("returns an empty string for missing or invalid input", () => {
    expect(relativeTime(null, now)).toBe("");
    expect(relativeTime("not a date", now)).toBe("");
  });
});

describe("sentiment helpers", () => {
  it("buckets labels and scores", () => {
    expect(sentimentBucket("Somewhat-Bullish")).toBe("bull");
    expect(sentimentBucket("Bearish")).toBe("bear");
    expect(sentimentBucket("Neutral")).toBe("neutral");
    expect(sentimentBucket(0.15)).toBe("bull");
    expect(sentimentBucket(-0.15)).toBe("bear");
    expect(sentimentBucket(0.14)).toBe("neutral");
    expect(sentimentBucket(null)).toBe("neutral");
  });
  it("maps a bucket to its colour and chip classes", () => {
    expect(sentimentColor("bull")).toBe("var(--bull)");
    expect(sentimentColor(-1)).toBe("var(--bear)");
    expect(sentimentChipClass("bear")).toContain("text-bear");
  });
  it("colours price deltas, treating null as muted and zero as up", () => {
    expect(deltaClass(null)).toBe("text-muted");
    expect(deltaClass(0)).toBe("text-bull");
    expect(deltaClass(-2)).toBe("text-bear");
  });
  it("pairs every move with a direction glyph, so colour is never the only signal", () => {
    expect(deltaArrow(1.2)).toBe("▲");
    expect(deltaArrow(0)).toBe("▲");
    expect(deltaArrow(-0.1)).toBe("▼");
    expect(deltaArrow(null)).toBe("");
  });
  it("calls a wording-based mood 'News Mood' and a provider-scored one 'Market Mood'", () => {
    expect(moodLabel("headline-wording")).toBe("News Mood");
    for (const m of ["alpha-vantage", "gdelt-tone", "none"] as const) expect(moodLabel(m)).toBe("Market Mood");
  });
  it("has a colour for every severity", () => {
    expect(sevColor("high")).toBe("var(--sev-5)");
    expect(sevColor("medium")).toBe("var(--sev-3)");
    expect(sevColor("low")).toBe("var(--sev-1)");
  });
});
