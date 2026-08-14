/**
 * Mengubah nilai dari request menjadi bilangan bulat non-negatif yang aman
 * disisipkan ke klausa LIMIT/OFFSET.
 *
 * Keyword pencarian dikirim sebagai parameter query, tapi LIMIT dan OFFSET
 * tidak bisa diperlakukan sama di semua jalur Prisma sehingga nilainya tetap
 * disisipkan ke teks query. Karena itu nilainya harus dipastikan benar-benar
 * angka di sini.
 *
 * Kalau pemeriksaan ini dilepas, isi `page`/`pageSize` dari body request masuk
 * apa adanya ke SQL — sama persis dengan lubang yang baru saja ditutup pada
 * keyword pencarian.
 */
export function toPositiveInt(value: unknown, fallback: number): number {
  // null, undefined dan teks kosong ditolak lebih dulu. Number(null) dan
  // Number("") sama-sama menghasilkan 0, sehingga tanpa pemeriksaan ini
  // parameter yang tidak dikirim berubah menjadi LIMIT 0 — daftar tampil
  // kosong tanpa galat apa pun, dan penyebabnya sulit dilacak.
  if (value === null || value === undefined || value === "") return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const truncated = Math.trunc(parsed);
  return truncated < 0 ? fallback : truncated;
}
