// Free-tier LLM provider chain for briefs: Groq → OpenRouter (`openrouter/free`
// auto-routes to whichever free model is up) → caller's deterministic fallback.
// Server-side only, server env keys only. Bring-your-own-key requests never
// come here: the browser calls the provider directly (src/lib/llmClient.ts),
// so a user's key never touches this server.

export type LlmProvider = "groq" | "openrouter";

interface ProviderConfig {
  id: LlmProvider;
  url: string;
  key: string | undefined;
  model: string;
  /** Whether the provider reliably supports `response_format: json_object` (OpenRouter's free router doesn't). */
  supportsJsonMode: boolean;
  extraHeaders?: Record<string, string>;
}

export interface LlmResult {
  provider: LlmProvider;
  model: string;
  text: string;
}

export interface LlmRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
  /** Ask the provider for a JSON object. Only for prompts that tell the model to answer in JSON. */
  json?: boolean;
  /** Total time across all providers; callers must fit inside their function's maxDuration. */
  budgetMs?: number;
}

const PER_CALL_MS = 12_000;
const DEFAULT_BUDGET_MS = 15_000;

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Start of the provider's error body (never contains our key), so a 400 explains itself in the logs. */
    readonly detail = ""
  ) {
    super(detail ? `${message}: ${detail}` : message);
  }
}

/** gpt-oss models reason before answering; keep that short so the budgeted answer isn't eaten by it. */
const isReasoningModel = (model: string) => /gpt-oss/i.test(model);

/** Model picked by discovery after the configured/default one 404'd; lives for this instance. */
let groqModel: string | undefined;

/** Best-first. Small and fast chat models first: briefs are short. */
// Plain chat models before reasoning models (gpt-oss): reasoning tokens count against max_tokens, and the
// short briefs here budget only a few hundred.
const GROQ_PREFERRED = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "openai/gpt-oss-20b", "openai/gpt-oss-120b"];
const GROQ_NOT_CHAT = /whisper|guard|tts|orpheus|embed|playai|compound|safeguard|vision-preview|moderation/i;

/** Chooses a chat model from Groq's /models list (ids only; pure, so it is testable). */
export const pickGroqModel = (ids: string[]): string | undefined => {
  const chat = ids.filter((id) => !GROQ_NOT_CHAT.test(id));
  return GROQ_PREFERRED.find((id) => chat.includes(id)) ?? chat.find((id) => /llama|gpt-oss|qwen|gemma|mixtral/i.test(id)) ?? chat[0];
};

const discoverGroqModel = async (key: string, timeoutMs: number): Promise<string | undefined> => {
  const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) return undefined;
  const data = (await res.json()) as { data?: { id?: string }[] };
  return pickGroqModel((data.data ?? []).map((m) => m.id ?? "").filter(Boolean));
};

const providers = (): ProviderConfig[] => [
  {
    id: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || groqModel || "llama-3.1-8b-instant",
    supportsJsonMode: true
  },
  {
    id: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || "openrouter/free",
    supportsJsonMode: false,
    extraHeaders: { "HTTP-Referer": "https://github.com/WickTech/Atlas", "X-Title": "Atlas" }
  }
];

// One deadline covers the request AND the body read. OpenRouter's free router
// sends response headers early and holds the body until generation finishes, so
// a timer that stops at the headers (fetchWithTimeout) leaves `res.json()` hanging
// past the function limit and the caller 504s instead of using its fallback.
const callProvider = async (p: ProviderConfig, key: string, req: LlmRequest, timeoutMs: number, jsonMode = !!req.json): Promise<LlmResult> => {
  const signal = AbortSignal.timeout(timeoutMs);
  const res = await fetch(p.url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...p.extraHeaders },
    body: JSON.stringify({
      model: p.model,
      temperature: 0.3,
      max_tokens: req.maxTokens ?? 700,
      ...(jsonMode && p.supportsJsonMode ? { response_format: { type: "json_object" } } : {}),
      ...(isReasoningModel(p.model) ? { reasoning_effort: "low" } : {}),
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt }
      ]
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HttpError(`${p.id} ${res.status}`, res.status, body.replace(/\s+/g, " ").slice(0, 200));
  }
  const data = (await res.json()) as { model?: string; choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${p.id} empty completion`);
  return { provider: p.id, model: data.model || p.model, text };
};

/** Tries each configured provider in order. Null when none is configured or all fail. */
export const complete = async (req: LlmRequest): Promise<LlmResult | null> => {
  const deadline = Date.now() + (req.budgetMs ?? DEFAULT_BUDGET_MS);
  for (const p of providers()) {
    const key = p.key;
    if (!key) continue;
    const remaining = deadline - Date.now();
    if (remaining < 500) break;
    try {
      const budget = () => Math.min(PER_CALL_MS, deadline - Date.now());
      // A model/endpoint that rejects JSON mode (400) can still answer; parseJsonLoose copes with plain JSON text.
      const attempt = async (provider: ProviderConfig) => {
        try {
          return await callProvider(provider, key, req, budget());
        } catch (err) {
          if (!(err instanceof HttpError) || err.status !== 400 || !req.json || !provider.supportsJsonMode || deadline - Date.now() < 1500) throw err;
          console.warn(`[llm] ${provider.id} rejected JSON mode (${err.detail || "400"}); retrying without it`);
          return await callProvider(provider, key, req, budget(), false);
        }
      };
      try {
        return await attempt(p);
      } catch (err) {
        // The configured or default Groq model is gone for this key (404): list what the key can
        // use, switch to a suitable chat model, retry once within the budget, and remember it
        // only once it has actually answered.
        if (p.id !== "groq" || !(err instanceof HttpError) || err.status !== 404 || process.env.GROQ_MODEL) throw err;
        const left = deadline - Date.now();
        const found = left > 1500 ? await discoverGroqModel(key, Math.min(4000, left - 1000)) : undefined;
        if (!found || found === p.model) throw err;
        console.warn(`[llm] groq model ${p.model} returned 404; trying ${found}`);
        const result = await attempt({ ...p, model: found });
        groqModel = found;
        return result;
      }
    } catch (err) {
      // rate limit / outage / bad key / timeout -> next provider. Log the reason
      // (never the key) so a silent rule-based fallback is diagnosable in Vercel logs.
      console.warn(`[llm] ${p.id} failed: ${err instanceof Error ? `${err.name}: ${err.message}` : "unknown"}`);
    }
  }
  return null;
};

/** Tolerant JSON extraction: strips code fences, falls back to the first {...} block. */
export const parseJsonLoose = <T = unknown>(text: string | null | undefined): T | null => {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
};
