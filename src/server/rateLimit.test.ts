import { describe, expect, it } from "vitest";

import { createLru, createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows `limit` hits per window per key, then reports retry time", () => {
    const rl = createRateLimiter(2, 60_000);
    expect(rl("a", 0).ok).toBe(true);
    expect(rl("a", 1).ok).toBe(true);
    expect(rl("a", 2)).toEqual({ ok: false, retryAfterS: 60 });
    expect(rl("b", 2).ok).toBe(true); // independent key
    expect(rl("a", 60_000).ok).toBe(true); // window reset
  });
});

describe("createLru", () => {
  it("expires by TTL and evicts least-recently-used", () => {
    const c = createLru<number>(2, 1000);
    c.set("a", 1, 0);
    c.set("b", 2, 0);
    expect(c.get("a", 10)).toBe(1); // a is now most recent
    c.set("c", 3, 10); // evicts b
    expect(c.get("b", 10)).toBeUndefined();
    expect(c.get("a", 2000)).toBeUndefined(); // expired
  });
});
