import { describe, expect, it } from "vitest";

import { classifyArticle, hasWholePhrase } from "./categories";

describe("hasWholePhrase", () => {
  it("matches whole words and phrases only", () => {
    expect(hasWholePhrase("new ai chip", "ai")).toBe(true);
    expect(hasWholePhrase("officials said", "ai")).toBe(false);
    expect(hasWholePhrase("what will happen", "app")).toBe(false);
    expect(hasWholePhrase("open-source software", "war")).toBe(false);
    expect(hasWholePhrase("the air force jet", "air force")).toBe(true);
    expect(hasWholePhrase("the air forces jet", "air force")).toBe(false);
  });
  it("treats string edges and punctuation as boundaries", () => {
    expect(hasWholePhrase("war", "war")).toBe(true);
    expect(hasWholePhrase("war: day 3", "war")).toBe(true);
    expect(hasWholePhrase("rise of (ai).", "ai")).toBe(true);
    expect(hasWholePhrase("g20 summit", "g20")).toBe(true);
  });
  it("treats digits and underscores as word characters, like \\b", () => {
    expect(hasWholePhrase("ai2 labs", "ai")).toBe(false);
    expect(hasWholePhrase("ai_model", "ai")).toBe(false);
  });
  it("finds a later occurrence after a rejected one", () => {
    expect(hasWholePhrase("said then ai arrived", "ai")).toBe(true);
    expect(hasWholePhrase("raid, said, trail", "ai")).toBe(false);
  });
});

describe("classifyArticle keywords", () => {
  const cls = (title: string, summary = "") => classifyArticle({ title, summary, topics: [] });
  it("is case-insensitive and reads the summary too", () => {
    expect(cls("RBI holds RATE steady")).toBe("markets");
    expect(cls("Local news", "Heavy MONSOON rain expected")).toBe("climate");
  });
  it("respects category priority order when several match", () => {
    expect(cls("Stock market reacts to election result")).toBe("markets");
  });
  it("falls back to general when nothing matches as a whole word", () => {
    expect(cls("Officials said talks would happen again")).toBe("general");
    expect(cls("")).toBe("general");
  });
});
