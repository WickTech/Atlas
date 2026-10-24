import { describe, expect, it, vi } from "vitest";

import type { Article, BestStock } from "@/types/metrics";

import { avMessage, createAvBundle, FALLBACK_ARTICLE } from "./alphaVantage";

const article = (title: string): Article => ({ ...FALLBACK_ARTICLE, title, provider: "Alpha Vantage", source: "x" });
const stock = (symbol: string): BestStock => ({ symbol, name: symbol, changePercent: 5, price: 1, volume: 1, source: "Alpha Vantage" });
const noStock: BestStock = { symbol: "N/A", name: "Market data unavailable", changePercent: null, price: null, volume: null, source: "Fallback" };

const HOUR = 60 * 60_000;

// A controllable clock so TTLs and the retry pause are tested without waiting.
const setup = (over: Partial<Parameters<typeof createAvBundle>[0]> = {}) => {
  let t = 1_000_000;
  const order: string[] = [];
  const loadNews = vi.fn(async () => {
    order.push("news");
    return [article("n1")];
  });
  const loadStock = vi.fn(async () => {
    order.push("stock");
    return stock("AAA");
  });
  const sleep = vi.fn(async (ms: number) => {
    order.push(`sleep:${ms}`);
  });
  const av = createAvBundle({ now: () => t, sleep, loadNews, loadStock, ...over });
  return { av, loadNews, loadStock, sleep, order, advance: (ms: number) => (t += ms) };
};

describe("avMessage", () => {
  it("recognises Alpha Vantage's in-band messages (HTTP 200 with a message instead of data)", () => {
    expect(avMessage({ Information: "Please spread out your free requests (1 request per second)" })).toMatch(/1 request per second/);
    expect(avMessage({ Note: "Thank you for using Alpha Vantage" })).toBe("Thank you for using Alpha Vantage");
    expect(avMessage({ "Error Message": "Invalid API call" })).toBe("Invalid API call");
  });
  it("ignores real data and non-objects", () => {
    expect(avMessage({ feed: [] })).toBeNull();
    expect(avMessage(null)).toBeNull();
    expect(avMessage("text")).toBeNull();
    expect(avMessage({ Information: "" })).toBeNull();
  });
});

describe("createAvBundle", () => {
  it("makes the two calls one after the other with a gap, never at the same time", async () => {
    const { av, order } = setup();
    await av.get();
    expect(order).toEqual(["news", "sleep:1200", "stock"]);
  });

  it("reuses a good bundle for hours instead of calling again each minute", async () => {
    const { av, loadNews, advance } = setup();
    await av.get();
    advance(60_000);
    await av.get();
    advance(2 * HOUR);
    await av.get();
    expect(loadNews).toHaveBeenCalledTimes(1);
    advance(HOUR); // 3 h + 1 min since the fetch
    await av.get();
    expect(loadNews).toHaveBeenCalledTimes(2);
  });

  it("shares one refresh between concurrent callers", async () => {
    const { av, loadNews } = setup();
    await Promise.all([av.get(), av.get(), av.get()]);
    expect(loadNews).toHaveBeenCalledTimes(1);
  });

  it("after a failure waits before asking again, and serves the last good data meanwhile", async () => {
    const { av, loadNews, loadStock, advance } = setup();
    const first = await av.get();
    advance(4 * HOUR);
    loadNews.mockResolvedValueOnce([FALLBACK_ARTICLE]); // throttled
    loadStock.mockResolvedValueOnce(noStock);
    const second = await av.get();
    expect(second.news).toEqual(first.news);
    expect(second.bestStock).toEqual(first.bestStock);
    advance(5 * 60_000);
    await av.get(); // inside the pause: no call
    expect(loadNews).toHaveBeenCalledTimes(2);
    advance(16 * 60_000); // 21 min after the failure
    await av.get();
    expect(loadNews).toHaveBeenCalledTimes(3);
  });

  it("keeps the half that worked when only one call fails", async () => {
    const { av, loadStock } = setup();
    loadStock.mockResolvedValueOnce(noStock);
    const b = await av.get();
    expect(b.news[0]?.title).toBe("n1");
    expect(b.bestStock.source).toBe("Fallback");
  });

  it("reports the fallback (not a throw) when nothing has ever worked", async () => {
    const { av } = setup({ loadNews: async () => [FALLBACK_ARTICLE], loadStock: async () => noStock });
    const b = await av.get();
    expect(b.news[0]?.provider).toBe("Fallback");
    expect(b.bestStock.source).toBe("Fallback");
  });
});
