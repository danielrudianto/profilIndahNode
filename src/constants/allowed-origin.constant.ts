/**
 * Daftar asal (origin) yang diizinkan CORS.
 *
 * Sebelumnya berada di app.ts. Dipindah mengikuti kesepakatan bahwa konstanta
 * punya berkasnya sendiri di constants/.
 */
export const allowedOrigins = [
  "http://localhost:5173",
  "https://sandbox.profilindah.id",
  "https://stock.profilindah.id",
  "https://v16.profilindah.id",
  "https://v19.profilindah.id",
  "https://warehouse.profilindah.id",
  "http://localhost:2100",
];

export default allowedOrigins;
