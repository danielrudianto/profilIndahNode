import { redisClient } from "./redis.helper";
import {
  UMUR_CACHE_LAPORAN_BERJALAN,
  UMUR_CACHE_LAPORAN_LAMPAU,
} from "../constants/cache.constant";

/**
 * Cache laporan bulanan di Redis.
 *
 * Alasannya bukan kueri yang lambat — masing-masing di bawah 250 ms. Yang
 * mahal adalah JUMLAHNYA: satu halaman laporan penjualan menembakkan tiga
 * belas agregat atas hampir sejuta baris secara serentak, dan ketiga belasnya
 * berebut CPU yang sama. Yang sendirian cepat menjadi sedetik ketika
 * berbarengan.
 *
 * Cache menyerang sebabnya, bukan gejalanya: pekerjaan yang hasilnya sama
 * tidak dikerjakan ulang.
 */

/**
 * Umur cache ditentukan bulan yang diminta, bukan angka tunggal.
 *
 * Bulan yang sudah lewat TIDAK AKAN berubah lagi — menghitungnya ulang setiap
 * kali orang membuka halaman adalah pemborosan murni, dan halaman laporan
 * penjualan meminta tiga bulan sekaligus. Bulan berjalan lain perkara: faktur
 * masih masuk sepanjang hari, jadi umurnya dibuat pendek supaya dokumen baru
 * tidak lama tersembunyi.
 */
export const umurCacheLaporan = (year: number, month: number): number => {
  const kini = new Date();
  const berjalan = year === kini.getFullYear() && month === kini.getMonth() + 1;
  return berjalan ? UMUR_CACHE_LAPORAN_BERJALAN : UMUR_CACHE_LAPORAN_LAMPAU;
};

/**
 * Membaca hasil yang tersimpan.
 *
 * Redis mati BUKAN alasan gagal: yang tidak terbaca berarti dihitung ulang,
 * persis seperti sebelum cache ini ada. Laporan tidak boleh berhenti tersaji
 * karena lapisan yang gunanya cuma mempercepat.
 */
export const dariCacheLaporan = async (kunci: string): Promise<any | null> => {
  try {
    const isi = await redisClient.get(kunci);
    return isi ? JSON.parse(isi) : null;
  } catch {
    return null;
  }
};

export const keCacheLaporan = async (
  kunci: string,
  nilai: unknown,
  umur: number
): Promise<void> => {
  try {
    await redisClient.setEx(kunci, umur, JSON.stringify(nilai));
  } catch {
    /* gagal menulis cache — biarkan; permintaan berikut menghitung ulang */
  }
};

/** `?refresh=true` dari tombol hitung ulang di layar. */
export const mintaHitungUlang = (nilai: unknown): boolean =>
  nilai === true || nilai === "true" || nilai === "1";
