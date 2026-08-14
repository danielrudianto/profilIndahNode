#!/usr/bin/env node
/**
 * Mencari nilai dari request yang disisipkan langsung ke teks query mentah.
 *
 * Dibuat setelah ditemukan `keyword` dari body request disisipkan apa adanya ke
 * dalam LIKE '%...%' pada enam repository. Yang dicari adalah interpolasi
 * template string di dalam blok $queryRawUnsafe / $executeRawUnsafe.
 *
 * Baris berkomentar diabaikan: repo ini menyimpan banyak query lama sebagai
 * komentar, dan menghitungnya membuat laporan penuh temuan yang tidak pernah
 * dieksekusi sehingga temuan sungguhan tenggelam.
 */
const fs = require("fs");
const path = require("path");

// Interpolasi yang isinya dipastikan angka atau konstanta, bukan teks bebas.
const SAFE = [/^toPositiveInt\(/, /^Number\(/, /^baseQuery$/, /^keywordCondition$/];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** Buang baris yang seluruhnya komentar `//`. */
function stripCommentLines(source) {
  return source
    .split("\n")
    .map((l) => (/^\s*\/\//.test(l) ? "" : l))
    .join("\n");
}

const findings = [];
let rawBlocks = 0;

for (const file of walk("src")) {
  const rel = path.relative(process.cwd(), file);
  const original = fs.readFileSync(file, "utf8");
  const source = stripCommentLines(original);
  const lines = original.split("\n");

  const re = /\$(?:query|execute)RawUnsafe/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    rawBlocks++;
    // Ambil isi template string pertama sesudah pemanggilan.
    const rest = source.slice(m.index, m.index + 4000);
    const tick = rest.indexOf("`");
    if (tick === -1) continue;
    const end = rest.indexOf("`", tick + 1);
    if (end === -1) continue;
    const template = rest.slice(tick, end);

    for (const interp of template.matchAll(/\$\{([^}]*)\}/g)) {
      const expr = interp[1].trim();
      if (SAFE.some((p) => p.test(expr))) continue;
      const line = source.slice(0, m.index + tick + interp.index).split("\n").length;
      findings.push(`${rel}:${line}  \${${expr.split("\n")[0].slice(0, 60)}}`);
    }
  }
}

console.log(`Blok raw query diperiksa: ${rawBlocks}`);
if (findings.length === 0) {
  console.log("OK — tidak ada interpolasi teks bebas di query mentah.");
  process.exit(0);
}
console.log(`\nINTERPOLASI MENCURIGAKAN: ${findings.length}`);
for (const f of findings) console.log("  " + f);
process.exit(1);
