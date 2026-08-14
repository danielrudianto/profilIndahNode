import { AsyncLocalStorage } from "async_hooks";

/**
 * Identitas pemanggil yang dibawa sepanjang satu permintaan.
 *
 * Pencatat jejak audit bekerja di lapisan Prisma, dan di sana tidak ada
 * `req`. Menambahkan userId sebagai parameter pada setiap method repository
 * berarti menyentuh puluhan berkas, dan jalur yang lupa dilewati tidak akan
 * pernah menimbulkan galat — ia hanya diam-diam mencatat tanpa pemilik.
 *
 * AsyncLocalStorage menyimpannya per permintaan tanpa dioper: nilai yang
 * ditulis di awal permintaan tetap terbaca di seluruh pemanggilan async yang
 * lahir darinya, termasuk di dalam middleware Prisma.
 */

export interface KonteksPermintaan {
  userId: number | null;
}

const penyimpanan = new AsyncLocalStorage<KonteksPermintaan>();

/** Menjalankan `fn` dengan konteks yang berlaku hanya di dalamnya. */
export function jalankanDenganKonteks<T>(
  konteks: KonteksPermintaan,
  fn: () => T
): T {
  return penyimpanan.run(konteks, fn);
}

/**
 * Identitas pemanggil saat ini, atau null.
 *
 * null bukan kelainan: perintah CLI di startup.ts dan pekerjaan worker menulis
 * ke basis data tanpa permintaan HTTP sama sekali, dan jejaknya tetap layak
 * dicatat — hanya saja tanpa pemilik.
 */
export function penggunaSaatIni(): number | null {
  return penyimpanan.getStore()?.userId ?? null;
}

/**
 * Menuliskan identitas pemanggil ke konteks yang sedang berjalan.
 *
 * Dipanggil oleh middleware autentikasi tepat setelah token terverifikasi.
 * Nilainya sengaja diambil dari hasil verifikasi, bukan dari kiriman client —
 * sama seperti req.body.userId, dan dengan alasan yang sama.
 *
 * Tidak melakukan apa pun bila dipanggil di luar konteks, misalnya dari
 * perintah CLI. Itu bukan kelainan: di sana memang tidak ada permintaan yang
 * sedang berjalan.
 */
export function tetapkanPengguna(userId: number | null): void {
  const konteks = penyimpanan.getStore();
  if (konteks) {
    konteks.userId = userId;
  }
}
