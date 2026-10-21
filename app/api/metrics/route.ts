import { jsonWithCache } from "@/lib/http";
import { metricsCache } from "@/server/metricsCache";

// Cold fetch fans out to ~14 upstream calls plus an LLM brief.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, fetchedAt } = await metricsCache.get();
    return jsonWithCache(data, 60, 300, { headers: { "X-Atlas-Fetched-At": new Date(fetchedAt).toISOString() } });
  } catch {
    return Response.json({ error: "Upstream sources unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
