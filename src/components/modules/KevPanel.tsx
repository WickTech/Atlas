import { ExternalLink } from "lucide-react";

import type { KevRecord } from "@/server/live";

interface Props {
  kev: KevRecord[];
  /** Entries in the whole CISA catalog. */
  total: number;
}

const nvd = (cve: string) => `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve)}`;

/**
 * Newest additions to CISA's Known Exploited Vulnerabilities catalog: flaws with
 * confirmed exploitation in the wild. They have no location, so this lives in the
 * Intel panel next to the internet-outage layer it comes from, not on the map.
 */
export function KevPanel({ kev, total }: Props) {
  if (!kev.length) return null;
  return (
    <section className="border-b border-border px-5 py-[18px]" aria-label="Exploited vulnerabilities">
      <div className="eyebrow mb-1">Exploited vulnerabilities</div>
      <p className="mb-3 text-[11px] text-muted">
        Newest of {total.toLocaleString("en-US")} in CISA&apos;s Known Exploited Vulnerabilities catalog (confirmed attacks in the wild).
      </p>
      <ul className="flex flex-col">
        {kev.map((v) => (
          <li key={v.cve} className="border-b border-border py-2 last:border-b-0">
            <div className="flex items-center gap-2">
              <a
                href={nvd(v.cve)}
                target="_blank"
                rel="noreferrer"
                className="telemetry inline-flex items-center gap-1 font-bold hover:text-accent-400"
                aria-label={`${v.cve} on the National Vulnerability Database (opens in a new tab)`}
              >
                {v.cve}
                <ExternalLink size={10} aria-hidden="true" />
              </a>
              {v.ransomware && <span className="chip bg-sev-4-soft text-sev-4-text">ransomware</span>}
              <span className="telemetry ml-auto text-subtle" title="Date added to the catalog">
                {v.added}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] leading-snug text-fg">{v.name || `${v.vendor} ${v.product}`}</p>
            <p className="text-[11px] text-muted">
              {v.vendor} · {v.product}
              {v.due ? ` · fix due ${v.due}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
