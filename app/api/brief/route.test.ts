import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const complete = vi.fn();
vi.mock("@/server/llm", () => ({ complete: (...args: unknown[]) => complete(...args) }));

// The route keeps its cache and rate limiter at module scope, so each test
// loads a fresh copy.
const load = async () => {
  vi.resetModules();
  return (await import("./route")).POST;
};

let n = 0;
const body = (over: Record<string, unknown> = {}) => ({
  subject: `Region ${++n}`,
  kind: "area",
  facts: ["M6.1 earthquake, 10 km deep (USGS)"],
  headlines: [{ title: "Rescue teams reach villages", source: "BBC" }],
  ...over
});
const post = (POST: Awaited<ReturnType<typeof load>>, payload: unknown, ip = "1.2.3.4") =>
  POST(new NextRequest("http://localhost/api/brief", { method: "POST", body: typeof payload === "string" ? payload : JSON.stringify(payload), headers: { "x-forwarded-for": ip } }));

describe("POST /api/brief", () => {
  beforeEach(() => complete.mockReset());

  it("rejects invalid JSON, unusable input and oversized bodies without calling the LLM", async () => {
    const POST = await load();
    expect((await post(POST, "{nope")).status).toBe(400);
    expect((await post(POST, { subject: "x", kind: "planet", facts: ["a"] })).status).toBe(400);
    expect((await post(POST, { subject: "x", kind: "area" })).status).toBe(400);
    expect((await post(POST, "x".repeat(9000))).status).toBe(413);
    expect(complete).not.toHaveBeenCalled();
  });

  it("returns the LLM text with provider and model, and never caches at the CDN", async () => {
    complete.mockResolvedValue({ provider: "openrouter", model: "m", text: "  An AI brief.  " });
    const res = await (await load())(new NextRequest("http://localhost/api/brief", { method: "POST", body: JSON.stringify(body()) }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ text: "An AI brief.", provider: "openrouter", model: "m" });
  });

  it("falls back to the rule-based brief when no provider answers", async () => {
    complete.mockResolvedValue(null);
    const res = await post(await load(), body());
    expect(await res.json()).toMatchObject({ provider: "rule-based" });
  });

  it("serves a repeat of the same input from cache without another LLM call", async () => {
    complete.mockResolvedValue({ provider: "groq", model: "m", text: "once" });
    const POST = await load();
    const payload = body();
    await post(POST, payload);
    const again = await (await post(POST, payload)).json();
    expect(again).toMatchObject({ text: "once", cached: true });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("rate limits one IP after 8 uncached requests a minute but not a different IP", async () => {
    complete.mockResolvedValue({ provider: "groq", model: "m", text: "ok" });
    const POST = await load();
    for (let i = 0; i < 8; i++) expect((await post(POST, body(), "9.9.9.9")).status).toBe(200);
    const limited = await post(POST, body(), "9.9.9.9");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
    expect((await post(POST, body(), "8.8.8.8")).status).toBe(200);
  });
});
