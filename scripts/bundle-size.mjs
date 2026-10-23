// Initial-JS budget for the console page: gzip size of every <script> the
// prerendered index.html loads. `noModule` polyfills are skipped because
// modern browsers never download them. Run after `npm run build`.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 180);

const html = readFileSync(".next/server/app/index.html", "utf8");
const scripts = new Map();
for (const [tag] of html.matchAll(/<script\b[^>]*>/g)) {
  const src = /\bsrc="\/_next\/(static\/[^"]+\.js)"/.exec(tag)?.[1];
  if (src && !/\bnoModule\b/i.test(tag)) scripts.set(src, true);
}

let total = 0;
const rows = [...scripts.keys()].map((src) => {
  const kb = gzipSync(readFileSync(`.next/${src}`), { level: 9 }).length / 1024;
  total += kb;
  return [kb, src];
});
rows.sort((a, b) => b[0] - a[0]).forEach(([kb, src]) => console.log(`${kb.toFixed(1).padStart(7)} kB  ${src}`));
console.log(`${total.toFixed(1).padStart(7)} kB  initial JS (gzip) · budget ${BUDGET_KB} kB`);

if (total > BUDGET_KB) {
  console.error(`Initial JS exceeds the ${BUDGET_KB} kB budget by ${(total - BUDGET_KB).toFixed(1)} kB.`);
  process.exit(1);
}
