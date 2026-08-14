import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { present, requiredText, required } from "./common.schema";

/**
 * Kontrak API untuk produk dan pengeluaran.
 *
 * Dua catatan penting tentang cara rantai lama bekerja, karena keduanya mudah
 * salah ditiru.
 *
 * PERTAMA: isNumeric() menerima teks. Pada express-validator, isNumeric()
 * berlaku pada nilai yang sudah diubah menjadi teks, sehingga "5" lolos dan
 * 5 juga lolos. Skema di sini karenanya tidak memakai z.number(), yang akan
 * menolak "5" dan diam-diam menolak permintaan yang selama ini diterima.
 *
 * KEDUA: isNumeric() juga menerima pecahan. Hanya isInt() yang menyaringnya.
 * Bidang yang rantai lamanya hanya memakai isNumeric() tetap menerima 1.5 di
 * sini.
 */

/** Angka dalam bentuk apa pun — meniru isNumeric(), pecahan diterima. */
const angka = (pesan: string) =>
  z
    .any()
    .refine(
      (nilai) =>
        nilai !== undefined &&
        nilai !== null &&
        String(nilai).trim() !== "" &&
        !isNaN(Number(nilai)),
      { message: pesan }
    );

/** Bilangan bulat minimal 1 — meniru isInt({ min: 1 }). */
const bulatMin1 = (pesan: string) =>
  z
    .any()
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      message: pesan,
    });

/* ================================================================== */
/* Produk                                                              */
/* ================================================================== */

/**
 * product.reference    VarChar(50)
 * product.description  VarChar(191)
 * product.unit         VarChar(45)
 */
const PANJANG_PRODUK = {
  reference: 50,
  description: 191,
  unit: 45,
} as const;

/**
 * POST /product
 *
 * Rantai lama memasang exists() lalu notEmpty() pada reference dan
 * description; keduanya memakai pesan yang sama sehingga urutannya tidak
 * mengubah kalimat yang muncul.
 */
export const createProductSchema = z.object({
  reference: requiredText(ErrorList["Parameter error"]).max(
    PANJANG_PRODUK.reference,
    ErrorList["Product reference too long"]
  ),
  description: requiredText(ErrorList["Parameter error"]).max(
    PANJANG_PRODUK.description,
    ErrorList["Product description too long"]
  ),
  product_type_id: present(ErrorList["Parameter error"]),
  product_brand_id: present(ErrorList["Parameter error"]),
  minimum_stock: present(ErrorList["Parameter error"]),
  unit: present(ErrorList["Parameter error"]),
  sales_price: present(ErrorList["Parameter error"]),
  purchase_price: present(ErrorList["Parameter error"]),
  sales_discount: present(ErrorList["Parameter error"]),
  purchase_discount: present(ErrorList["Parameter error"]),
});

/**
 * PUT /product
 *
 * Berbeda dari POST: pesannya spesifik per bidang, bukan "Parameter error".
 * Perbedaan itu dipertahankan.
 */
export const updateProductSchema = z.object({
  // Rantai lama: body("id").exists().isNumeric().withMessage("ID is required")
  //
  // .withMessage() hanya berlaku pada validator TERAKHIR dalam rantai, yaitu
  // isNumeric(). exists() karenanya tidak punya pesan dan jatuh ke bawaan
  // express-validator, "Invalid value" — teks bahasa Inggris yang muncul ke
  // pengguna ketika id sama sekali tidak dikirim.
  //
  // Perilaku itu ditiru apa adanya agar tidak ada yang berubah tanpa
  // keputusan. Pola yang sama ada di empat tempat lain: user.route.ts:64 dan
  // stock.route.ts baris 30, 38, 46.
  id: z
    .any()
    .refine((nilai) => nilai !== undefined, { message: "Invalid value" })
    .refine(
      (nilai) =>
        nilai !== null && String(nilai).trim() !== "" && !isNaN(Number(nilai)),
      { message: ErrorList["ID is required"] }
    )
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      message: ErrorList["ID must be numeric"],
    }),
  reference: requiredText(ErrorList["Product reference is required"]).max(
    PANJANG_PRODUK.reference,
    ErrorList["Product reference too long"]
  ),
  description: requiredText(ErrorList["Product description is required"]).max(
    PANJANG_PRODUK.description,
    ErrorList["Product description too long"]
  ),
  product_brand_id: present(ErrorList["Product brand is required"]),
  product_type_id: present(ErrorList["Product type is required"]),
  minimum_stock: present(ErrorList["Product minimum stock is required"]),
  unit: present(ErrorList["Product unit is required"]),
});

/** PUT /product/active */
export const activateProductSchema = z.object({
  id: angka(ErrorList["Parameter error"]).refine(
    (nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1,
    { message: ErrorList["Parameter error"] }
  ),
});

/**
 * PUT /product/price-sales dan /product/price-purchase
 *
 * Rantai lama memakai sintaks jokerin express-validator: body("items.*.price").
 * Di sini diterjemahkan menjadi larik objek. Perilakunya setara selama
 * `items` memang berupa larik; bila bukan, pesan "Parameter error" muncul
 * lebih dulu, sama seperti sebelumnya.
 */
export const updateProductPriceSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: required(ErrorList["Item ID required"]).refine(
          (nilai) => !isNaN(Number(nilai)),
          { message: ErrorList["Item ID must be numeric"] }
        ),
        // Rantai lama memakai isFloat({ min: 0 }), bukan isNumeric(). Harga
        // dan diskon negatif karenanya DITOLAK. Memakai pemeriksaan angka
        // biasa akan meloloskan nilai negatif yang selama ini ditolak.
        price: required(ErrorList["Price required"]).refine(
          (nilai) => !isNaN(Number(nilai)) && Number(nilai) >= 0,
          { message: ErrorList["Price must be numeric"] }
        ),
        discount: required(ErrorList["Discount required"]).refine(
          (nilai) => !isNaN(Number(nilai)) && Number(nilai) >= 0,
          { message: ErrorList["Discount must be numeric"] }
        ),
      })
    )
    .refine(() => true, { message: ErrorList["Parameter error"] }),
});

/*
  Kedua skema di bawah sebelumnya tinggal di product-price.schema.ts padahal
  hanya product.route.ts yang memakainya — berkas skema harga tidak pernah
  menyentuhnya. Helper `angka` yang dibutuhkan deleteProductSchema tidak ikut
  pindah karena berkas ini sudah punya salinan yang isinya sama persis; kedua
  berkas ternyata menyimpan definisi kembar sejak awal.
*/

/** GET /product/:id — pesannya berbeda dari DELETE pada berkas yang sama. */
export const getProductSchema = z.object({
  id: required(ErrorList["ID is required"]).refine(
    (nilai) => !isNaN(Number(nilai)),
    { message: ErrorList["ID must be numeric"] }
  ),
});

/** DELETE /product/:id */
export const deleteProductSchema = z.object({
  id: angka(ErrorList["Parameter error"]).refine(
    (nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1,
    { message: ErrorList["Parameter error"] }
  ),
});
