import { jsonWithCache } from "@/lib/http";
import { createCache } from "@/server/cache";
import { fetchCyber } from "@/server/live";

export const dynamic = "force-dynamic";

const cache = createCache(fetchCyber, 15 * 60_000);

export async function GET() {
  const { data } = await cache.get();
  return jsonWithCache(data, 900, 3600);
}
