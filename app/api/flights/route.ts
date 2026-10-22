import type { NextRequest } from "next/server";

import { jsonWithCache } from "@/lib/http";
import { createKeyedCache } from "@/server/cache";
import { fetchFlights, parseBBox, type BBox } from "@/server/live";

export const dynamic = "force-dynamic";

// Clients send 2°-quantized boxes, so neighbouring pans share keys here and at the CDN.
const cache = createKeyedCache((key: string) => fetchFlights(JSON.parse(key) as BBox), 10_000, 128);

const MAX_SPAN_DEG = 30; // the API answers a ≤250 nm circle; larger boxes would be mostly empty

export async function GET(req: NextRequest) {
  const bbox = parseBBox(req.nextUrl.searchParams.get("bbox"));
  if (!bbox) return Response.json({ error: "bbox=w,s,e,n required" }, { status: 400 });
  if (bbox[2] - bbox[0] > MAX_SPAN_DEG || bbox[3] - bbox[1] > MAX_SPAN_DEG) {
    return Response.json({ error: `bbox span must be ≤ ${MAX_SPAN_DEG}°; zoom in` }, { status: 422 });
  }
  const { data } = await cache.get(JSON.stringify(bbox));
  return jsonWithCache(data, 10, 30);
}
