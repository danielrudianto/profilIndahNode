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

/**
 * Penghitung kemunculan per (berkas + ekspresi).
 *
 * Identitas temuan sengaja TIDAK memakai nomor baris. Versi pertama memakainya,
 * dan setiap kali Prettier membungkus ulang sebuah baris seluruh entri di
 * bawahnya ikut bergeser — pemeriksa lalu melaporkan interpolasi lama sebagai
 * "hilang" sekaligus "baru" padahal kodenya tidak berubah sama sekali.
 *
 * Yang dipakai sekarang: berkas + ekspresi + nomor kemunculan di berkas itu.
 * Urutan kemunculan tetap sama walau baris bergeser, dan dua interpolasi
 * identik dalam satu berkas tetap terbedakan.
 */
const kemunculan = new Map();

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
      const ringkas = `\${${expr.split("\n")[0].slice(0, 60)}}`;
      const dasar = `${rel}  ${ringkas}`;
      const ke = (kemunculan.get(dasar) || 0) + 1;
      kemunculan.set(dasar, ke);
      // kunci = dibandingkan ke garis dasar; tampilan = dibaca manusia.
      findings.push({ kunci: `${dasar}  #${ke}`, tampilan: `${rel}:${line}  ${ringkas}` });
    }
  }
}

/**
 * Temuan dibandingkan ke garis dasar, bukan ke nol.
 *
 * Repo ini punya puluhan interpolasi lama yang nilainya berupa angka atau
 * berasal dari dalam sistem. Melaporkan semuanya tiap kali membuat keluaran
 * penuh derau, dan temuan sungguhan ikut tenggelam. Yang berarti adalah
 * interpolasi yang BARU muncul sejak garis dasar dibuat.
 *
 * Menambah baris ke berkas garis dasar berarti menyatakan "sudah diperiksa,
 * bukan teks bebas dari pengguna". Jangan menambah tanpa membuka berkasnya.
 */
const baselinePath = path.join(__dirname, "sql-injection-baseline.txt");
let baseline = new Set();
if (fs.existsSync(baselinePath)) {
  baseline = new Set(
    fs
      .readFileSync(baselinePath, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
  );
}

const baru = findings.filter((f) => !baseline.has(f.kunci));
const hilang = [...baseline].filter((b) => !findings.some((f) => f.kunci === b));

/*
  `--tulis` menulis ulang garis dasar dari keadaan kode sekarang.

  Jalankan HANYA setelah membaca temuannya. Menulis ulang tanpa memeriksa sama
  saja dengan menyatakan semua interpolasi yang ada sudah aman.
*/
if (process.argv.includes("--tulis")) {
  const isi = [
    "# Garis dasar interpolasi pada query mentah.",
    "# Tiap baris = interpolasi yang sudah diperiksa dan dinilai bukan teks bebas",
    "# dari pengguna (umumnya angka atau nilai internal). Pemeriksa hanya melaporkan",
    "# yang BARU di luar daftar ini.",
    "#",
    "# Format: <berkas>  <interpolasi>  #<kemunculan ke-berapa di berkas itu>",
    "# Nomor baris sengaja tidak dipakai supaya perubahan format kode tidak",
    "# membuat seluruh daftar ini dianggap berubah.",
    "#",
    "# Regenerasi: node scripts/check-sql-injection.js --tulis",
    "# Menghapus baris dari sini akan membuat pemeriksa menandainya lagi.",
    ...findings.map((f) => f.kunci),
  ].join("\n");
  fs.writeFileSync(baselinePath, isi + "\n");
  console.log(`Garis dasar ditulis ulang: ${findings.length} interpolasi.`);
  process.exit(0);
}

console.log(`Blok raw query diperiksa: ${rawBlocks}`);
console.log(`Interpolasi diketahui (garis dasar): ${baseline.size}`);

if (hilang.length > 0) {
  console.log(`\nSudah tidak ada — hapus dari garis dasar: ${hilang.length}`);
  for (const h of hilang) console.log("  " + h);
}

if (baru.length === 0) {
  console.log("OK — tidak ada interpolasi baru.");
  process.exit(hilang.length > 0 ? 1 : 0);
}

console.log(`\nINTERPOLASI BARU: ${baru.length}`);
for (const f of baru) console.log("  " + f.tampilan);
process.exit(1);
