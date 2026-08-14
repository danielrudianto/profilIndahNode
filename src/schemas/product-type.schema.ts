import { z } from "zod";
import ErrorList from "../constants/error_list";
import { intFromText, requiredText } from "./common.schema";

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
 * POST dan PUT /product-type sama sekali tidak divalidasi pada rantai lama.
 * Skema di bawah disediakan tetapi BELUM dipasang ke route, karena memasangnya
 * berarti menolak permintaan yang selama ini diterima. Pemasangannya perlu
 * diputuskan terpisah.
 */
export const createProductTypeSchema = z.object({
  name: requiredText(ErrorList["Parameter error"]).max(
    PANJANG.tipeProduk,
    ErrorList["Product type name too long"]
  ),
});

export const paramProductTypeSchema = z.object({
  id: intFromText(ErrorList["Parameter error"], 1),
});
