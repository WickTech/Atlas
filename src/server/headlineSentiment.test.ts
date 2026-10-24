import { describe, expect, it } from "vitest";

import { scoreHeadline } from "./headlineSentiment";

const score = (t: string) => scoreHeadline(t)?.score ?? null;

describe("scoreHeadline", () => {
  it("scores clearly positive and negative headlines on the right side of zero", () => {
    expect(score("Sensex surges to record high as investors cheer strong earnings")).toBeGreaterThan(0.3);
    expect(score("Markets crash as war fears spark panic selling")).toBeLessThan(-0.3);
  });
  it("returns null, not zero, when no sentiment word is present, so those items stay out of averages", () => {
    expect(scoreHeadline("Cabinet to meet on Tuesday")).toBeNull();
    expect(scoreHeadline("")).toBeNull();
  });
  it("recognises inflected forms", () => {
    expect(score("Shares surged and rallied")).toBeGreaterThan(0);
    expect(score("Stocks plunged, dropped and slumped")).toBeLessThan(0);
    expect(score("Prices dropping fast")).toBeLessThan(0);
    expect(score("Rupee rose 10 paise")).toBeGreaterThan(0);
  });
  it("flips a word that follows a negator", () => {
    expect(score("Talks produced no deal")).toBeLessThan(0);
    expect(score("Government did not approve the plan")).toBeLessThan(0);
    expect(score("No attack reported, no one killed")).toBeGreaterThan(0);
    expect(score("Strong")).toBeGreaterThan(0);
    expect(score("not strong")).toBeLessThan(0);
  });
  it("nets positive against negative", () => {
    expect(score("Profit falls despite record revenue")).not.toBeNull();
    const mixed = scoreHeadline("Shares rise but losses remain");
    expect(mixed?.positive).toBe(1);
    expect(mixed?.negative).toBe(1);
    expect(mixed?.score).toBe(0);
  });
  it("stays within -1..1 and smooths a single word to a moderate score", () => {
    expect(score("surge")).toBe(0.2);
    expect(score("crash")).toBe(-0.2);
    const many = scoreHeadline("surge soar rally gain jump rise record growth boost beat")?.score ?? 0;
    expect(many).toBeLessThanOrEqual(1);
    expect(many).toBeGreaterThan(0.6);
  });
  it("is case-insensitive and ignores punctuation", () => {
    expect(score("MARKETS CRASH!!!")).toBe(score("markets crash"));
  });
});
