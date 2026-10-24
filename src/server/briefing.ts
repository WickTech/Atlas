// AI news briefing, served separately from /api/metrics so a slow free-tier model
// never delays the main payload. Cached per headline set; concurrent callers share
// one LLM call; a failed or rule-based answer is only remembered briefly so the
// model is retried soon without being hammered.
import { createHash } from "node:crypto";

import type { Briefs } from "@/types/metrics";

import { generateBriefs } from "./briefs";
import { metricsCache } from "./metricsCache";
import { createLru } from "./rateLimit";

const AI_TTL_MS = 30 * 60_000;
const FAILURE_TTL_MS = 90_000;
/** Total LLM time; the route's maxDuration (30 s) also has to cover a cold metrics fetch. */
export const BRIEFING_BUDGET_MS = 18_000;

const good = createLru<Briefs>(4, AI_TTL_MS);
const failed = createLru<Briefs>(4, FAILURE_TTL_MS);
const inflight = new Map<string, Promise<Briefs>>();

/** Same top headlines => same briefing, so the digest is the cache key. */
const digest = (titles: string[]) => createHash("sha1").update(titles.join("\n")).digest("hex").slice(0, 16);

export const getBriefing = async (): Promise<Briefs> => {
  const { data } = await metricsCache.get();
  const key = digest(data.news.slice(0, 40).map((n) => n.title ?? ""));

  const hit = good.get(key) ?? failed.get(key);
  if (hit) return hit;

  let pending = inflight.get(key);
  if (!pending) {
    pending = generateBriefs(data.news, BRIEFING_BUDGET_MS)
      .then((b) => {
        (b.source === "rule-based" ? failed : good).set(key, b);
        return b;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
};
