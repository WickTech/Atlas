import { deltaClass, formatNumber, formatPercent } from "../lib/format";

// Compact "best performing stock" highlight used inside the Market Context section.
export default function MarketHighlights({ bestStock }) {
  return (
    <article className="panel flex flex-col p-4">
      <h3 className="mb-2 text-sm font-semibold">Best Performing Stock</h3>
      <p className="text-2xl font-bold text-accent">{bestStock?.symbol || "N/A"}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs uppercase text-muted">Price</p>
          <p className="font-medium">${formatNumber(bestStock?.price)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Change</p>
          <p className={`font-medium ${deltaClass(bestStock?.changePercent)}`}>
            {formatPercent(bestStock?.changePercent)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Volume</p>
          <p className="font-medium">{formatNumber(bestStock?.volume)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Source</p>
          <p className="font-medium">{bestStock?.source || "Unknown"}</p>
        </div>
      </div>
    </article>
  );
}
