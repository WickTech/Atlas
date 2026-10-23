// `npm audit` gate for CI. Fails on any high/critical advisory in production
// dependencies EXCEPT the ones listed below, each with a reason and a review date,
// so a known, accepted risk doesn't block unrelated PRs but a new one does.
import { execFileSync } from "node:child_process";

const ACCEPTED = {
  "GHSA-jrc7-96c5-q579": {
    reason:
      "maplibre-gl <=6.4.0 DOM.sanitize bypass. Only reachable through basemap attribution HTML; Atlas uses no Popup/setHTML. " +
      "No 5.x fix, and 6.x breaks deck.gl 9.4's MapboxOverlay. Revisit when deck.gl supports MapLibre 6.",
    reviewBy: "2027-01-31"
  }
};

let raw;
try {
  raw = execFileSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8" });
} catch (err) {
  raw = err.stdout; // npm audit exits non-zero when it finds anything
}
const report = JSON.parse(raw);

const blocking = [];
for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  if (!["high", "critical"].includes(vuln.severity)) continue;
  const advisories = vuln.via.filter((v) => typeof v === "object");
  // Transitive entries only reference another package by name; the advisory lives on the source.
  if (!advisories.length) continue;
  for (const adv of advisories) {
    const id = adv.url?.split("/").pop();
    const accepted = ACCEPTED[id];
    if (accepted && new Date() <= new Date(accepted.reviewBy)) {
      console.log(`accepted ${id} (${name}, ${vuln.severity}) until ${accepted.reviewBy}: ${accepted.reason}`);
    } else {
      blocking.push(`${name} ${vuln.severity}: ${adv.title} ${adv.url}${accepted ? " (acceptance expired)" : ""}`);
    }
  }
}

if (blocking.length) {
  console.error(`\n${blocking.length} blocking advisor${blocking.length === 1 ? "y" : "ies"}:\n- ${blocking.join("\n- ")}`);
  process.exit(1);
}
console.log("npm audit: no unaccepted high/critical advisories in production dependencies.");
