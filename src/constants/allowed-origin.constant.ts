/**
 * Daftar asal (origin) yang diizinkan CORS.
 *
 * Sebelumnya berada di app.ts. Dipindah mengikuti kesepakatan bahwa konstanta
 * punya berkasnya sendiri di constants/.
 */

/** Asal produksi — berlaku di semua lingkungan. */
const asalProduksi = [
  "https://sandbox.profilindah.id",
  "https://stock.profilindah.id",
  "https://v16.profilindah.id",
  "https://v19.profilindah.id",
  "https://v20.profilindah.id",
  "https://warehouse.profilindah.id",
];

/**
 * Asal pengembangan — HANYA di luar produksi.
 *
 * Dua alamat localhost ini dulu ikut terdaftar di produksi. Halaman yang
 * berjalan di laptop siapa pun karena itu boleh memanggil API produksi; token
 * yang sah tetap dituntut, jadi bukan pintu yang menganga, tetapi juga tidak
 * ada gunanya di sana. Yang hilang bila keduanya dicabut hanyalah kemampuan
 * menembak API produksi dari `ng serve` — dan itu memang bukan sesuatu yang
 * seharusnya bisa dilakukan tanpa disengaja.
 *
 * 5173 adalah Vite, 2100 adalah `ng serve` pada frontend Angular ini.
 */
const asalPengembangan = ["http://localhost:5173", "http://localhost:2100"];

export const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? asalProduksi
    : [...asalProduksi, ...asalPengembangan];

export default allowedOrigins;
