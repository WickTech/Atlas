import { jsonWithCache } from "@/lib/http";
import { createCache } from "@/server/cache";
import { fetchCctv } from "@/server/live";

export const dynamic = "force-dynamic";

// The camera *list* changes rarely (stills refresh client-side straight from TfL's CDN).
const cache = createCache(fetchCctv, 60 * 60_000);

export async function GET() {
  const { data } = await cache.get();
  return jsonWithCache(data, 3600, 86400);
}
