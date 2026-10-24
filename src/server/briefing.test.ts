import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Briefs } from "@/types/metrics";

const generateBriefs = vi.fn();
const cacheGet = vi.fn();
vi.mock("./briefs", () => ({ generateBriefs: (...a: unknown[]) => generateBriefs(...a) }));
vi.mock("./metricsCache", () => ({ metricsCache: { get: () => cacheGet() } }));

const news = (titles: string[]) => ({ data: { news: titles.map((title) => ({ title })) }, fetchedAt: Date.now() });
const ai = (text = "ai"): Briefs => ({ source: "openrouter", model: "m", india: text, global: text, categories: [], generatedAt: "t" });
const rule = (): Briefs => ({ source: "rule-based", india: "r", global: "r", categories: [], generatedAt: "t" });

// The module keeps its caches at module scope, so each test loads a fresh copy.
const load = async () => {
  vi.resetModules();
  return import("./briefing");
};

describe("getBriefing", () => {
  beforeEach(() => {
    generateBriefs.mockReset();
    cacheGet.mockReset();
    cacheGet.mockResolvedValue(news(["a", "b"]));
  });
  afterEach(() => vi.useRealTimers());

  it("asks the model once per headline set and serves the AI briefing from cache", async () => {
    generateBriefs.mockResolvedValue(ai());
    const { getBriefing, BRIEFING_BUDGET_MS } = await load();
    expect((await getBriefing()).source).toBe("openrouter");
    expect((await getBriefing()).source).toBe("openrouter");
    expect(generateBriefs).toHaveBeenCalledTimes(1);
    expect(generateBriefs.mock.calls[0]?.[1]).toBe(BRIEFING_BUDGET_MS);
  });

  it("shares one model call between concurrent callers", async () => {
    let release!: (b: Briefs) => void;
    generateBriefs.mockReturnValue(new Promise<Briefs>((r) => (release = r)));
    const { getBriefing } = await load();
    const calls = [getBriefing(), getBriefing(), getBriefing()];
    await vi.waitFor(() => expect(generateBriefs).toHaveBeenCalledTimes(1));
    release(ai());
    expect((await Promise.all(calls)).map((b) => b.source)).toEqual(["openrouter", "openrouter", "openrouter"]);
    expect(generateBriefs).toHaveBeenCalledTimes(1);
  });

  it("regenerates when the headlines change", async () => {
    generateBriefs.mockResolvedValue(ai());
    const { getBriefing } = await load();
    await getBriefing();
    cacheGet.mockResolvedValue(news(["c", "d"]));
    await getBriefing();
    expect(generateBriefs).toHaveBeenCalledTimes(2);
  });

  it("remembers a rule-based fallback only briefly, then retries the model", async () => {
    vi.useFakeTimers();
    generateBriefs.mockResolvedValueOnce(rule()).mockResolvedValueOnce(ai());
    const { getBriefing } = await load();
    expect((await getBriefing()).source).toBe("rule-based");
    expect((await getBriefing()).source).toBe("rule-based"); // within 90 s: no new model call
    expect(generateBriefs).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(91_000);
    expect((await getBriefing()).source).toBe("openrouter");
    expect(generateBriefs).toHaveBeenCalledTimes(2);
  });
});
