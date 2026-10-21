// MapLibre v6 runs its tile parsing in a standalone ES-module worker that
// bundlers don't emit. Copy it into public/ under a versioned name (so CDN
// caching is safe) — RiskMap points setWorkerUrl() at the same path.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const outDir = join(process.cwd(), "public", "vendor");
mkdirSync(outDir, { recursive: true });
copyFileSync(join(dirname(pkgPath), "dist", "maplibre-gl-worker.mjs"), join(outDir, `maplibre-gl-worker-${version}.mjs`));
console.log(`maplibre worker ${version} -> public/vendor`);
