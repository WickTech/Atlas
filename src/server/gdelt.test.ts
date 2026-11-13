import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchGdeltJson, fetchGdeltNews, GDELT_TIMEOUT_MS, toArticle } from "./gdelt";
import { safeHttpUrl } from "./safeUrl";

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

describe("GDELT URL scheme validation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts only absolute http(s) URLs", () => {
    expect(safeHttpUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHttpUrl("http://example.com/a")).toBe("http://example.com/a");
    for (const bad of ["javascript:alert(1)", " JavaScript:alert(1)", "data:text/html,x", "//example.com", "/relative", "", null, 5]) {
      expect(safeHttpUrl(bad)).toBeNull();
    }
  });

  it("drops a non-http bannerImage", () => {
    const a = toArticle({ url: "https://example.com/a", title: "t", socialimage: "javascript:alert(1)" });
    expect(a.bannerImage).toBeNull();
    expect(a.url).toBe("https://example.com/a");
  });

  it("drops articles whose link is not http(s)", async () => {
    const articles = [
      { url: "javascript:alert(1)", title: "evil" },
      { url: "https://example.com/ok", title: "ok" }
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ articles }), { status: 200 })));
    const out = await fetchGdeltNews();
    expect(out.map((a) => a.title)).toEqual(["ok"]);
  });
});
