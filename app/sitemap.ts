import type { MetadataRoute } from "next";

// One page: every view is a query string on the same console.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://atlas-eight-fawn.vercel.app/", changeFrequency: "hourly", priority: 1 }];
}
