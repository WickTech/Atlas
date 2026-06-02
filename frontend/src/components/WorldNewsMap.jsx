import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

// World-atlas topojson (names in properties.name) — standard react-simple-maps source.
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// hex -> "r,g,b"
const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : "246,70,93";
};

// India-centered news/risk choropleth. Countries are tinted by their risk score
// from the Country Intelligence Index; clicking one filters the feed.
export default function WorldNewsMap({ countryIndex, selectedCountry, onSelectCountry }) {
  const [hover, setHover] = useState(null);

  const { scoreByName, max } = useMemo(() => {
    const map = new Map();
    for (const c of countryIndex?.countries || []) map.set(c.name, c);
    return { scoreByName: map, max: countryIndex?.max || 1 };
  }, [countryIndex]);

  const riskRgb = hexToRgb(
    typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--bear").trim()
      : "#f6465d"
  );

  const fillFor = (name) => {
    const c = scoreByName.get(name);
    if (!c) return "var(--surface-2)";
    const intensity = max ? c.score / max : 0;
    return `rgba(${riskRgb}, ${0.12 + 0.78 * intensity})`;
  };

  return (
    <article className="panel relative p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">News Map · India &amp; the World</h3>
        <span className="text-xs text-muted">tap a country to filter</span>
      </div>

      <div className="overflow-hidden rounded-lg" style={{ background: "var(--surface-2)" }}>
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 140 }} height={420}>
          <ZoomableGroup center={[80, 22]} zoom={2.4} minZoom={1} maxZoom={8}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties.name;
                  const data = scoreByName.get(name);
                  const isSel = selectedCountry === name;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() =>
                        setHover(data ? `${name}: risk ${data.score}/100 · ${data.count} stories` : name)
                      }
                      onMouseLeave={() => setHover(null)}
                      onClick={() => data && onSelectCountry?.(isSel ? null : name)}
                      style={{
                        default: {
                          fill: fillFor(name),
                          stroke: isSel ? "var(--accent)" : "var(--border)",
                          strokeWidth: isSel ? 1.2 : 0.4,
                          outline: "none"
                        },
                        hover: {
                          fill: data ? fillFor(name) : "var(--border)",
                          stroke: "var(--accent)",
                          strokeWidth: 0.8,
                          outline: "none",
                          cursor: data ? "pointer" : "default"
                        },
                        pressed: { fill: "var(--accent)", outline: "none" }
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {hover && (
        <div className="pointer-events-none absolute bottom-5 left-5 rounded-md border border-border bg-bg/90 px-2.5 py-1 text-xs text-fg shadow-panel">
          {hover}
        </div>
      )}
    </article>
  );
}
