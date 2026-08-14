import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { requiredInt } from "./common.schema";

/**
 * Kontrak API untuk gudang (warehouse).
 *
 * Kedua endpoint di berkas route hanya MEMBACA daftar stok, jadi susunan empat
 * lapis (Base/Create/Update/Response) tidak seluruhnya berlaku di sini: tidak
 * ada data yang dibuat maupun diubah, sehingga lapis Create dan Update tidak
 * punya isi. Yang tetap dipakai adalah lapis Base — penyaring daftarnya ditulis
 * sekali lalu dipakai kedua endpoint, karena rantai validator lama pada
 * keduanya memang sama persis, kata demi kata. Menyalinnya dua kali berarti
 * salah satu bisa diam-diam berubah sendiri di kemudian hari.
 *
 * Lapis Response sengaja tidak dibuat. Kedua controller merakit balasannya dari
 * hasil pencarian Meilisearch yang digabung dengan beberapa tabel, dan
 * bentuknya berbeda antar peran pengguna; menuliskannya sebagai satu skema
 * sekarang hanya akan menghasilkan tipe yang tidak dipercaya siapa pun.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutannya mengikuti rantai validator yang digantikan:
 * keyword lebih dulu, baru page.
 */

/**
 * `keyword` hanya diperiksa keberadaannya, meniru `exists()` pada rantai lama.
 *
 * `exists()` tanpa opsi di express-validator hanya menolak nilai `undefined`.
 * String kosong justru merupakan pemakaian yang wajar di sini — itulah cara
 * klien meminta daftar tanpa penyaring — sehingga aturannya tidak boleh
 * dinaikkan menjadi requiredText(). Nilai `null` pun lolos pada rantai lama, dan
 * itu ditiru apa adanya supaya klien yang selama ini mengirim null tidak
 * mendadak ditolak.
 */
const kataKunci = z.any().refine((nilai) => nilai !== undefined, {
  message: ErrorList["Keyword is required"],
});

/**
 * `page` memakai dua pesan berbeda karena rantai lama memasang dua aturan
 * berurutan pada bidang yang sama: notEmpty() lalu isInt({ min: 0 }).
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA: nilai teks seperti `"5"` sekarang
 * ditolak. express-validator mengubah setiap nilai menjadi string sebelum
 * memeriksanya, sehingga `"5"` dan `5` sama-sama lolos isInt. Di badan JSON
 * pembedaan itu justru merugikan — controller memakai `page` untuk berhitung
 * (`(page - 1) * pageSize`), dan nilai teks yang lolos akan diam-diam ikut
 * dihitung lewat pemaksaan tipe JavaScript. Pemaksaan tipe tidak dipakai pada
 * badan JSON karena JSON sudah membawa tipe aslinya; menerima `"5"` sebagai
 * angka hanya akan menyembunyikan kesalahan di sisi pemanggil. Status dan
 * kalimat galatnya tetap sama seperti sebelumnya: 400 dengan
 * "Page must be numeric".
 *
 * Batas bawah tetap 0, bukan 1, meskipun controller menghitung
 * `(page - 1) * pageSize` sehingga page 0 menghasilkan offset negatif.
 * Menaikkannya menjadi 1 akan menolak permintaan yang selama ini diterima;
 * perbaikannya perlu diputuskan bersama sisi klien, terpisah dari migrasi ini.
 */
const halaman = requiredInt(
  ErrorList["Page is required"],
  ErrorList["Page must be numeric"],
  0
);

/**
 * Penyaring daftar stok gudang — bidang bersama kedua endpoint.
 *
 * `pageSize` tidak ikut divalidasi walaupun controller memakainya. Rantai lama
 * juga tidak memeriksanya, dan menambahkannya di sini berarti menolak
 * permintaan yang selama ini diterima.
 */
const stokGudangBase = z.object({
  keyword: kataKunci,
  page: halaman,
});

/** POST /warehouse/product-stock */
export const listWarehouseStockSchema = stokGudangBase;

/** POST /warehouse/product-stock/inadequate */
export const listInadequateWarehouseStockSchema = stokGudangBase;

export type WarehouseStockList = z.infer<typeof listWarehouseStockSchema>;
