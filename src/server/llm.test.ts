import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { complete } from "./llm";

const REQ = { system: "s", prompt: "p" };
const ok = (content: string) => Response.json({ model: "m", choices: [{ message: { content } }] });

// A response whose headers arrive immediately but whose body never completes,
// like OpenRouter's free router while it is still generating.
const hangingBody = (signal: AbortSignal) =>
  new Response(
    new ReadableStream({
      start(controller) {
        signal.addEventListener("abort", () => controller.error(signal.reason));
      }
    })
  );

describe("complete", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns null without calling out when no key is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await complete(REQ)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the first configured provider's text", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok("hello")));
    expect(await complete(REQ)).toEqual({ provider: "openrouter", model: "m", text: "hello" });
  });

  it("falls through to the next provider on an error status", async () => {
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("OPENROUTER_API_KEY", "o");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("no", { status: 429 })).mockResolvedValueOnce(ok("from openrouter"));
    vi.stubGlobal("fetch", fetchMock);
    const out = await complete(REQ);
    expect(out?.provider).toBe("openrouter");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up inside the budget when the body never finishes", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "o");
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => Promise.resolve(hangingBody(init.signal as AbortSignal))));
    const started = Date.now();
    expect(await complete({ ...REQ, budgetMs: 800 })).toBeNull();
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("does not start another provider once the budget is spent", async () => {
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("OPENROUTER_API_KEY", "o");
    const fetchMock = vi.fn((_url: string, init: RequestInit) => Promise.resolve(hangingBody(init.signal as AbortSignal)));
    vi.stubGlobal("fetch", fetchMock);
    expect(await complete({ ...REQ, budgetMs: 900 })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
