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
  /** OpenRouter's free router doesn't guarantee json_object support everywhere. */
  jsonMode: boolean;
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
  /** Total time across all providers; callers must fit inside their function's maxDuration. */
  budgetMs?: number;
}

const PER_CALL_MS = 12_000;
const DEFAULT_BUDGET_MS = 15_000;

const providers = (): ProviderConfig[] => [
  {
    id: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    jsonMode: true
  },
  {
    id: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || "openrouter/free",
    jsonMode: false,
    extraHeaders: { "HTTP-Referer": "https://github.com/WickTech/Atlas", "X-Title": "Atlas" }
  }
];

// One deadline covers the request AND the body read. OpenRouter's free router
// sends response headers early and holds the body until generation finishes, so
// a timer that stops at the headers (fetchWithTimeout) leaves `res.json()` hanging
// past the function limit and the caller 504s instead of using its fallback.
const callProvider = async (p: ProviderConfig, key: string, req: LlmRequest, timeoutMs: number): Promise<LlmResult> => {
  const signal = AbortSignal.timeout(timeoutMs);
  const res = await fetch(p.url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...p.extraHeaders },
    body: JSON.stringify({
      model: p.model,
      temperature: 0.3,
      max_tokens: req.maxTokens ?? 700,
      ...(p.jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`${p.id} ${res.status}`);
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
      return await callProvider(p, key, req, Math.min(PER_CALL_MS, remaining));
    } catch {
      // rate limit / outage / bad key / timeout -> next provider
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
