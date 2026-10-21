import { formatIndianNumber, formatPercent, inr } from "@/lib/format";
import type { Instrument } from "@/types/metrics";

const CURRENCY_SYMBOL: Record<Instrument["currency"], string> = { INR: "₹", USD: "$", JPY: "¥" };

const priceLabel = (inst: Instrument) => {
  if (inst.price == null) return "N/A";
  if (inst.kind === "index") return formatIndianNumber(inst.price);
  if (inst.currency === "INR") return inr(inst.price, { compact: false });
  return `${CURRENCY_SYMBOL[inst.currency]}${formatIndianNumber(inst.price)}`;
};

/** Monospace markets table — India + global instruments, lens-filtered by the caller. */
export function MarketsPanel({ instruments, onSelectInstrument }: { instruments: Instrument[]; onSelectInstrument: (i: Instrument) => void }) {
  const withChange = instruments.filter((i) => i.changePercent != null);
  const up = withChange.filter((i) => (i.changePercent ?? 0) > 0).length;
  const best = [...withChange].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))[0];

  return (
    <div className="px-5 py-4">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="eyebrow">Markets</span>
        {withChange.length ? (
          <span className="telemetry text-[10px] text-muted">
            up {up} / {withChange.length}
          </span>
        ) : null}
      </div>

      {instruments.length ? (
        <div className="flex flex-col font-mono text-xs tabular-nums">
          {instruments.map((inst) => (
            <button
              key={inst.symbol}
              type="button"
              onClick={() => onSelectInstrument(inst)}
              className="grid grid-cols-[1fr_auto_60px] items-center gap-2 border-b border-border py-1.5 text-left last:border-b-0 hover:text-accent-400"
            >
              <span className="truncate">{inst.name}</span>
              <span>{priceLabel(inst)}</span>
              <span className={`text-right ${inst.changePercent == null ? "text-muted" : inst.changePercent > 0 ? "text-bull" : "text-bear"}`}>
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
          Best {best.name} {formatPercent(best.changePercent)} · via {best.source}
        </p>
      ) : null}
    </div>
  );
}
