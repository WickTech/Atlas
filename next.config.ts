import type { NextConfig } from "next";

// Every external origin the browser talks to, so the CSP stays an allowlist:
//   connect  basemap styles/tiles (OpenFreeMap, CARTO), USGS quakes (browser-direct),
//            Groq/OpenRouter (bring-your-own-key briefs go straight from the browser)
//   frame    privacy-enhanced YouTube embeds for the live TV layer
//   img      publisher thumbnails and TfL camera stills come from arbitrary hosts, hence https:
// Next.js's inline bootstrap scripts and MapLibre's inline styles need 'unsafe-inline'; a
// nonce would force every page to render dynamically and lose the static shell. Next's
// dev server also needs 'unsafe-eval' (React debugging), so the CSP is production-only.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://tiles.openfreemap.org https://*.cartocdn.com https://earthquake.usgs.gov https://api.groq.com https://openrouter.ai",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // autoplay / encrypted-media / picture-in-picture stay untouched for the YouTube embeds.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : [])
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  headers: async () => [{ source: "/:path*", headers: securityHeaders }]
};

export default nextConfig;
