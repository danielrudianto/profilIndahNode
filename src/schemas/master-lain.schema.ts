import { z } from "zod";
import ErrorList from "../constants/error_list";
import { intDariTeks, teksWajib } from "./common.schema";

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
/* Merek produk                                                        */
/* ------------------------------------------------------------------ */

const merekBase = z.object({
  name: teksWajib(ErrorList["Parameter error"]).max(
    PANJANG.merek,
    ErrorList["Brand name too long"]
  ),
});

/** POST /product-brand — hanya memeriksa name. */
export const buatMerekSchema = merekBase;

/**
 * PUT /product-brand
 *
 * Rantai lama memeriksa dalam urutan: id notEmpty, name notEmpty, id isInt.
 * Pemeriksaan id terpecah dua dan disela oleh name, sehingga badan tanpa id
 * DAN tanpa name mengeluh soal id lebih dulu, sedangkan badan dengan id
 * bukan bilangan tetapi tanpa name mengeluh soal name lebih dulu.
 * Urutan itu ditiru dengan superRefine agar pemeriksaannya berjalan pada
 * saat yang sama.
 */
export const ubahMerekSchema = z
  .object({
    // .optional() diperlukan: di Zod, kunci objek tetap wajib ada walaupun
    // tipenya z.any(). Tanpa ini pemeriksaan gagal di lapisan objek dengan
    // pesan bawaan Zod, sebelum superRefine di bawah sempat berjalan — dan
    // pesan bawaan itu bukan kalimat yang selama ini dilihat pengguna.
    id: z.any().optional(),
    name: z.any().optional(),
  })
  .superRefine((nilai, ctx) => {
    const idKosong =
      nilai.id === undefined || nilai.id === null || String(nilai.id) === "";
    if (idKosong) {
      ctx.addIssue({ code: "custom", message: ErrorList["Parameter error"] });
    }

    const namaKosong =
      typeof nilai.name !== "string" || nilai.name.trim().length === 0;
    if (namaKosong) {
      ctx.addIssue({ code: "custom", message: ErrorList["Parameter error"] });
    } else if (nilai.name.length > PANJANG.merek) {
      ctx.addIssue({
        code: "custom",
        message: ErrorList["Brand name too long"],
      });
    }

    if (
      !idKosong &&
      !(Number.isInteger(Number(nilai.id)) && Number(nilai.id) >= 1)
    ) {
      ctx.addIssue({ code: "custom", message: ErrorList["Parameter error"] });
    }
  });

export const paramMerekSchema = z.object({
  id: intDariTeks(ErrorList["Parameter error"], 1),
});

/* ------------------------------------------------------------------ */
/* Tipe produk                                                         */
/* ------------------------------------------------------------------ */

/**
 * POST dan PUT /product-type sama sekali tidak divalidasi pada rantai lama.
 * Skema di bawah disediakan tetapi BELUM dipasang ke route, karena memasangnya
 * berarti menolak permintaan yang selama ini diterima. Pemasangannya perlu
 * diputuskan terpisah.
 */
export const buatTipeProdukSchema = z.object({
  name: teksWajib(ErrorList["Parameter error"]).max(
    PANJANG.tipeProduk,
    ErrorList["Product type name too long"]
  ),
});

export const paramTipeProdukSchema = z.object({
  id: intDariTeks(ErrorList["Parameter error"], 1),
});

/* ------------------------------------------------------------------ */
/* Tipe pengeluaran                                                    */
/* ------------------------------------------------------------------ */

const tipePengeluaranBase = z.object({
  name: teksWajib(ErrorList["Expense type name is required"]).max(
    PANJANG.tipePengeluaran,
    ErrorList["Expense type name too long"]
  ),
  description: teksWajib(ErrorList["Expense type description is required"]),
});

/** POST /expense-type */
export const buatTipePengeluaranSchema = tipePengeluaranBase;

/** PUT /expense-type — urutan lama: name, description, lalu id. */
export const ubahTipePengeluaranSchema = z.object({
  ...tipePengeluaranBase.shape,
  id: z
    .any()
    .refine((nilai) => nilai !== undefined && !isNaN(Number(nilai)), {
      message: ErrorList["ID is required"],
    })
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      message: ErrorList["ID must be integer"],
    }),
});

/**
 * Parameter jalur pada expense-type memakai pesan yang berbeda dari domain
 * lain: "ID is required" untuk nilai yang bukan angka, lalu "ID must be
 * integer" untuk pecahan atau nilai di bawah 1.
 */
export const paramTipePengeluaranSchema = z.object({
  id: z
    .any()
    .refine((nilai) => nilai !== undefined && !isNaN(Number(nilai)), {
      message: ErrorList["ID is required"],
    })
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      message: ErrorList["ID must be integer"],
    }),
});
