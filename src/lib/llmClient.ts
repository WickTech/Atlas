"use client";

// Browser side of AI briefs. With a user-supplied key (BYOK) the browser calls
// the provider directly — Groq and OpenRouter both allow CORS — so the key
// never reaches Atlas's server, logs or CDN. Without one, /api/brief uses the
// server's free-tier keys (rate-limited, cached).
import { BRIEF_SYSTEM, buildBriefPrompt, type BriefInput, type BriefResult } from "./brief";

export type ByokProvider = "groq" | "openrouter";

export interface ByokConfig {
  provider: ByokProvider;
  key: string;
  model?: string;
}

const STORAGE_KEY = "atlas-byok";

const ENDPOINTS: Record<ByokProvider, { url: string; model: string }> = {
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.1-8b-instant" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", model: "openrouter/free" }
};

export const loadByok = (): ByokConfig | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<ByokConfig>) : null;
    return v && (v.provider === "groq" || v.provider === "openrouter") && typeof v.key === "string" && v.key ? (v as ByokConfig) : null;
  } catch {
    return null;
  }
};

export const saveByok = (cfg: ByokConfig): boolean => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    return true;
  } catch {
    return false; // storage blocked: key stays in memory for this session only
  }
};

export const clearByok = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing stored
  }
};

/** Last 4 characters only, for display. */
export const maskKey = (key: string) => (key.length > 8 ? `••••${key.slice(-4)}` : "••••");

const direct = async (input: BriefInput, cfg: ByokConfig, signal?: AbortSignal): Promise<BriefResult> => {
  const ep = ENDPOINTS[cfg.provider];
  const model = cfg.model?.trim() || ep.model;
  const res = await fetch(ep.url, {
    method: "POST",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.key}`,
      ...(cfg.provider === "openrouter" ? { "X-Title": "Atlas" } : {})
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 320,
      messages: [
        { role: "system", content: BRIEF_SYSTEM },
        { role: "user", content: buildBriefPrompt(input) }
      ]
    })
  });
  if (res.status === 401 || res.status === 403) throw new Error(`${cfg.provider} rejected the key (${res.status})`);
  if (!res.ok) throw new Error(`${cfg.provider} error ${res.status}`);
  const data = (await res.json()) as { model?: string; choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${cfg.provider} returned an empty completion`);
  return { text, provider: cfg.provider, model: data.model ?? model };
};

export const requestBrief = async (input: BriefInput, byok: ByokConfig | null, signal?: AbortSignal): Promise<BriefResult & { byok: boolean }> => {
  if (byok) return { ...(await direct(input, byok, signal)), byok: true };
  const res = await fetch("/api/brief", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const data = (await res.json()) as BriefResult & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `brief failed (${res.status})`);
  return { ...data, byok: false };
};
