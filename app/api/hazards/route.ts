import { jsonWithCache } from "@/lib/http";
import { createCache } from "@/server/cache";
import { fetchHazards } from "@/server/live";

export const dynamic = "force-dynamic";

// Natural hazards change on the scale of hours; GDACS can hang, so a warm
// instance answers from memory and the CDN shields the upstreams.
const cache = createCache(fetchHazards, 10 * 60_000);

export async function GET() {
  const { data } = await cache.get();
  return jsonWithCache(data, 600, 3600);
}
