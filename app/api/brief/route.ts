import type { NextRequest } from "next/server";

import { BRIEF_SYSTEM, briefKey, buildBriefPrompt, ruleBasedBrief, sanitizeBriefInput, type BriefResult } from "@/lib/brief";
import { complete } from "@/server/llm";
import { createLru, createRateLimiter } from "@/server/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MAX_BODY_BYTES = 8_000;
const limiter = createRateLimiter(8, 60_000); // per IP per minute
const cache = createLru<BriefResult>(200, 15 * 60_000);

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "request too large" }, 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const input = sanitizeBriefInput(parsed);
  if (!input) return json({ error: "subject, kind and at least one fact or headline are required" }, 400);

  const key = briefKey(input);
  const hit = cache.get(key);
  if (hit) return json({ ...hit, cached: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = limiter(ip);
  if (!rl.ok) return json({ error: "rate limited — try again shortly" }, 429, { "Retry-After": String(rl.retryAfterS) });

  const llm = await complete({ system: BRIEF_SYSTEM, prompt: buildBriefPrompt(input), maxTokens: 320 });
  const result: BriefResult = llm?.text.trim()
    ? { text: llm.text.trim(), provider: llm.provider, model: llm.model }
    : { text: ruleBasedBrief(input), provider: "rule-based" };
  cache.set(key, result);
  return json(result);
}
