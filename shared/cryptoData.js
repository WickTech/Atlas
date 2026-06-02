// Live market data from CoinGecko's public API (no key required). Each fetcher
// degrades to a safe fallback so a rate-limit or outage never breaks the stream.
const COINGECKO_BASE = process.env.COINGECKO_BASE || "https://api.coingecko.com/api/v3";

const fetchJson = async (url) => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
};

const round = (value, dp = 2) => {
  const num = Number(value);
  return Number.isFinite(num) ? Number(num.toFixed(dp)) : null;
};

// Global market overview -> stat cards + dominance pie.
const fetchGlobalMarket = async () => {
  try {
    const { data } = await fetchJson(`${COINGECKO_BASE}/global`);
    const dom = data.market_cap_percentage || {};
    const btc = round(dom.btc, 1) ?? 0;
    const eth = round(dom.eth, 1) ?? 0;
    const others = round(100 - btc - eth, 1);

    return {
      cards: {
        marketCap: round(data.total_market_cap?.usd, 0),
        volume24h: round(data.total_volume?.usd, 0),
        btcDominance: btc,
        activeCoins: data.active_cryptocurrencies ?? null,
        markets: data.markets ?? null,
        marketCapChange24h: round(data.market_cap_change_percentage_24h_usd, 2)
      },
      dominance: {
        labels: ["Bitcoin", "Ethereum", "Others"],
        values: [btc, eth, others]
      }
    };
  } catch (_error) {
    return {
      cards: {
        marketCap: null,
        volume24h: null,
        btcDominance: null,
        activeCoins: null,
        markets: null,
        marketCapChange24h: null
      },
      dominance: { labels: ["Bitcoin", "Ethereum", "Others"], values: [50, 18, 32] }
    };
  }
};

// Top coins by market cap -> bar chart + per-coin detail for drill-down.
const fetchTopCoins = async () => {
  try {
    const list = await fetchJson(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=6&page=1&sparkline=true&price_change_percentage=24h`
    );
    if (!Array.isArray(list) || !list.length) throw new Error("No coins returned");
    return {
      labels: list.map((c) => (c.symbol || "").toUpperCase()),
      // Market cap in billions for readable axis values.
      marketCaps: list.map((c) => round(c.market_cap / 1e9, 1)),
      // Per-coin detail keyed for the AssetDetailDrawer drill-down.
      coins: list.map((c) => ({
        id: c.id,
        symbol: (c.symbol || "").toUpperCase(),
        name: c.name,
        image: c.image || null,
        price: round(c.current_price, 2),
        marketCap: round(c.market_cap / 1e9, 1),
        priceChange24h: round(c.price_change_percentage_24h, 2),
        volume: round(c.total_volume, 0),
        // Downsample 7d sparkline (~168 hourly points) to keep the payload small.
        sparkline: Array.isArray(c.sparkline_in_7d?.price)
          ? c.sparkline_in_7d.price.filter((_, i) => i % 6 === 0).map((p) => round(p, 0))
          : []
      }))
    };
  } catch (_error) {
    return {
      labels: ["BTC", "ETH", "USDT", "BNB"],
      marketCaps: [1300, 420, 110, 90],
      coins: [
        { id: "bitcoin", symbol: "BTC", name: "Bitcoin", image: null, price: 66000, marketCap: 1300, priceChange24h: 1.2, volume: 35000000000, sparkline: [] },
        { id: "ethereum", symbol: "ETH", name: "Ethereum", image: null, price: 3400, marketCap: 420, priceChange24h: -0.8, volume: 18000000000, sparkline: [] },
        { id: "tether", symbol: "USDT", name: "Tether", image: null, price: 1, marketCap: 110, priceChange24h: 0.0, volume: 50000000000, sparkline: [] },
        { id: "binancecoin", symbol: "BNB", name: "BNB", image: null, price: 590, marketCap: 90, priceChange24h: 0.5, volume: 1500000000, sparkline: [] }
      ]
    };
  }
};

const toSeries = (prices, labelFn) => ({
  labels: prices.map(([ts]) => labelFn(ts)),
  prices: prices.map(([, price]) => round(price, 0))
});

const dayLabel = (ts) =>
  new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const hourLabel = (ts) =>
  new Date(ts).toLocaleTimeString("en-US", { hour: "numeric" });

// Bitcoin price across selectable ranges -> line chart with 24h / 7d / 30d toggle.
// Fetches a 30d daily series once (sliced for 7d) plus a 1d hourly series.
const fetchBtcSeries = async () => {
  const fallback = {
    d1: { labels: ["00:00", "06:00", "12:00", "18:00", "now"], prices: [65200, 65600, 64800, 65400, 66000] },
    d7: { labels: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"], prices: [61000, 62500, 60800, 63400, 65100, 64200, 66000] },
    d30: { labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"], prices: [58000, 60500, 63000, 66000] }
  };

  try {
    const [hourly, monthly] = await Promise.all([
      fetchJson(`${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=1`),
      fetchJson(`${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily`)
    ]);

    const d30Prices = Array.isArray(monthly?.prices) ? monthly.prices : [];
    if (!d30Prices.length) throw new Error("No price series");

    // 1d: downsample hourly points (~288 at 5-min granularity) to a readable count.
    const hourPrices = Array.isArray(hourly?.prices) ? hourly.prices : [];
    const d1Prices = hourPrices.filter((_, i) => i % 4 === 0);

    return {
      d1: d1Prices.length ? toSeries(d1Prices, hourLabel) : fallback.d1,
      d7: toSeries(d30Prices.slice(-7), dayLabel),
      d30: toSeries(d30Prices, dayLabel)
    };
  } catch (_error) {
    return fallback;
  }
};

module.exports = { fetchGlobalMarket, fetchTopCoins, fetchBtcSeries };
