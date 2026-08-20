import { existsSync } from "fs";
import path from "path";

import dotenv from "dotenv";

/**
 * Pemuat berkas lingkungan — satu-satunya tempat `.env` dibaca.
 *
 * Berkas yang dipakai ditentukan NODE_ENV:
 *
 *   NODE_ENV=production  ->  .env.production
 *   selain itu           ->  .env.development
 *
 * `.env` polos tetap dibaca SESUDAHNYA sebagai cadangan, dan karena dotenv
 * tidak menimpa nilai yang sudah ada, berkas khusus lingkungan selalu menang.
 * Susunan itu membuat mesin yang masih memakai `.env` tunggal tetap jalan
 * tanpa disentuh.
 *
 * IMPOR MODUL INI HARUS PALING ATAS pada setiap titik masuk, sebelum impor
 * apa pun yang membaca process.env saat dimuat. Sebelumnya `dotenv.config()`
 * dipanggil berserakan di empat berkas — pada app.ts bahkan setelah beberapa
 * impor lain — sehingga meili.helper.ts terpaksa memanggilnya sendiri lagi
 * supaya kuncinya terbaca. Satu pemuat di urutan pertama menghapus seluruh
 * kerapuhan urutan itu.
 *
 * Jalurnya dihitung dari __dirname, bukan dari direktori kerja: perintah CLI
 * dijalankan dari mana saja, dan `dist/utils/` maupun `src/utils/` sama-sama
 * berjarak dua tingkat dari akar proyek.
 */
const akarProyek = path.resolve(__dirname, "..", "..");

const berkasLingkungan =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

for (const berkas of [berkasLingkungan, ".env"]) {
  const jalur = path.join(akarProyek, berkas);
  if (existsSync(jalur)) {
    dotenv.config({ path: jalur });
  }
}

/** Nama berkas yang dipakai — dicetak saat server menyala, membantu diagnosis. */
export const berkasLingkunganTerpakai = berkasLingkungan;
