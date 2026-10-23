import type { MetadataRoute } from "next";

const SITE = "https://atlas-eight-fawn.vercel.app";

export default function robots(): MetadataRoute.Robots {
  // The API routes are data proxies for the console, not pages worth indexing.
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${SITE}/sitemap.xml` };
}
