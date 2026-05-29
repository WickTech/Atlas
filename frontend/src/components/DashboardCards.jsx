const compactUsd = (value) => {
  if (value == null) return "N/A";
  return `$${Number(value).toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  })}`;
};

const compactNumber = (value) => {
  if (value == null) return "N/A";
  return Number(value).toLocaleString("en-US", { notation: "compact" });
};

export default function DashboardCards({ metrics }) {
  const c = metrics.cards || {};
  const change = c.marketCapChange24h;

  const cards = [
    { label: "Total Market Cap", value: compactUsd(c.marketCap) },
    { label: "24h Volume", value: compactUsd(c.volume24h) },
    { label: "BTC Dominance", value: c.btcDominance == null ? "N/A" : `${c.btcDominance}%` },
    { label: "Active Coins", value: compactNumber(c.activeCoins) },
    {
      label: "Mkt Cap 24h",
      value: change == null ? "N/A" : `${change > 0 ? "+" : ""}${change}%`,
      tone: change == null ? "" : change >= 0 ? "up" : "down"
    }
  ];

  return (
    <section className="stats-grid">
      {cards.map((card) => (
        <article className="card" key={card.label}>
          <p className="card-label">{card.label}</p>
          <h2 className={`card-value ${card.tone ? `card-value--${card.tone}` : ""}`}>
            {card.value}
          </h2>
        </article>
      ))}
    </section>
  );
}
