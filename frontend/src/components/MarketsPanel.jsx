import { formatIndianNumber, formatPercent, inr } from "../lib/format";

const priceLabel = (inst) => {
  if (inst.price == null) return "N/A";
  if (inst.kind === "index") return formatIndianNumber(inst.price);
  if (inst.currency === "INR") return inr(inst.price, { compact: false });
  const sym = inst.currency === "USD" ? "$" : inst.currency === "JPY" ? "¥" : "";
  return `${sym}${formatIndianNumber(inst.price)}`;
};

// Compact monospace markets table for the right rail — India + global
// instruments from `finance.instruments`, optionally lens-filtered by the caller.
export default function MarketsPanel({ finance, instruments, onSelectInstrument }) {
  const list = instruments || finance?.instruments || [];
  const withChange = list.filter((i) => i.changePercent != null);
  const up = withChange.filter((i) => i.changePercent > 0).length;
  const best = [...withChange].sort((a, b) => b.changePercent - a.changePercent)[0];

  return (
    <div className="px-5 py-4">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[.12em] text-accent-400">Markets</span>
        {withChange.length ? (
          <span className="text-[10px] text-muted">
            up {up} / {withChange.length}
          </span>
        ) : null}
      </div>

      {list.length ? (
        <div className="flex flex-col font-mono text-xs">
          {list.map((inst) => (
            <button
              key={inst.symbol}
              type="button"
              onClick={() => onSelectInstrument?.(inst)}
              className="grid grid-cols-[1fr_auto_52px] items-center gap-2 border-b border-[color:var(--border)] py-1.5 text-left last:border-b-0 hover:text-accent-400"
            >
              <span className="truncate">{inst.name}</span>
              <span>{priceLabel(inst)}</span>
              <span className={`text-right ${inst.changePercent > 0 ? "text-bull" : "text-bear"}`}>
                {formatPercent(inst.changePercent)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">No market data for this lens.</p>
      )}

      {best ? (
        <p className="mt-2.5 text-[10px] text-muted">
          Best {best.name} {formatPercent(best.changePercent)} · via {best.source || "Yahoo Finance"}
        </p>
      ) : null}
    </div>
  );
}
