import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BriefInput } from "./brief";
import { clearByok, loadByok, maskKey, requestBrief, saveByok } from "./llmClient";

// Deliberately fake and low-entropy so secret scanners never mistake fixtures for credentials.
const FAKE_KEY = "fake-test-key";

const INPUT: BriefInput = { subject: "India", kind: "country", facts: ["risk 83/100"], headlines: [{ title: "A headline", source: "BBC" }] };
const completion = (content: string, model = "m") => Response.json({ model, choices: [{ message: { content } }] });

const memoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  };
};

describe("BYOK storage", () => {
  beforeEach(() => vi.stubGlobal("window", { localStorage: memoryStorage() }));
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips a config and clears it", () => {
    expect(saveByok({ provider: "groq", key: FAKE_KEY })).toBe(true);
    expect(loadByok()).toEqual({ provider: "groq", key: FAKE_KEY });
    clearByok();
    expect(loadByok()).toBeNull();
  });

  it("rejects malformed stored values", () => {
    const ls = (window as unknown as { localStorage: ReturnType<typeof memoryStorage> }).localStorage;
    ls.setItem("atlas-byok", "{not json");
    expect(loadByok()).toBeNull();
    ls.setItem("atlas-byok", JSON.stringify({ provider: "other", key: "x" }));
    expect(loadByok()).toBeNull();
    ls.setItem("atlas-byok", JSON.stringify({ provider: "groq", key: "" }));
    expect(loadByok()).toBeNull();
  });

  it("copes with storage that throws", () => {
    const throwing = () => {
      throw new Error("blocked");
    };
    vi.stubGlobal("window", { localStorage: { getItem: throwing, setItem: throwing, removeItem: throwing } });
    expect(loadByok()).toBeNull();
    expect(saveByok({ provider: "groq", key: "k" })).toBe(false);
    expect(() => clearByok()).not.toThrow();
  });
});

describe("maskKey", () => {
  it("shows only the last four characters", () => {
    expect(maskKey("fake-long-test-key-1234")).toBe("••••1234");
    expect(maskKey("short")).toBe("••••");
  });
});

describe("requestBrief", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("with a key, calls the provider directly and never touches /api/brief", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion("  A brief.  ", "llama"));
    vi.stubGlobal("fetch", fetchMock);
    const out = await requestBrief(INPUT, { provider: "groq", key: FAKE_KEY });
    expect(out).toMatchObject({ text: "A brief.", provider: "groq", model: "llama", byok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${FAKE_KEY}`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses a custom model when one is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion("ok"));
    vi.stubGlobal("fetch", fetchMock);
    await requestBrief(INPUT, { provider: "openrouter", key: "k", model: " my/model:free " });
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string).model).toBe("my/model:free");
  });

  it.each([401, 403])("reports a rejected key on %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status })));
    await expect(requestBrief(INPUT, { provider: "groq", key: "bad" })).rejects.toThrow(/rejected the key/);
  });

  it("surfaces other provider errors and empty completions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("x", { status: 500 })).mockResolvedValueOnce(completion("   ")));
    await expect(requestBrief(INPUT, { provider: "groq", key: "k" })).rejects.toThrow(/error 500/);
    await expect(requestBrief(INPUT, { provider: "groq", key: "k" })).rejects.toThrow(/empty completion/);
  });

  it("without a key, posts to /api/brief and returns its result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ text: "server brief", provider: "openrouter" }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await requestBrief(INPUT, null);
    expect(out).toMatchObject({ text: "server brief", byok: false });
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe("/api/brief");
  });

  it("without a key, surfaces the server's error message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "rate limited — try again shortly" }, { status: 429 })));
    await expect(requestBrief(INPUT, null)).rejects.toThrow("rate limited");
  });
});
