import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { complete, pickGroqModel } from "./llm";

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

describe("JSON mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, call = 0) => JSON.parse((fetchMock.mock.calls[call] as [string, RequestInit])[1].body as string);

  it("is only requested when the caller asks for JSON, because Groq rejects it for plain-text prompts", async () => {
    vi.stubEnv("GROQ_API_KEY", "g");
    const fetchMock = vi.fn().mockImplementation(async () => ok("x"));
    vi.stubGlobal("fetch", fetchMock);
    await complete(REQ);
    await complete({ ...REQ, json: true });
    expect(bodyOf(fetchMock, 0).response_format).toBeUndefined();
    expect(bodyOf(fetchMock, 1).response_format).toEqual({ type: "json_object" });
  });
  it("is never sent to OpenRouter's free router", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "o");
    const fetchMock = vi.fn().mockImplementation(async () => ok("x"));
    vi.stubGlobal("fetch", fetchMock);
    await complete({ ...REQ, json: true });
    expect(bodyOf(fetchMock).response_format).toBeUndefined();
  });
});

describe("pickGroqModel", () => {
  it("prefers the small fast chat models, in order", () => {
    expect(pickGroqModel(["whisper-large-v3", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"])).toBe("llama-3.3-70b-versatile");
    expect(pickGroqModel(["openai/gpt-oss-20b", "llama-3.1-8b-instant"])).toBe("llama-3.1-8b-instant");
    // reasoning models only when no plain chat model is available
    expect(pickGroqModel(["whisper-large-v3", "openai/gpt-oss-20b"])).toBe("openai/gpt-oss-20b");
  });
  it("never picks speech, guard, embedding or compound models", () => {
    expect(pickGroqModel(["whisper-large-v3-turbo", "meta-llama/llama-guard-4-12b", "playai-tts", "groq/compound"])).toBeUndefined();
  });
  it("falls back to any recognisable chat family, then to the first usable id", () => {
    expect(pickGroqModel(["whisper-large-v3", "qwen/qwen3-32b"])).toBe("qwen/qwen3-32b");
    expect(pickGroqModel(["some/new-model"])).toBe("some/new-model");
    expect(pickGroqModel([])).toBeUndefined();
  });
});

describe("Groq model discovery", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });
  const modelsResponse = () => Response.json({ data: [{ id: "whisper-large-v3" }, { id: "openai/gpt-oss-20b" }, { id: "llama-3.3-70b-versatile" }] });
  const sentModel = (fetchMock: ReturnType<typeof vi.fn>, call: number) => JSON.parse((fetchMock.mock.calls[call] as [string, RequestInit])[1].body as string).model;

  it("on a 404 lists the key's models, retries with a suitable one, and remembers it", async () => {
    vi.resetModules();
    const { complete: fresh } = await import("./llm");
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("GROQ_MODEL", "");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("model not found", { status: 404 }))
      .mockResolvedValueOnce(modelsResponse())
      .mockResolvedValueOnce(ok("recovered"))
      .mockResolvedValueOnce(ok("second call"));
    vi.stubGlobal("fetch", fetchMock);
    const out = await fresh(REQ);
    expect(out).toMatchObject({ provider: "groq", text: "recovered" });
    expect(sentModel(fetchMock, 0)).toBe("llama-3.1-8b-instant");
    expect(sentModel(fetchMock, 2)).toBe("llama-3.3-70b-versatile");
    await fresh(REQ);
    expect(sentModel(fetchMock, 3)).toBe("llama-3.3-70b-versatile"); // remembered: no new discovery
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("does not override a model the operator set explicitly", async () => {
    vi.resetModules();
    const { complete: fresh } = await import("./llm");
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("GROQ_MODEL", "my-model");
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fresh(REQ)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not go looking for models on other errors, and falls through to the next provider", async () => {
    vi.resetModules();
    const { complete: fresh } = await import("./llm");
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("GROQ_MODEL", "");
    vi.stubEnv("OPENROUTER_API_KEY", "o");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("busy", { status: 429 })).mockResolvedValueOnce(ok("from openrouter"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fresh(REQ)).toMatchObject({ provider: "openrouter" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("Groq error handling", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });
  const body = (fetchMock: ReturnType<typeof vi.fn>, call: number) => JSON.parse((fetchMock.mock.calls[call] as [string, RequestInit])[1].body as string);

  it("retries without JSON mode when Groq answers 400, and still returns the text", async () => {
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("GROQ_MODEL", "some-model");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{"error":{"message":"response_format not supported"}}', { status: 400 })).mockResolvedValueOnce(ok('{"india":"x"}'));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await complete({ ...REQ, json: true })).toMatchObject({ provider: "groq", text: '{"india":"x"}' });
    expect(body(fetchMock, 0).response_format).toEqual({ type: "json_object" });
    expect(body(fetchMock, 1).response_format).toBeUndefined();
  });

  it("puts the provider's error body in the log line so a 400 explains itself", async () => {
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("GROQ_MODEL", "some-model");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":{"message":"max_tokens is too large"}}', { status: 400 })));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await complete(REQ)).toBeNull();
    expect(warn.mock.calls.map((c) => String(c[0])).join("\n")).toMatch(/groq failed: .*groq 400: .*max_tokens is too large/);
  });

  it("asks reasoning (gpt-oss) models to think briefly", async () => {
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");
    const fetchMock = vi.fn().mockResolvedValue(ok("x"));
    vi.stubGlobal("fetch", fetchMock);
    await complete(REQ);
    expect(body(fetchMock, 0).reasoning_effort).toBe("low");
  });

  it("remembers a discovered model only after it has answered", async () => {
    vi.resetModules();
    const { complete: fresh } = await import("./llm");
    vi.stubEnv("GROQ_API_KEY", "g");
    vi.stubEnv("GROQ_MODEL", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("gone", { status: 404 }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: "openai/gpt-oss-20b" }] }))
      .mockResolvedValueOnce(new Response("bad request", { status: 400 })) // the discovered model fails
      .mockResolvedValueOnce(new Response("gone", { status: 404 })) // next call starts again from the default
      .mockResolvedValueOnce(Response.json({ data: [{ id: "openai/gpt-oss-20b" }] }))
      .mockResolvedValueOnce(ok("works"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fresh(REQ)).toBeNull();
    expect(await fresh(REQ)).toMatchObject({ text: "works" });
    expect(body(fetchMock, 3).model).toBe("llama-3.1-8b-instant"); // not stuck on the failed choice
  });
});
