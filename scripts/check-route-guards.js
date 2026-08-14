#!/usr/bin/env node
/**
 * Memastikan tiap definisi route punya middleware otorisasi.
 *
 * Dibuat setelah ditemukan 16 endpoint /report terbuka publik karena
 * app.use("/report", reportRoutes) dipasang tanpa authMiddleware dan
 * masing-masing route di dalamnya juga tidak memasang apa pun.
 *
 * Yang diperiksa adalah blok tiap route sampai baris `);` penutup, bukan
 * seluruh berkas — memeriksa per berkas akan lulus hanya karena ada satu
 * route lain yang kebetulan sudah dijaga.
 */
const fs = require("fs");
const path = require("path");

// Berkas -> daftar route yang memang boleh publik, beserta alasannya.
const ALLOWLIST = {
  "src/routes/auth.route.ts": ["POST /login", "POST /refresh-token"],
};

const GUARDS = [
  "authMiddleware",
  "authMiddlewareRole",
  "administratorMiddleware",
  "superadministratorMiddleware",
  "requireRole",
];

/**
 * Guard bisa dipasang di tiga tempat: di app.use() saat router di-mount, di
 * router.use() dalam berkas route, atau di definisi route-nya sendiri.
 * Pemeriksa yang hanya membaca satu di antaranya akan melaporkan positif palsu
 * untuk dua sisanya — versi pertama pemeriksa ini menandai 12 route yang
 * sebenarnya sudah dijaga dari app.ts.
 */
function mountGuardedFiles(appPath) {
  const guarded = new Set();
  if (!fs.existsSync(appPath)) return guarded;
  const source = fs.readFileSync(appPath, "utf8");

  const imports = {};
  for (const m of source.matchAll(/import\s+(\w+)\s+from\s+["'](\.[^"']+)["']/g)) {
    imports[m[1]] = m[2];
  }

  for (const m of source.matchAll(/app\.use\(\s*["'][^"']*["']\s*,\s*([^)]+)\)/g)) {
    const args = m[1];
    if (!GUARDS.some((g) => new RegExp(`\\b${g}\\b`).test(args))) continue;
    for (const name of Object.keys(imports)) {
      if (new RegExp(`\\b${name}\\b`).test(args)) {
        const rel = path.normalize(
          path.join(path.dirname(appPath), imports[name]) + ".ts"
        );
        guarded.add(rel);
      }
    }
  }
  return guarded;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".route.ts")) out.push(full);
  }
  return out;
}

function routeBlocks(source) {
  const blocks = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const start = lines[i].match(/^router\.(get|post|put|delete|patch)\(/);
    if (!start) continue;
    let depth = 0;
    let body = "";
    for (let j = i; j < lines.length; j++) {
      body += lines[j] + "\n";
      for (const ch of lines[j]) {
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
      }
      if (depth === 0) break;
    }
    const pathMatch = body.match(/["'`]([^"'`]*)["'`]/);
    blocks.push({
      method: start[1].toUpperCase(),
      path: pathMatch ? pathMatch[1] : "?",
      line: i + 1,
      body,
    });
  }
  return blocks;
}

const root = process.argv[2] || "src/routes";
const mountGuarded = mountGuardedFiles("src/app.ts");
const findings = [];
let checked = 0;

for (const file of walk(root)) {
  const rel = path.relative(process.cwd(), file);
  const source = fs.readFileSync(file, "utf8");

  // Guard yang dipasang lewat router.use() atau lewat app.use() saat mount
  // berlaku untuk seluruh berkas.
  const fileWide =
    mountGuarded.has(path.normalize(rel)) ||
    GUARDS.some((g) =>
      new RegExp(`router\\.use\\([^)]*\\b${g}\\b`).test(source)
    );

  for (const block of routeBlocks(source)) {
    checked++;
    const label = `${block.method} ${block.path}`;
    if ((ALLOWLIST[rel] || []).includes(label)) continue;
    if (fileWide) continue;
    const guarded = GUARDS.some((g) => new RegExp(`\\b${g}\\b`).test(block.body));
    if (!guarded) findings.push(`${rel}:${block.line}  ${label}`);
  }
}

console.log(`Route diperiksa: ${checked}`);
if (findings.length === 0) {
  console.log("OK — semua route punya middleware otorisasi.");
  process.exit(0);
}
console.log(`\nTANPA OTORISASI: ${findings.length}`);
for (const f of findings) console.log("  " + f);
process.exit(1);
