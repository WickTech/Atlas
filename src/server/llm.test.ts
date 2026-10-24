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
    expect(pickGroqModel(["whisper-large-v3", "llama-3.3-70b-versatile", "openai/gpt-oss-20b"])).toBe("openai/gpt-oss-20b");
    expect(pickGroqModel(["llama-3.1-8b-instant", "openai/gpt-oss-20b"])).toBe("llama-3.1-8b-instant");
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
    expect(sentModel(fetchMock, 2)).toBe("openai/gpt-oss-20b");
    await fresh(REQ);
    expect(sentModel(fetchMock, 3)).toBe("openai/gpt-oss-20b"); // remembered: no new discovery
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
