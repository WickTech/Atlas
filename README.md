# Atlas 🌍

Real-time global situational-awareness console — country risk, cross-stream signals, markets and world news on a GPU-rendered globe. Built entirely on free, keyless, open data and deployed as a zero-config Next.js app on Vercel.

**Live:** https://atlas-eight-fawn.vercel.app

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind CSS v4** — Modernist design tokens (ink / red / Archivo, 0 radius) + HUD layer (JetBrains Mono telemetry, glass map overlays)
- **MapLibre GL v6** — WebGL globe, feature-state choropleth, lazy-loaded map chunk + self-hosted tile worker
- **TanStack Query** — polling that pauses in background tabs, exponential backoff, last-good-data retention
- **Vitest** — unit tests for the whole server data pipeline

## Data sources (all free)

| Source | Used for | Key |
| --- | --- | --- |
| Publisher RSS (The Hindu, NDTV, TOI, Mint, ET, BBC, Al Jazeera, DW, France 24, Guardian, NPR, UN News) | News backbone, subject-country tagging | none |
| GDELT DOC 2.0 | Supplementary world news + tone (throttled to 1 req / 5 s per IP, so best-effort) | none |
| Yahoo Finance chart API | India + global markets | none |
| Alpha Vantage | Per-article sentiment, top gainer | optional `ALPHA_VANTAGE_API_KEY` |
| Groq / OpenRouter (`openrouter/free`) | AI briefs, deterministic fallback otherwise | optional `GROQ_API_KEY` / `OPENROUTER_API_KEY` |
| OpenFreeMap (OSM) · CARTO fallback | Vector basemaps | none |

## Architecture

```
app/
  page.tsx               static shell → <Console/> (client)
  api/metrics/route.ts   aggregated payload; CDN cached (s-maxage=60, swr=300)
  api/health/route.ts
src/
  server/                data pipeline: fetchers (all via fetchWithTimeout), RSS parser,
                         country gazetteer, risk index, signals, sentiment, LLM chain, TTL cache
  map/                   MapLibre globe (dynamic import, ssr: false), basemaps, geometry fixes
  components/            HUD (top bar, palette, banner) + console modules
  types/metrics.ts       wire contract shared by server and client
```

Resilience: every upstream self-falls-back; the route coalesces concurrent cold requests into one fetch, serves the last good payload on failure, and keeps the last real news feed if a refresh comes back empty.

## Develop

```bash
npm install
cp .env.example .env.local   # optional keys
npm run dev                  # http://localhost:3000
npm run typecheck && npm run lint && npm test && npm run build
```

Feature concepts adapted from [koala73/worldmonitor](https://github.com/koala73/worldmonitor) (AGPL-3.0) — ideas only, no code copied.
