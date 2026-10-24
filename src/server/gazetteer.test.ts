import { describe, expect, it } from "vitest";

import { detectCountry, findAliases } from "./gazetteer";

const aliases = (text: string) => findAliases(text).map((h) => h.alias);

describe("findAliases", () => {
  it("matches whole words only, case-insensitively, left to right", () => {
    expect(aliases("Modi met Macron in Paris")).toEqual(expect.arrayContaining(["modi", "macron", "paris"]));
    expect(aliases("a bus to Russia")).toEqual(["russia"]); // "us" inside "bus"/"Russia" must not match
    expect(aliases("FRANCE and france")).toEqual(["france", "france"]);
  });
  it("prefers the longest alias at a position", () => {
    expect(aliases("Papua New Guinea")).toEqual(["papua new guinea"]);
    expect(aliases("South Sudan talks")).toEqual(["south sudan"]);
    expect(aliases("Sudan talks")).toEqual(["sudan"]);
  });
  it("falls back to a shorter alias when the longer one is only a prefix of a longer word", () => {
    expect(aliases("Chadian forces")).not.toContain("chad");
    expect(aliases("Chad: forces")).toEqual(["chad"]);
  });
  it("treats a preceding dot or underscore as part of the word, but trailing punctuation as a boundary", () => {
    expect(aliases("foo.us")).toEqual([]);
    expect(aliases("ai_us")).toEqual([]);
    expect(aliases("(UAE) minister")).toEqual(["uae"]);
    expect(aliases("in the U.S. Senate")).toEqual(["u.s."]);
    expect(aliases("US.")).toEqual(["us"]);
  });
  it("keeps the original casing in `raw`", () => {
    expect(findAliases("The US and the us")).toEqual([
      { alias: "us", raw: "US" },
      { alias: "us", raw: "us" }
    ]);
  });
  it("copes with empty text and with characters whose lower-case changes length", () => {
    expect(findAliases("")).toEqual([]);
    // U+0130 lower-cases to two code units and, like the old /i regex, is not folded to "i".
    // The point is that the other matches keep their positions and nothing shifts or throws.
    expect(aliases("İSTANBUL, TÜRKIYE")).toEqual(["türkiye"]);
    expect(findAliases("İSTANBUL, TÜRKIYE")[0]?.raw).toBe("TÜRKIYE");
  });
  it("is fast on a full day's worth of headlines (no regex backtracking, no per-position full scan)", () => {
    const text = "Officials said the talks between delegations would resume next week after a long break ".repeat(40);
    const started = performance.now();
    for (let i = 0; i < 400; i++) findAliases(text);
    expect(performance.now() - started).toBeLessThan(1500);
  });
});

describe("detectCountry", () => {
  it("does not tag America for the pronoun 'us' but does for 'US'", () => {
    expect(detectCountry("Join us for the festival")).toBeNull();
    expect(detectCountry("US sanctions announced")).toBe("United States of America");
  });
  it("weighs title mentions double against the summary", () => {
    expect(detectCountry("Delhi talks with Beijing", "Beijing and Moscow and Moscow")).toBe("China");
  });
});
