import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import {
  present,
  requiredInt,
  requiredIntFromText,
  requiredText,
  required,
} from "./common.schema";

/**
 * Kontrak API untuk domain promosi.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutannya mengikuti rantai validator yang digantikan.
 *
 * Kebijakan ketat pada req.body berlaku di sini — lihat penjelasannya di
 * common.schema.ts. Angka yang dikirim sebagai teks ditolak, begitu pula nilai
 * bukan-teks pada bidang teks.
 */

/**
 * Pola yang dipakai validator.js untuk isNumeric() tanpa opsi.
 *
 * Ditulis ulang di sini karena `Number()` terlalu longgar sebagai penggantinya:
 * `Number(" 1")` dan `Number("1e5")` menghasilkan angka yang sah, padahal
 * isNumeric() menolak keduanya. Nilai pada req.params selalu teks, jadi yang
 * ditiru harus pemeriksaan teksnya, bukan hasil konversinya.
 */
const polaNumerik = /^[+-]?([0-9]*[.])?[0-9]+$/;

/**
 * Kosong menurut notEmpty() milik express-validator.
 *
 * notEmpty() mengubah nilai menjadi teks lebih dulu, sehingga `0` dan `false`
 * TIDAK dianggap kosong (menjadi "0" dan "false"), sedangkan `null` dan larik
 * kosong dianggap kosong. String() menghasilkan penilaian yang sama.
 */
const kosong = (nilai: unknown) =>
  nilai === undefined || nilai === null || String(nilai) === "";

/**
 * Bilangan — pecahan sekalipun — dengan dua pesan berbeda, meniru rantai
 * notEmpty() lalu isNumeric().
 *
 * Sengaja TIDAK memakai `int`: isNumeric() meloloskan "1.5" dan "-3", jadi
 * menambahkan .int() atau batas bawah di sini akan menolak permintaan yang
 * selama ini diterima. Yang diketatkan hanyalah tipenya, mengikuti kebijakan
 * req.body: "5" berupa teks kini ditolak.
 */
const angkaWajib = (pesanKosong: string, pesanSalah: string) =>
  z.number({
    error: (iss) =>
      iss.input === undefined || iss.input === null || iss.input === ""
        ? pesanKosong
        : pesanSalah,
  });

/**
 * `promotion_brand` — meniru rantai notEmpty() lalu isArray().
 *
 * PENTING: express-validator memperlakukan bidang berisi LARIK sebagai KUMPULAN
 * nilai. StandardValidation memecah larik menjadi anggotanya sebelum memanggil
 * validator, sehingga notEmpty() pada larik KOSONG tidak memeriksa apa pun dan
 * lolos, sementara `[""]` gagal karena salah satu anggotanya kosong. Kedua
 * perilaku itu ditiru apa adanya di sini: larik kosong tetap diterima, karena
 * larik kosong memang jawaban yang sah untuk "belum ada merek yang dipilih".
 *
 * Nilai bukan-larik yang tidak kosong (angka, objek, teks) jatuh ke pesan
 * "must be an array", persis seperti urutan rantai lamanya.
 */
const merekPromosi = z.any().superRefine((nilai, ctx) => {
  const anggota = Array.isArray(nilai) ? nilai : [nilai];

  if (anggota.some(kosong)) {
    ctx.addIssue({
      code: "custom",
      message: ErrorList["Promotion brand is required"],
    });
    return;
  }

  if (!Array.isArray(nilai)) {
    ctx.addIssue({
      code: "custom",
      message: ErrorList["Promotion brand must be an array"],
    });
  }
});

/**
 * Bidang promosi yang dipakai bersama POST / dan PUT /.
 *
 * Rantai lama pada kedua endpoint sama persis, kata demi kata; PUT hanya
 * menambahkan `id` di depan. Disebar dengan `...promotionBase.shape` supaya
 * urutan bidangnya — dan karena itu pesan mana yang muncul lebih dulu — tetap
 * terjaga; `.extend()` menaruh bidang tambahan di belakang.
 *
 * `start_date` memakai required dan `end_date` memakai present karena rantai
 * lamanya memang berbeda: notEmpty() untuk yang pertama, exists() untuk yang
 * kedua. Akibatnya `end_date: ""` lolos sedangkan `start_date: ""` tidak.
 * Perbedaan itu ditiru apa adanya.
 */
const promotionBase = z.object({
  name: requiredText(ErrorList["Promotion name required"]),
  description: requiredText(ErrorList["Promotion description required"]),
  start_date: required(ErrorList["Promotion start date required"]),
  end_date: present(ErrorList["Promotion end date required"]),
  target: angkaWajib(
    ErrorList["Promotion target required"],
    ErrorList["Promotion target must be numeric"]
  ),
  supplier_id: angkaWajib(
    ErrorList["Supplier ID is required"],
    ErrorList["Supplier ID must be numeric"]
  ),
  promotion_brand: merekPromosi,
});

/** POST /promotion */
export const createPromotionSchema = promotionBase;

/** PUT /promotion — sama seperti POST, dengan `id` di depan. */
export const updatePromotionSchema = z.object({
  id: requiredInt(
    ErrorList["ID is required"],
    ErrorList["ID must be numeric"],
    0
  ),
  ...promotionBase.shape,
});

/**
 * Parameter `:id` pada GET /result/sales/:id, /result/purchase/:id, /result/:id
 * dan /:id.
 *
 * Keempatnya memakai rantai yang sama persis — notEmpty() lalu isNumeric() —
 * jadi satu skema dipakai bersama. Nilai pada req.params selalu teks, sehingga
 * kebijakan ketat req.body tidak berlaku di sini.
 *
 * Perlu dicatat: isNumeric() bukan isInt(). "1.5" dan "-1" lolos pada rantai
 * lama, dan itu dipertahankan supaya tidak ada permintaan yang mendadak
 * ditolak. Controller-lah yang harus menangani nilai seperti itu.
 */
export const paramPromotionSchema = z.object({
  id: z
    .any()
    .superRefine((nilai, ctx) => {
      if (kosong(nilai)) {
        ctx.addIssue({ code: "custom", message: ErrorList["ID is required"] });
        return;
      }

      if (!polaNumerik.test(String(nilai))) {
        ctx.addIssue({
          code: "custom",
          message: ErrorList["ID must be numeric"],
        });
      }
    })
    .transform((nilai) => Number(nilai)),
});

/**
 * Parameter `:id` pada pendaftaran KEDUA GET /result/:id.
 *
 * Jalur itu sudah didaftarkan lebih dulu di atas dengan rantai yang berbeda,
 * sehingga pendaftaran kedua tidak pernah tercapai — Express memakai yang
 * pertama cocok. Skema ini tetap dibuat supaya migrasi tidak diam-diam mengubah
 * berkas route lebih jauh dari sekadar mengganti lapisan validasi; pembersihan
 * jalur ganda itu perlu diputuskan terpisah.
 */
export const paramPromotionResultSchema = z.object({
  id: requiredIntFromText(
    ErrorList["ID is required"],
    ErrorList["ID must be integer"],
    0
  ),
});

export type CreatePromotion = z.infer<typeof createPromotionSchema>;
export type UpdatePromotion = z.infer<typeof updatePromotionSchema>;
