"use client";

import { ExternalLink, MapPin, X } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { countryActivity, eventTimeline, formatKm, itemsInCountry, nearbyItems, type Nearby } from "@/layers/context";
import { LAYER_OF_KIND, type GeoItem } from "@/layers/types";
import { useSelectedItem } from "@/layers/useSelectedItem";
import type { LiveData } from "@/layers/useLiveLayers";
import type { BriefInput } from "@/lib/brief";
import { relativeTime, sevColor } from "@/lib/format";
import { countryAt } from "@/lib/geoMath";
import type { CountryData } from "@/map/countries";
import { useConsole } from "@/state/store";
import type { Metrics } from "@/types/metrics";

import { BriefPanel } from "./BriefPanel";
import { MiniBars } from "./MiniBars";

const NEARBY_KM = 500;
const KIND_LABEL: Record<GeoItem["kind"], string> = {
  quake: "Earthquake",
  hazard: "Natural hazard",
  flight: "Aircraft",
  outage: "Internet outage",
  c2: "Botnet C2",
  cctv: "Traffic camera",
  broadcast: "Live TV",
  chokepoint: "Chokepoint",
  port: "Port",
  flashpoint: "Flashpoint"
};

const fmtCoord = ([lng, lat]: [number, number]) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;

function Shell({ kind, title, severity, onClose, children }: { kind: string; title: string; severity?: GeoItem["severity"]; onClose: () => void; children: ReactNode }) {
  return (
    <aside
      className="glass absolute top-3 bottom-3 left-3 z-20 flex w-80 max-w-[calc(100%-1.5rem)] flex-col max-lg:fixed max-lg:inset-x-0 max-lg:top-auto max-lg:bottom-8 max-lg:left-0 max-lg:h-[58dvh] max-lg:w-full max-lg:max-w-none"
      aria-label={`Inspector: ${title}`}
    >
      <header className="flex items-start gap-2 border-b border-border px-3 py-2.5">
        {severity && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: sevColor(severity) }} aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{kind}</p>
          <h2 className="text-[14px] leading-snug font-bold">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="text-muted hover:text-fg" aria-label="Close inspector (Esc)">
          <X size={16} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </aside>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 py-2.5 text-[12px]">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="telemetry text-muted">{k}</dt>
          <dd className="min-w-0 text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function NearbyList({ items, onPick, title = `Within ${NEARBY_KM} km`, showKm = true }: { items: Nearby[]; onPick: (i: GeoItem) => void; title?: string; showKm?: boolean }) {
  return (
    <section className="border-t border-border px-3 py-2.5" aria-label={title}>
      <p className="eyebrow mb-1.5">{title}</p>
      {items.length ? (
        <ul className="flex flex-col">
          {items.map(({ item, km }) => (
            <li key={item.id}>
              <button type="button" onClick={() => onPick(item)} className="flex w-full items-center gap-2 py-1 text-left text-[12px] hover:text-accent-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sevColor(item.severity) }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                {showKm && <span className="telemetry shrink-0 text-muted">{formatKm(km)}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted">No quakes, hazards, outages or strategic sites nearby in the loaded layers.</p>
      )}
    </section>
  );
}

function Headlines({ stories }: { stories: { title: string; url: string; source: string | null; timePublished: string | null }[] }) {
  if (!stories.length) return null;
  return (
    <section className="border-t border-border px-3 py-2.5" aria-label="Latest headlines">
      <p className="eyebrow mb-1.5">Latest coverage</p>
      <ul className="flex flex-col gap-1.5">
        {stories.slice(0, 5).map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="block text-[12px] leading-snug hover:text-accent-400">
              {s.title}
            </a>
            <span className="telemetry text-[10px] text-muted">
              {s.source} · {relativeTime(s.timePublished)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface Props {
  metrics: Metrics;
  live: LiveData;
  countries: CountryData | null;
}

/** Inspector for the current selection: entity, country, or picked coordinate. */
export function Inspector({ metrics, live, countries }: Props) {
  const selection = useConsole((s) => s.selection);
  const select = useConsole((s) => s.select);
  const filters = useConsole((s) => s.filters);
  const item = useSelectedItem(live);
  const close = () => select(null);
  const pick = (i: GeoItem) => select({ kind: "entity", layer: LAYER_OF_KIND[i.kind], id: i.id, coord: i.coord });

  // Shared context for point-like selections (entity or coordinate).
  const point: [number, number] | null = selection?.kind === "coord" ? selection.coord : item ? item.coord : null;
  const pointCountry = useMemo(() => (point && countries ? countryAt(countries.geojson, point) : null), [point, countries]);
  const nearby = useMemo(() => (point ? nearbyItems(point, live, NEARBY_KM, item?.id) : []), [point, live, item?.id]);
  const nearbyTimeline = useMemo(() => eventTimeline([...(item ? [item] : []), ...nearby.map((n) => n.item)]), [item, nearby]);

  const countryName = selection?.kind === "country" ? selection.name : null;
  const activity = useMemo(() => (countryName ? countryActivity(countryName, metrics.news) : null), [countryName, metrics.news]);
  const inCountry = useMemo(() => (countryName && countries ? itemsInCountry(countryName, live, countries.geojson) : []), [countryName, live, countries]);
  const pointStories = useMemo(() => (pointCountry ? metrics.news.filter((n) => n.countryNorm === pointCountry) : []), [pointCountry, metrics.news]);

  const briefInput = useMemo<BriefInput | null>(() => {
    if (countryName) {
      const risk = metrics.countryIndex.countries.find((c) => c.name === countryName);
      return {
        subject: countryName,
        kind: "country",
        facts: [
          ...(risk ? [`Atlas risk index ${risk.score}/100 from ${risk.count} recent stories`] : []),
          ...inCountry.slice(0, 8).map((i) => `${KIND_LABEL[i.kind]}: ${i.title} — ${i.facts.slice(0, 2).join(", ")} (${i.source})`)
        ],
        headlines: (activity?.stories ?? []).slice(0, 12).map((s) => ({ title: s.title, source: s.source ?? "" }))
      };
    }
    if (point) {
      const subject = item ? `${item.title}${pointCountry ? ` (${pointCountry})` : ""}` : `Area near ${fmtCoord(point)}${pointCountry ? `, ${pointCountry}` : ""}`;
      return {
        subject,
        kind: item ? "event" : "area",
        facts: [
          ...(item ? [`${KIND_LABEL[item.kind]}: ${item.facts.join(", ")} (${item.source}${item.ts ? `, ${relativeTime(item.ts)}` : ""})`] : []),
          ...nearby.slice(0, 8).map((n) => `${formatKm(n.km)} away — ${KIND_LABEL[n.item.kind]}: ${n.item.title} (${n.item.facts.slice(0, 2).join(", ")})`)
        ],
        headlines: pointStories.slice(0, 10).map((s) => ({ title: s.title, source: s.source ?? "" }))
      };
    }
    return null;
  }, [countryName, metrics.countryIndex, inCountry, activity, point, item, pointCountry, nearby, pointStories]);

  if (!selection) return null;

  if (countryName) {
    const risk = metrics.countryIndex.countries.find((c) => c.name === countryName);
    const scoped = filters.scope === "india" && countryName !== "India";
    return (
      <Shell kind="Country" title={countryName} onClose={close}>
        <Facts
          rows={[
            ["Risk", risk ? `${risk.score}/100` : "no coverage"],
            ["Stories", `${activity?.stories.length ?? 0} in current feed`],
            ["Live events", inCountry.length ? `${inCountry.length} in enabled layers` : "none in enabled layers"]
          ]}
        />
        {activity && (
          <div className="border-t border-border px-3 py-2.5">
            <MiniBars values={activity.timeline} label="Coverage, last 48 h" unit="stories" startLabel="48 h ago" />
          </div>
        )}
        {inCountry.length > 0 && (
          <NearbyList items={inCountry.slice(0, 8).map((i) => ({ item: i, km: 0 }))} onPick={pick} title={`Live events in ${countryName}`} showKm={false} />
        )}
        <Headlines stories={activity?.stories ?? []} />
        {scoped && <p className="border-t border-border px-3 py-2 text-[10.5px] text-muted">Feed is in India scope — switch to World to list every {countryName} story.</p>}
        <BriefPanel input={briefInput} />
      </Shell>
    );
  }

  if (!point) {
    // Entity no longer in the loaded data (e.g. aircraft left the box, layer off).
    return (
      <Shell kind="Selection" title="No longer in view" onClose={close}>
        <p className="px-3 py-3 text-[12px] text-muted">The selected object isn&apos;t in the current data — its layer may be off or it moved out of the visible area.</p>
      </Shell>
    );
  }

  return (
    <Shell kind={item ? KIND_LABEL[item.kind] : "Picked location"} title={item ? item.title : fmtCoord(point)} severity={item?.severity} onClose={close}>
      <Facts
        rows={[
          ...(item ? item.facts.map((f, i): [string, ReactNode] => [i === 0 ? "Facts" : "", f]) : []),
          ["Position", fmtCoord(point)],
          ["Country", pointCountry ?? "open water / unmapped"],
          ...(item?.ts ? [["Observed", relativeTime(item.ts)] as [string, ReactNode]] : []),
          ...(item
            ? [
                [
                  "Source",
                  item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent-400">
                      {item.source} <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  ) : (
                    item.source
                  )
                ] as [string, ReactNode]
              ]
            : [])
        ]}
      />
      <div className="border-t border-border px-3 py-2.5">
        <MiniBars values={nearbyTimeline} label="Events here, last 24 h" unit="events" startLabel="24 h ago" />
      </div>
      <NearbyList items={nearby} onPick={pick} />
      {pointCountry && (
        <button
          type="button"
          onClick={() => select({ kind: "country", name: pointCountry })}
          className="flex w-full items-center gap-1.5 border-t border-border px-3 py-2 text-left text-[11.5px] text-muted hover:text-fg"
        >
          <MapPin size={12} aria-hidden="true" /> Inspect {pointCountry}
        </button>
      )}
      <Headlines stories={pointStories} />
      <BriefPanel input={briefInput} />
    </Shell>
  );
}
