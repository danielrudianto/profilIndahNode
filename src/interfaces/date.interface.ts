/** Nilai batas periode, siap disisipkan sebagai parameter query. */
export interface RentangTanggal {
  /** Awal periode, ikut terhitung. */
  mulai: Date;
  /** Batas atas, TIDAK ikut terhitung. */
  sebelum: Date;
}
