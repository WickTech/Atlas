# Atlas 🌍

A full-stack **world news & market-sentiment** dashboard:

- **Backend**: Node.js + Express REST API + SSE stream (for local development)
- **Frontend**: React + Vite + Tailwind CSS + Chart.js (light/dark themes)
- **Deployment**: Vercel static frontend + serverless `/api/*` endpoints
- **Live data**:
  - **GDELT** (free, no key) — high-volume global news + tone + country
  - **Alpha Vantage** — rich per-article sentiment (score/label, topics, ticker sentiment) + top stock
  - **CoinGecko** (free, no key) — supporting crypto-market context

## Features

- News & sentiment-first layout: searchable/filterable global news feed with
  per-article sentiment chips, timestamps, summaries, topics and ticker tags.
- Sentiment overview: market-mood gauge, distribution doughnut, sentiment trend,
  top mentioned tickers (click a ticker to drill down).
- KPI strip with deltas + sparklines (market cap, dominance, volume, active markets).
- Asset drill-down drawer: price, 24h/7d change, volume, mini chart + related news.
- Market context section: Bitcoin price with 24h / 7d / 30d range toggle, top coins
  (click to drill down), dominance, best-performing stock.
- Light/dark theme (persisted, respects OS preference).
- Resilient: every source self-falls-back, and the last good news feed is retained
  through transient upstream gaps so the dashboard never goes blank.

## Project structure

```
api/                  # Vercel serverless functions
backend/              # Local Express backend
frontend/             # React app
shared/               # Shared data generators
```

## Run locally

### 1) Start backend

```bash
cd backend
npm install
npm start
```

Backend runs on `http://localhost:5000` and serves `/api/metrics`.

### 2) Start frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Live finance + world news data

The app requests real-time-ish market and news data from Alpha Vantage and merges it into `/api/metrics`:

- Best performing stock (symbol, change %, price, volume)
- News list for world/financial markets (shown in dashboard corner)

### Configure API key

Set this env var in local shell and in Vercel project settings:

```bash
ALPHA_VANTAGE_API_KEY=your_key_here
```

If the key is missing or rate-limited, GDELT still supplies the global news feed and
the UI shows safe fallback values for the Alpha-Vantage-only fields.

GDELT requires **no API key**. Optional tuning env vars:

```bash
GDELT_QUERY="(economy OR markets OR finance OR geopolitics)"  # GDELT search query
METRICS_TTL_MS=300000   # snapshot cache TTL (raise in prod to ease rate limits)
```

## Deploy on Vercel

1. Push this repository to GitHub.
2. In Vercel, create a **New Project** and import the repo.
3. Leave the **Root Directory** as the repository root.
4. Vercel uses `vercel.json`:
   - Install command: `npm install --prefix frontend`
   - Build command: `npm run build --prefix frontend`
   - Output directory: `frontend/dist`
5. In Vercel → Project Settings → Environment Variables, add:
   - `ALPHA_VANTAGE_API_KEY`
6. Deploy.

After deploy:

- Frontend is served from Vercel static hosting.
- API endpoints are served by Vercel serverless functions:
  - `/api/health`
  - `/api/metrics`

### Optional frontend environment variable

Use this only when frontend should call a different backend URL:

```bash
VITE_API_URL=https://your-api.example.com
```

By default:

- Local dev frontend calls `http://localhost:5000`
- Production frontend calls same-origin `/api/metrics` (Vercel functions)
