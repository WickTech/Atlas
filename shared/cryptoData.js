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

// Top coins by market cap -> bar chart.
const fetchTopCoins = async () => {
  try {
    const list = await fetchJson(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=4&page=1`
    );
    if (!Array.isArray(list) || !list.length) throw new Error("No coins returned");
    return {
      labels: list.map((c) => (c.symbol || "").toUpperCase()),
      // Market cap in billions for readable axis values.
      marketCaps: list.map((c) => round(c.market_cap / 1e9, 1))
    };
  } catch (_error) {
    return {
      labels: ["BTC", "ETH", "USDT", "BNB"],
      marketCaps: [1300, 420, 110, 90]
    };
  }
};

// Bitcoin 7-day daily price -> line chart.
const fetchBtcSeries = async () => {
  try {
    const { prices } = await fetchJson(
      `${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily`
    );
    if (!Array.isArray(prices) || !prices.length) throw new Error("No price series");
    return {
      labels: prices.map(([ts]) =>
        new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      ),
      prices: prices.map(([, price]) => round(price, 0))
    };
  } catch (_error) {
    return {
      labels: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
      prices: [61000, 62500, 60800, 63400, 65100, 64200, 66000]
    };
  }
};

module.exports = { fetchGlobalMarket, fetchTopCoins, fetchBtcSeries };
