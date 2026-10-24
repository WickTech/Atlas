import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWithTimeout } from "./fetchWithTimeout";

// Headers arrive immediately, the body never finishes: a stalled download of a big feed.
const stalledBody = (signal: AbortSignal) =>
  new Response(new ReadableStream({ start: (c) => signal.addEventListener("abort", () => c.error(signal.reason)) }));

describe("fetchWithTimeout", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("also bounds reading the body, not just waiting for the headers", async () => {
    vi.stubGlobal("fetch", vi.fn((_u: string, init: RequestInit) => Promise.resolve(stalledBody(init.signal as AbortSignal))));
    const started = Date.now();
    const res = await fetchWithTimeout("https://example.test/big.json", {}, 150);
    await expect(res.json()).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(1500);
  });
  it("passes the request through untouched when it finishes in time", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithTimeout("https://example.test/x", { headers: { A: "b" } }, 1000);
    expect(await res.json()).toEqual({ ok: 1 });
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers).toEqual({ A: "b" });
  });
});
