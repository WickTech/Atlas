import { deltaClass, formatIndianNumber, formatPercent, inr } from "../lib/format";
import Sparkline from "./Sparkline";

// Formats an instrument's price by kind/currency: indices as points, INR forex/
// stocks with ₹, others with their currency code.
const priceLabel = (inst) => {
  if (inst.price == null) return "N/A";
  if (inst.kind === "index") return formatIndianNumber(inst.price);
  if (inst.currency === "INR") return inr(inst.price, { compact: false });
  const sym = inst.currency === "USD" ? "$" : inst.currency === "JPY" ? "¥" : "";
  return `${sym}${formatIndianNumber(inst.price)}`;
};

function InstrumentCard({ inst, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(inst)}
      className="panel flex flex-col gap-1 p-3 text-left transition hover:border-accent"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{inst.name}</span>
        <span className={`text-xs font-semibold ${deltaClass(inst.changePercent)}`}>
          {formatPercent(inst.changePercent)}
        </span>
      </div>
      <span className="text-lg font-bold tabular-nums">{priceLabel(inst)}</span>
      {inst.sparkline?.length ? <Sparkline data={inst.sparkline} color="auto" height={28} /> : null}
    </button>
  );
}

// India + global finance radar. India instruments lead; a market "composite"
// mood chip summarizes Indian index direction.
export default function FinanceRadar({ finance, onSelectInstrument }) {
  if (!finance) return null;
  const india = finance.instruments.filter((i) => i.region === "india");
  const global = finance.instruments.filter((i) => i.region === "global");
  const comp = finance.composite || {};
  const compClass =
    comp.label === "Risk-on" ? "text-bull bg-[color:var(--bull)]/10"
    : comp.label === "Risk-off" ? "text-bear bg-[color:var(--bear)]/10"
    : "text-muted bg-surface-2";

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Finance Radar · India &amp; Global</h2>
        {comp.label && (
          <span className={`chip ${compClass}`}>
            Market: {comp.label}
            {comp.value != null ? ` (${formatPercent(comp.value)})` : ""}
          </span>
        )}
      </div>

      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">India</p>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {india.map((i) => (
          <InstrumentCard key={i.symbol} inst={i} onSelect={onSelectInstrument} />
        ))}
      </div>

      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Global</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {global.map((i) => (
          <InstrumentCard key={i.symbol} inst={i} onSelect={onSelectInstrument} />
        ))}
      </div>
    </section>
  );
}
