import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { requiredIntFromText, required } from "./common.schema";

/**
 * Kontrak API untuk domain stok produk dan kartu stok.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutannya mengikuti rantai validator yang digantikan.
 *
 * Kebijakan ketat pada req.body berlaku di sini — lihat penjelasannya di
 * common.schema.ts. Yang datang lewat req.params dan req.query tetap diperiksa
 * sebagai teks.
 */

/**
 * Pola yang dipakai validator.js untuk isNumeric() tanpa opsi.
 *
 * `Number()` tidak bisa menggantikannya: `Number(" 1")` dan `Number("1e5")`
 * menghasilkan angka yang sah padahal isNumeric() menolak keduanya.
 */
const polaNumerik = /^[+-]?([0-9]*[.])?[0-9]+$/;

/**
 * Parameter `:id` pada GET /product/:id, GET /package/:id, dan GET /:id.
 *
 * Ketiganya memakai rantai yang sama persis, jadi satu skema dipakai bersama.
 *
 * CACAT PADA RANTAI LAMA YANG DIPERTAHANKAN — pesan tertukar. Rantai aslinya
 * berbunyi:
 *
 *   param("id").exists().isNumeric().withMessage(ErrorList["ID is required"])
 *   param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"])
 *
 * `.withMessage()` hanya berlaku untuk validator TEPAT SEBELUMNYA, jadi pesan
 * "ID is required" sebenarnya melekat pada isNumeric(), bukan pada exists().
 * Akibatnya `/product/abc` menjawab "ID diperlukan" padahal id-nya jelas ada.
 * Pesannya tidak diperbaiki di sini supaya migrasi ini tidak mencampur dua
 * perubahan; perbaikannya perlu naik bersama frontend.
 *
 * exists() sendiri tidak pernah gagal pada parameter jalur — Express tidak akan
 * mencocokkan rutenya kalau `:id` tidak ada — sehingga pesan bawaannya yang
 * tidak pernah diganti ("Invalid value") juga tidak pernah muncul.
 */
export const paramStockSchema = z.object({
  id: z
    .any()
    .superRefine((nilai, ctx) => {
      if (!polaNumerik.test(String(nilai))) {
        ctx.addIssue({ code: "custom", message: ErrorList["ID is required"] });
      }

      const angka = Number(nilai);
      if (!Number.isInteger(angka) || angka < 1) {
        ctx.addIssue({
          code: "custom",
          message: ErrorList["ID must be numeric"],
        });
      }
    })
    .transform((nilai) => Number(nilai)),
});

/**
 * Penyaring daftar pada GET / dan GET /:id.
 *
 * Rantai lama kedua endpoint sama persis, jadi satu skema dipakai bersama.
 * Berbeda dengan listQuery di common.schema.ts, keduanya WAJIB dikirim di
 * sini dan masing-masing punya dua pesan — notEmpty() lalu isInt() — sehingga
 * dipakai requiredIntFromText.
 *
 * Batas bawah pageSize adalah 10 tanpa batas atas, persis seperti rantai lama.
 * Artinya klien masih bisa meminta satu juta baris sekaligus; menambahkan batas
 * atas berarti menolak permintaan yang selama ini diterima.
 *
 * Catatan: requiredIntFromText memakai `Number()`, yang sedikit lebih longgar
 * daripada isInt() untuk bentuk aneh seperti "1e5" atau " 1". Sifat itu berlaku
 * di seluruh repo dan bukan sesuatu yang dibuat di berkas ini.
 */
export const stockListQuerySchema = z.object({
  page: requiredIntFromText(
    ErrorList["Page is required"],
    ErrorList["Page must be numeric"],
    1
  ),
  pageSize: requiredIntFromText(
    ErrorList["Page size is required"],
    ErrorList["Page size must be numeric"],
    10
  ),
});

/**
 * Larik bilangan bulat — meniru rantai exists(), isArray(), lalu custom().
 *
 * PENTING: larik KOSONG lolos. Rantai lama memeriksa isinya dengan
 * `value.every(Number.isInteger)`, dan `[].every()` selalu bernilai true.
 * Perilaku itu dipertahankan: larik kosong memang cara klien mengatakan "tanpa
 * penyaring merek", bukan kesalahan.
 *
 * exists() hanya menolak `undefined`, sehingga `null` lolos aturan pertama dan
 * baru gagal pada isArray(). Urutan itu ikut ditiru: pesan "is required" hanya
 * muncul kalau bidangnya benar-benar tidak dikirim.
 *
 * Number.isInteger() sudah menolak "2" berupa teks pada rantai lama, jadi di
 * sini tidak ada perbedaan perilaku terhadap kebijakan ketat req.body.
 */
const larikBilanganBulat = (
  pesanAda: string,
  pesanLarik: string,
  pesanBulat: string
) =>
  z.any().superRefine((nilai, ctx) => {
    if (nilai === undefined) {
      ctx.addIssue({ code: "custom", message: pesanAda });
    }

    if (!Array.isArray(nilai)) {
      ctx.addIssue({ code: "custom", message: pesanLarik });
      return;
    }

    if (!nilai.every((item: unknown) => Number.isInteger(item))) {
      ctx.addIssue({ code: "custom", message: pesanBulat });
    }
  });

/**
 * Penyaring merek dan tipe — bidang bersama POST /problematic dan
 * POST /inadequate.
 *
 * Rantai lama kedua endpoint disalin kata demi kata, termasuk keenam aturannya.
 * Disatukan di sini supaya salah satunya tidak diam-diam berubah sendiri.
 */
const stockFilterBase = z.object({
  brands: larikBilanganBulat(
    ErrorList["Brand is required"],
    ErrorList["Brand must be an array"],
    ErrorList["Brand must be an integer"]
  ),
  types: larikBilanganBulat(
    ErrorList["Type is required"],
    ErrorList["Type must be an array"],
    ErrorList["Type must be an integer"]
  ),
});

/** POST /stock/problematic */
export const problematicStockSchema = stockFilterBase;

/** POST /stock/inadequate */
export const inadequateStockSchema = stockFilterBase;

/**
 * POST /stock/mutation
 *
 * `viewBy` memakai dua pesan berbeda karena rantai lamanya memasang dua aturan
 * berurutan: notEmpty() lalu isIn(["date", "created"]).
 *
 * Kebijakan ketat berlaku pada perbandingan nilainya: isIn() mengubah nilai
 * menjadi teks lebih dulu, sehingga `["date"]` ikut lolos pada rantai lama. Di
 * sini hanya teks "date" dan "created" yang diterima.
 *
 * `date` hanya diperiksa keberadaannya, meniru notEmpty(). Bentuk tanggalnya
 * tidak divalidasi pada rantai lama dan tidak ditambahkan di sini.
 */
export const stockMutationSchema = z.object({
  date: required(ErrorList["Date required"]),
  viewBy: z.any().superRefine((nilai, ctx) => {
    if (nilai === undefined || nilai === null || String(nilai) === "") {
      ctx.addIssue({
        code: "custom",
        message: ErrorList["View by mutation required"],
      });
      return;
    }

    if (nilai !== "date" && nilai !== "created") {
      ctx.addIssue({
        code: "custom",
        message:
          ErrorList[
            "View by mutation must be either document date or creation date"
          ],
      });
    }
  }),
});

export type StockListQuery = z.infer<typeof stockListQuerySchema>;
export type ProblematicStock = z.infer<typeof problematicStockSchema>;
export type StockMutation = z.infer<typeof stockMutationSchema>;
