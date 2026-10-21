// Free-tier LLM provider chain for briefs: Groq → OpenRouter (`openrouter/free`
// auto-routes to whichever free model is up) → caller's deterministic fallback.
// Server-side only: keys come from env, or from a per-request BYOK key that is
// used once and never logged or stored.
import { fetchWithTimeout } from "./fetchWithTimeout";

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
  /** BYOK override — tried first against its provider, never persisted. */
  byok?: { provider: LlmProvider; key: string } | null;
}

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

const callProvider = async (p: ProviderConfig, key: string, req: LlmRequest): Promise<LlmResult> => {
  const res = await fetchWithTimeout(
    p.url,
    {
      method: "POST",
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
    },
    12000
  );
  if (!res.ok) throw new Error(`${p.id} ${res.status}`);
  const data = (await res.json()) as { model?: string; choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${p.id} empty completion`);
  return { provider: p.id, model: data.model || p.model, text };
};

/** Tries BYOK (if any), then each configured provider in order. Null when all fail. */
export const complete = async (req: LlmRequest): Promise<LlmResult | null> => {
  const chain = providers();
  const attempts: [ProviderConfig, string][] = [];
  if (req.byok?.key) {
    const p = chain.find((c) => c.id === req.byok?.provider);
    if (p) attempts.push([p, req.byok.key]);
  }
  for (const p of chain) if (p.key) attempts.push([p, p.key]);

  for (const [p, key] of attempts) {
    try {
      return await callProvider(p, key, req);
    } catch {
      // rate limit / outage / bad key -> next provider
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
