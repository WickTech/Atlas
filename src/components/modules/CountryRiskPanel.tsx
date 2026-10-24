import { countryCode, INDIA } from "@/lib/constants";
import { severityTextVar } from "@/lib/theme";
import type { CountryIndex } from "@/types/metrics";

interface Props {
  countryIndex: CountryIndex;
  selectedCountry: string | null;
  onSelectCountry: (name: string | null) => void;
}

// Country Instability Index. India is pinned at the top for the Indian audience
// even if it isn't the highest-scoring; clicking a row filters the feed, syncs
// the map selection, and updates the dossier callout.
export function CountryRiskPanel({ countryIndex, selectedCountry, onSelectCountry }: Props) {
  const all = countryIndex.countries;
  const india = countryIndex.india;
  const rest = all.filter((c) => c.name !== INDIA).slice(0, 8);
  const rows = india ? [india, ...rest] : rest;
  const selected = all.find((c) => c.name === selectedCountry) ?? null;

  return (
    <div className="border-b border-border px-5 py-[18px]">
      <div className="eyebrow mb-3">Country instability index</div>
      {rows.length ? (
        <div className="flex flex-col gap-0.5">
          {rows.map((c) => {
            const isSel = selectedCountry === c.name;
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={isSel}
                onClick={() => onSelectCountry(isSel ? null : c.name)}
                className={`grid grid-cols-[30px_1fr_auto] items-center gap-2.5 px-1.5 py-1.5 text-left text-[13px] hover:bg-surface-2 ${isSel ? "bg-surface-2" : ""}`}
              >
                <span className="border border-border py-0.5 text-center text-[10px] font-bold">{countryCode(c.name)}</span>
                <span className="truncate font-bold">
                  {c.name === INDIA && <span className="mr-1">🇮🇳</span>}
                  {c.name}
                </span>
                <span className="telemetry font-bold" style={{ color: severityTextVar(c.score) }}>{c.score}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted">Waiting for country data…</p>
      )}

      {/* Dossier: real score + most recent real headline — no fabricated analyst blurb. */}
      {selected ? (
        <div className="mt-3 border-l-[3px] border-accent bg-surface-2 px-3 py-2.5">
          <div className="mb-1 text-xs font-extrabold">
            {selected.name} · risk {selected.score}
          </div>
          {selected.sample?.title ? (
            <a href={selected.sample.url} target="_blank" rel="noreferrer" className="block text-[11.5px] leading-snug text-muted hover:text-fg">
              {selected.sample.title}
            </a>
          ) : (
            <p className="text-[11.5px] leading-snug text-muted">No recent story on file.</p>
          )}
        </div>
      ) : (
        <div className="mt-3 border-l-[3px] border-border bg-surface-2 px-3 py-2.5 text-xs text-muted">Select a country to see its latest signal.</div>
      )}
    </div>
  );
}
