# Security

## Reporting a vulnerability

Please report it privately through GitHub's **Report a vulnerability** button on the repository's Security tab. Please don't open a public issue for it.

## Hardening in place

- Response headers on every route: a Content-Security-Policy that allowlists only the origins the browser needs (see `next.config.ts`), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`. HSTS comes from Vercel. `e2e/smoke.spec.ts` fails if the app trips its own CSP.
- Secret scanning (gitleaks) and static analysis (Semgrep) run in `security.yml`. Dependabot proposes updates weekly, after a one-week cooldown.
- `npm run audit:gate` (run in CI) fails on any high or critical advisory in production dependencies unless it is listed, with a reason and a review date, in `scripts/audit-gate.mjs`.
- Bring-your-own LLM keys are used only in the browser (straight to Groq/OpenRouter) and stored in localStorage. They never reach this server. Server keys are Vercel environment variables.

## Known accepted risk

**maplibre-gl, GHSA-jrc7-96c5-q579** (DOM sanitizer bypass, rated critical, affects every version up to 6.4.0 including the pinned 5.24).

- The sanitizer runs only on map attribution HTML, which comes from the basemap style (OpenFreeMap / CARTO). Atlas never calls `Popup`, `setHTML` or any other API that passes user or feed content to it.
- There is no fix on 5.x. MapLibre 6 removed the public `map.transform` that deck.gl 9.4's `MapboxOverlay` reads, so it can't be adopted yet.
- Accepted until 2027-01-31 in `scripts/audit-gate.mjs`. Revisit as soon as deck.gl supports MapLibre 6.
