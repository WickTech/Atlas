// CDN cache policy helpers for route handlers. `s-maxage` lets Vercel's edge
// serve one upstream fetch to every visitor; `stale-while-revalidate` keeps
// responses instant while a background refresh runs — the main defence for
// rate-limited public feeds (GDELT 429s, Alpha Vantage ~25/day).
export const cacheHeaders = (sMaxAge: number, swr = sMaxAge * 5): HeadersInit => ({
  "Cache-Control": `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`
});

export const jsonWithCache = (data: unknown, sMaxAge: number, swr?: number, init: ResponseInit = {}) =>
  Response.json(data, { ...init, headers: { ...cacheHeaders(sMaxAge, swr), ...init.headers } });
