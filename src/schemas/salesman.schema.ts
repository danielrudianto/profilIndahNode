import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { requiredText } from "./common.schema";

/**
 * Kontrak API untuk domain salesman.
 *
 * Berbeda dengan data master lain, salesman tidak punya tabel di
 * prisma/schema.prisma. Daftarnya disimpan sebagai satu Redis set bernama
 * "salesmanList" yang isinya nama telanjang — tanpa id, tanpa jejak audit.
 * Karena itu tidak ada lebar kolom yang bisa dijadikan acuan batas panjang,
 * dan skema di sini sengaja tidak memasang .max(): angka berapa pun yang
 * dipilih akan jadi tebakan, dan tebakan yang terlalu pendek akan menolak nama
 * yang sudah telanjur tersimpan di Redis.
 *
 * Susunannya tetap mengikuti lapis Base agar aturan `name` ditulis sekali.
 * Lapis Update tidak ada: nama adalah kuncinya sendiri di dalam set, jadi
 * "mengubah" salesman berarti menghapus lalu menambah.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal. Kedua endpoint di bawah hanya punya satu bidang, jadi urutannya
 * belum berpengaruh — tetapi lapis Base disebar dengan `...shape` supaya
 * bidang yang kelak ditambahkan di depan tidak diam-diam berpindah ke
 * belakang seperti yang terjadi dengan .extend().
 */

/** Bidang yang dimiliki bersama oleh permintaan tambah dan hapus. */
const salesmanBase = z.object({
  name: requiredText(ErrorList["Salesman name required"]),
});

/**
 * POST /salesman
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA — dua hal, keduanya berasal dari
 * `notEmpty()` yang memeriksa nilai SETELAH diubah menjadi teks:
 *
 *   1. Nama yang hanya berisi spasi ("   ") dulu lolos, karena teks tiga
 *      spasi memang bukan teks kosong. Nama seperti itu masuk ke Redis set
 *      dan muncul di daftar sebagai baris kosong yang tidak bisa dicari
 *      maupun dihapus lewat antarmuka. requiredText memangkas spasi lebih dulu,
 *      sehingga nilai itu kini ditolak.
 *
 *   2. Nilai yang bukan teks — angka 123, `true`, atau objek — dulu lolos
 *      karena diubah menjadi "123", "true", dan "[object Object]" yang
 *      ketiganya tidak kosong. Nilai terakhir benar-benar tersimpan sebagai
 *      nama salesman berbunyi "[object Object]". z.string() menolaknya di
 *      muka.
 *
 * Statusnya tetap 400 dan kalimatnya tetap key yang sama; yang berubah hanya
 * masukan mana saja yang dianggap sah.
 */
export const createSalesmanSchema = z.object({
  ...salesmanBase.shape,
});

/**
 * POST /salesman/delete
 *
 * Aturannya sama persis dengan endpoint buat, termasuk kedua perubahan
 * perilaku di atas. Rantai lama pun menulis baris validator yang identik.
 * Keduanya tetap diberi nama sendiri supaya aturan hapus bisa berbeda dari
 * aturan buat tanpa perlu membongkar route.
 */
export const deleteSalesmanSchema = z.object({
  ...salesmanBase.shape,
});

/**
 * Bentuk balasan GET /salesman dan GET /salesman/all.
 *
 * Redis set hanya bisa menyimpan teks, jadi balasannya selalu deretan nama
 * yang sudah diurutkan. Belum dipakai untuk memvalidasi keluaran — nilainya
 * sekarang ada pada tipe `SalesmanList` di bawah, yang bisa dipakai
 * controller sebagai ganti `any`.
 */
export const salesmanResponseSchema = z.array(z.string());

export type CreateSalesman = z.infer<typeof createSalesmanSchema>;
export type DeleteSalesman = z.infer<typeof deleteSalesmanSchema>;
export type SalesmanList = z.infer<typeof salesmanResponseSchema>;
