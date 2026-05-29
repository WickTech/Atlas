const { fetchBestPerformingStock, fetchWorldNews } = require("./liveData");
const { fetchGlobalMarket, fetchTopCoins, fetchBtcSeries } = require("./cryptoData");

// Assembles the full dashboard payload from live sources (CoinGecko global +
// markets + BTC series, Alpha Vantage stock + news). Each source self-falls-back,
// so this resolves even when an upstream is down.
const generateMetrics = async () => {
  const [global, topCoins, btcSeries, bestStock, worldNews] = await Promise.all([
    fetchGlobalMarket(),
    fetchTopCoins(),
    fetchBtcSeries(),
    fetchBestPerformingStock(),
    fetchWorldNews()
  ]);

  return {
    cards: global.cards,
    btcSeries,
    topCoins,
    dominance: global.dominance,
    bestStock,
    worldNews,
    dataSources: ["CoinGecko", "Alpha Vantage"],
    updatedAt: new Date().toISOString()
  };
};

module.exports = { generateMetrics };
