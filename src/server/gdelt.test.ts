import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchGdeltJson, fetchGdeltNews, GDELT_TIMEOUT_MS } from "./gdelt";

// A response whose headers arrive but whose request never finishes, like a throttled GDELT.
const hang = (_url: string, init: RequestInit) =>
  new Promise<Response>((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)));

describe("GDELT deadline", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is short, because GDELT is supplementary and must not hold up the metrics refresh", () => {
    expect(GDELT_TIMEOUT_MS).toBeLessThanOrEqual(3000);
  });

  it("gives up on a hanging request at the deadline it is given", async () => {
    vi.stubGlobal("fetch", vi.fn(hang));
    const started = Date.now();
    await expect(fetchGdeltJson("https://gdelt.example/doc", 150)).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(1500);
  });

  it("rejects non-JSON bodies served with a 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Please limit requests to one every 5 seconds", { status: 200 })));
    await expect(fetchGdeltJson("https://gdelt.example/doc")).rejects.toThrow(/Non-JSON/);
  });

  it("returns no articles instead of throwing when throttled", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("slow down", { status: 429 })));
    expect(await fetchGdeltNews()).toEqual([]);
  });
});
