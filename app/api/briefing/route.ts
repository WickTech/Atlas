import { jsonWithCache } from "@/lib/http";
import { getBriefing } from "@/server/briefing";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const briefs = await getBriefing();
    // An AI briefing is stable for a while; the rule-based fallback is retried sooner.
    return briefs.source === "rule-based" ? jsonWithCache(briefs, 90, 300) : jsonWithCache(briefs, 600, 1800);
  } catch {
    return Response.json({ error: "Briefing unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
