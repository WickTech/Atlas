import { countryCode, INDIA } from "../lib/constants";
import Dossier from "./Dossier";

// Country Instability Index. India is pinned at the top for the Indian
// audience even if it isn't the highest-scoring; clicking a row filters the
// feed, syncs the map selection, and updates the Dossier callout below.
export default function CountryRiskPanel({ countryIndex, selectedCountry, onSelectCountry }) {
  const all = countryIndex?.countries || [];
  const india = countryIndex?.india;
  const rest = all.filter((c) => c.name !== INDIA).slice(0, 8);
  const rows = india ? [india, ...rest] : rest;
  const selected = all.find((c) => c.name === selectedCountry) || null;

  return (
    <div className="border-b border-border px-5 py-[18px]">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[.12em] text-accent-400">
        Country instability index
      </div>
      {rows.length ? (
        <div className="flex flex-col gap-0.5">
          {rows.map((c) => {
            const isSel = selectedCountry === c.name;
            const pinned = c.name === INDIA;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onSelectCountry?.(isSel ? null : c.name)}
                className={`grid grid-cols-[30px_1fr_auto] items-center gap-2.5 px-1.5 py-1.5 text-left text-[13px] hover:bg-surface-2 ${
                  isSel ? "bg-surface-2" : ""
                }`}
              >
                <span className="border border-border px-0 py-0.5 text-center text-[10px] font-bold">
                  {countryCode(c.name)}
                </span>
                <span className="truncate font-bold">
                  {pinned && <span className="mr-1">🇮🇳</span>}
                  {c.name}
                </span>
                <span className="font-bold text-accent-400">{c.score}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted">Waiting for country data…</p>
      )}

      <Dossier country={selected} />
    </div>
  );
}
