// Callout under the Country Instability Index showing the selected country's
// score plus its most recent real headline (from countryIndex's sample story) —
// no fabricated analyst blurb.
export default function Dossier({ country }) {
  if (!country) {
    return (
      <div className="mt-3 border-l-[3px] border-border bg-surface-2 px-3 py-2.5 text-xs text-muted">
        Select a country to see its latest signal.
      </div>
    );
  }

  return (
    <div className="mt-3 border-l-[3px] border-accent bg-surface-2 px-3 py-2.5">
      <div className="mb-1 text-xs font-extrabold">
        {country.name} · risk {country.score}
      </div>
      {country.sample?.title ? (
        <a
          href={country.sample.url}
          target="_blank"
          rel="noreferrer"
          className="block text-[11.5px] leading-snug text-muted hover:text-fg"
        >
          {country.sample.title}
        </a>
      ) : (
        <p className="text-[11.5px] leading-snug text-muted">No recent story on file.</p>
      )}
    </div>
  );
}
