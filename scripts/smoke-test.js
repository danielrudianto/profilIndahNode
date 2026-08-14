#!/usr/bin/env node
/**
 * Uji asap: memeriksa perubahan batch 1-7 terhadap server yang sedang berjalan.
 *
 * Yang tidak bisa dibuktikan tanpa database asli:
 *   - apakah query hasil parameterisasi mengembalikan data yang sama (batch 1)
 *   - apakah login masih bekerja setelah pindah ke bcryptjs (batch 6)
 *   - apakah pembatasan role pada /report memberi 403 yang benar (batch 1)
 *
 * Skrip ini tidak menulis apa pun ke database. Semua permintaannya hanya baca,
 * kecuali login.
 *
 * Pemakaian:
 *   node scripts/smoke-test.js --user NAMA --pass SANDI
 *   node scripts/smoke-test.js --url http://localhost:5000 --user NAMA --pass SANDI
 *
 * Sandi tidak disimpan dan tidak ditampilkan di keluaran.
 */

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const BASE = (arg("url", "http://localhost:5000")).replace(/\/$/, "");
const USER = arg("user");
const PASS = arg("pass");

if (!USER || !PASS) {
  console.error("Perlu --user dan --pass.");
  console.error("Contoh: node scripts/smoke-test.js --user admin --pass rahasia");
  process.exit(2);
}

let token = null;
const hasil = [];

async function panggil(metode, jalur, { body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + jalur, {
    method: metode,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let isi = null;
  const teks = await res.text();
  try {
    isi = JSON.parse(teks);
  } catch {
    isi = teks;
  }
  return { status: res.status, isi };
}

function catat(nama, lulus, ket = "") {
  hasil.push({ nama, lulus });
  const tanda = lulus ? "  OK  " : " GAGAL";
  console.log(`[${tanda}] ${nama}${ket ? "  — " + ket : ""}`);
}

function jumlahBaris(isi) {
  if (Array.isArray(isi)) return isi.length;
  if (isi && Array.isArray(isi.data)) return isi.data.length;
  return null;
}

async function utama() {
  console.log(`Server: ${BASE}\n`);

  // --- Batch 6: login setelah pindah dari bcrypt ke bcryptjs ---
  const login = await panggil("POST", "/auth/login", {
    body: { username: USER, password: PASS },
    auth: false,
  });
  if (login.status !== 200 || !login.isi?.token) {
    catat("login (batch 6: bcryptjs)", false, `status ${login.status}`);
    console.log("\nLogin gagal — pengujian berikutnya dilewati.");
    console.log("Kalau kredensialnya benar, kemungkinan besar penyebabnya");
    console.log("perpindahan bcrypt -> bcryptjs di batch 6.");
    process.exit(1);
  }
  token = login.isi.token;
  catat("login (batch 6: bcryptjs)", true, "token diterima");

  // --- Batch 1: query pencarian yang diparameterisasi ---
  const halaman = [
    ["merek", "/product-brand"],
    ["metode pembayaran", "/payment-method"],
    ["tipe produk", "/product-type"],
    ["supplier", "/supplier"],
    ["perusahaan", "/company"],
  ];

  for (const [nama, jalur] of halaman) {
    const kosong = await panggil("GET", `${jalur}?keyword=&page=1&pageSize=10`);
    const n = jumlahBaris(kosong.isi);
    catat(
      `${nama}: daftar tanpa kata kunci`,
      kosong.status === 200 && n !== null,
      `status ${kosong.status}, ${n ?? "?"} baris`
    );

    const hal2 = await panggil("GET", `${jalur}?keyword=&page=2&pageSize=10`);
    catat(`${nama}: halaman 2`, hal2.status === 200, `status ${hal2.status}`);

    const cari = await panggil("GET", `${jalur}?keyword=a&page=1&pageSize=10`);
    catat(
      `${nama}: cari kata kunci "a"`,
      cari.status === 200,
      `status ${cari.status}, ${jumlahBaris(cari.isi) ?? "?"} baris`
    );

    // Tanda kutip tunggal dulu bisa mengubah arti query. Sekarang harus
    // diperlakukan sebagai teks biasa: balasan 200 dengan hasil kosong.
    const kutip = await panggil(
      "GET",
      `${jalur}?keyword=${encodeURIComponent("o'brien")}&page=1&pageSize=10`
    );
    catat(
      `${nama}: kata kunci bertanda kutip`,
      kutip.status === 200,
      `status ${kutip.status}`
    );
  }

  // --- Batch 1: /report tidak lagi terbuka tanpa token ---
  const tanpaToken = await fetch(`${BASE}/report/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month: 1, year: 2026 }),
  });
  catat(
    "/report/sales ditolak tanpa token",
    tanpaToken.status === 401,
    `status ${tanpaToken.status} (harus 401)`
  );

  // --- Batch 4: /os tidak lagi terbuka ---
  const os = await fetch(`${BASE}/os`);
  catat(
    "/os ditolak tanpa token",
    os.status === 401 || os.status === 400,
    `status ${os.status} (harus 401/400)`
  );

  // --- Batch 1: laporan bisa dibuka pengguna yang berhak ---
  const now = new Date();
  const lap = await panggil("POST", "/report/sales", {
    body: { month: now.getMonth() + 1, year: now.getFullYear() },
  });
  catat(
    "/report/sales dengan token",
    lap.status === 200 || lap.status === 403,
    lap.status === 403
      ? "403 — role akun ini memang tidak diizinkan, itu wajar"
      : `status ${lap.status}`
  );

  // --- Batch 2: penangkap 404 ---
  const empatnol = await panggil("GET", "/jalur-yang-tidak-ada");
  catat(
    "404 dijawab, tidak menggantung",
    empatnol.status === 404,
    `status ${empatnol.status}`
  );

  const gagal = hasil.filter((h) => !h.lulus);
  console.log(`\n${hasil.length - gagal.length}/${hasil.length} lulus`);
  if (gagal.length > 0) {
    console.log("\nGAGAL:");
    for (const g of gagal) console.log("  - " + g.nama);
    process.exit(1);
  }
  console.log("Semua lulus.");
}

utama().catch((e) => {
  console.error("\nTidak bisa menjalankan uji:", e.message);
  console.error("Pastikan server sedang berjalan di " + BASE);
  process.exit(1);
});
