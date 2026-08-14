import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { intFromText, requiredInt, requiredText } from "./common.schema";

/**
 * Kontrak API untuk merek produk, tipe produk, dan tipe pengeluaran.
 *
 * Ketiganya bentuknya paling sederhana di antara data master, tetapi rantai
 * validasinya justru paling tidak seragam. Perbedaan yang ditiru apa adanya:
 *
 *   product_brand   param id memakai exists() lalu isInt
 *   product_type    param id memakai isNumeric() lalu isInt
 *   expense_type    param id memakai isNumeric(), tetapi pesannya berbeda:
 *                   "ID is required" lalu "ID must be integer"
 *
 * isNumeric() dan exists() tidak setara. isNumeric() menolak "abc" tetapi
 * menerima "1.5"; pemeriksaan isInt sesudahnya yang menyaring pecahan. Karena
 * pesan keduanya sama pada dua berkas pertama, perbedaan itu tidak terlihat
 * dari luar — tetapi pada expense_type pesannya berbeda, sehingga urutan
 * pemeriksaan menentukan kalimat yang dilihat pengguna.
 *
 * Batas panjang mengikuti lebar kolom di prisma/schema.prisma:
 *   product_brand.name  VarChar(45)
 *   product_type.name   VarChar(45)
 *   expense_type.name   VarChar(100)
 *   expense_type.description  Text — tanpa batas praktis
 */

const PANJANG = {
  merek: 45,
  tipeProduk: 45,
  tipePengeluaran: 100,
} as const;

/* ------------------------------------------------------------------ */
/* Tipe produk                                                         */
/* ------------------------------------------------------------------ */

/**
 * POST dan PUT /product-type sama sekali tidak divalidasi pada rantai lama —
 * dua-duanya satu-satunya jalur tulis data master yang lolos tanpa pemeriksaan.
 * Badan tanpa `name` diteruskan apa adanya ke Prisma, yang menolaknya sebagai
 * galat basis data, sehingga pengguna menerima 500 untuk kesalahan pengisian
 * yang seharusnya dijawab 400.
 *
 * Karena tidak ada rantai lama yang perlu ditiru, kedua skema di bawah ditulis
 * lurus: tidak ada urutan pemeriksaan aneh yang harus dipertahankan.
 *
 * PERUBAHAN PERILAKU. Permintaan yang selama ini diterima kini ditolak —
 * `name` kosong, `name` yang bukan teks, dan `name` melebihi lebar kolom
 * VarChar(45). Sesuai kebijakan di common.schema.ts, `name` berupa angka pun
 * ditolak; sebelum ini nilai seperti itu tersimpan sebagai teks.
 */
export const createProductTypeSchema = z.object({
  name: requiredText(ErrorList["Parameter error"]).max(
    PANJANG.tipeProduk,
    ErrorList["Product type name too long"]
  ),
});

/**
 * PUT /product-type
 *
 * `id` diperiksa lebih dulu daripada `name` — urutan bidang di sini menentukan
 * pesan mana yang muncul untuk badan yang dua-duanya salah.
 */
export const updateProductTypeSchema = z.object({
  id: requiredInt(
    ErrorList["Parameter error"],
    ErrorList["Parameter error"],
    1
  ),
  name: requiredText(ErrorList["Parameter error"]).max(
    PANJANG.tipeProduk,
    ErrorList["Product type name too long"]
  ),
});

export const paramProductTypeSchema = z.object({
  id: intFromText(ErrorList["Parameter error"], 1),
});
