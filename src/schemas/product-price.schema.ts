import { z } from "zod";
import ErrorList from "../constants/error_list";
import { requiredInt, requiredIntFromText, required } from "./common.schema";

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
/* Harga per satuan produk                                             */
/* ================================================================== */

/**
 * PUT /product-price-purchase dan PUT /product-price-sales.
 *
 * JANGAN tertukar dengan updateProductPriceSchema di atas. Keduanya sama-sama "ubah
 * harga", tetapi badan permintaannya berbeda dan tidak saling menggantikan:
 *
 *   updateProductPriceSchema         { items: [{ product_id, price, discount }] }
 *                           dipakai PUT /product/price-purchase dan
 *                           PUT /product/price-sales (product.route.ts)
 *
 *   updateUnitPriceSchema   { product_id, data: [{ product_unit_id, price,
 *                           discount }] }
 *                           dipakai PUT /product-price-purchase dan
 *                           PUT /product-price-sales (berkas route terpisah)
 *
 * Rantai lama pada kedua berkas route itu identik baris demi baris, jadi satu
 * skema dipakai berdua. Kalau salah satunya nanti berubah, pisahkan dulu
 * skemanya — jangan menambah cabang di sini.
 *
 * URUTAN PEMERIKSAAN MENENTUKAN PESAN YANG MUNCUL, dan urutannya BUKAN
 * per-baris melainkan per-bidang. express-validator memasang tujuh rantai
 * terpisah yang masing-masing menyapu SELURUH larik sebelum rantai berikutnya
 * jalan. Jadi pada `data: [{ price hilang }, { product_unit_id hilang }]`
 * yang muncul adalah pesan product_unit_id — milik baris KEDUA — karena
 * rantai product_unit_id berjalan lebih dulu daripada rantai price.
 *
 * Skema per-baris dengan z.array(z.object(...)) akan memeriksa baris pertama
 * sampai tuntas lebih dulu dan membalikkan pesan itu. Karena itu di sini
 * dipakai superRefine dengan satu lintasan per bidang, meniru urutan aslinya.
 */
const dataHargaSatuan = z.any().superRefine((nilai, ctx) => {
  const salah = (pesan: string) =>
    ctx.addIssue({ code: "custom", message: pesan });

  /*
    Jokerin `data.*.x` hanya mekar bila nilainya larik ATAU objek biasa; untuk
    teks, angka, null, dan undefined ia mekar menjadi nol bidang sehingga
    seluruh rantai bidang terlewat dan hanya custom() di bawah yang bersuara.
    Perilaku itu ditiru di sini — tanpa ini, `data: "abc"` akan menghasilkan
    "Product unit ID is required" padahal dulu "Data must be an array".
  */
  const baris: unknown[] = Array.isArray(nilai)
    ? nilai
    : nilai !== null && typeof nilai === "object"
    ? Object.values(nilai as Record<string, unknown>)
    : [];

  const ambil = (b: unknown, kunci: string): unknown =>
    b !== null && typeof b === "object"
      ? (b as Record<string, unknown>)[kunci]
      : undefined;

  /* exists(): hanya undefined yang gagal. null dan "" lolos, dan itu memang
     perilaku lama — menaikkannya menjadi notEmpty() akan menolak permintaan
     yang selama ini diterima. */
  for (const b of baris) {
    if (ambil(b, "product_unit_id") === undefined) {
      salah(ErrorList["Product unit ID is required"]);
    }
  }

  /* notEmpty(): nilai diubah ke teks dulu, jadi undefined, null, "", dan []
     sama-sama dianggap kosong. */
  const kosong = (v: unknown) =>
    v === undefined || v === null || String(v) === "";

  for (const b of baris) {
    if (kosong(ambil(b, "price"))) {
      salah(ErrorList["Price is required"]);
    }
  }

  /*
    KEBIJAKAN KETAT (lihat common.schema.ts): angka harus benar-benar angka.

    Rantai lama memakai isFloat({ min: 0 }) yang meloloskan "1000", lalu
    custom() di bawahnya menolaknya lagi dengan pesan mentah berbahasa Inggris
    "Price and discount must be numbers". Jadi teks angka SUDAH ditolak
    sebelumnya; yang berubah hanya pesannya, kini memakai key i18n yang bisa
    diterjemahkan frontend. Status tetap 400.

    Pecahan tetap diterima: isFloat, bukan isInt. Harga 1500.5 sah.
  */
  const bukanAngkaTakNegatif = (v: unknown) =>
    !z.number().min(0).safeParse(v).success;

  for (const b of baris) {
    if (bukanAngkaTakNegatif(ambil(b, "price"))) {
      salah(ErrorList["Price must be numeric"]);
    }
  }

  /* discount memakai exists(), bukan notEmpty() — asimetri yang ada di rantai
     lama. Akibatnya `discount: null` menghasilkan "Discount must be numeric",
     sedangkan `price: null` menghasilkan "Price is required". */
  for (const b of baris) {
    if (ambil(b, "discount") === undefined) {
      salah(ErrorList["Discount required"]);
    }
  }

  for (const b of baris) {
    if (bukanAngkaTakNegatif(ambil(b, "discount"))) {
      salah(ErrorList["Discount must be numeric"]);
    }
  }

  /*
    Sisa custom() lama. Pesannya sengaja dibiarkan berupa teks mentah, bukan
    key ErrorList: mengubahnya berarti mengubah kalimat yang dilihat pengguna,
    dan itu keputusan terpisah dari migrasi ini.

    Pemeriksaan typeof pada custom() lama tidak ikut disalin. Ia menolak hal
    yang sama dengan lintasan angka di atas, hanya lebih lambat, sehingga
    pesannya tidak akan pernah terpakai.
  */
  if (!Array.isArray(nilai)) {
    salah("Data must be an array");
    return;
  }

  for (const b of nilai) {
    const price = ambil(b, "price");
    const discount = ambil(b, "discount");

    if (
      typeof price === "number" &&
      typeof discount === "number" &&
      discount > price
    ) {
      /*
        CACAT LAMA YANG DIPERTAHANKAN: baris di sini bernama product_unit_id,
        bukan product_id, sehingga pesannya selalu berakhir "for product_id
        undefined". Ditiru apa adanya supaya kalimatnya tidak berubah;
        perbaikannya perlu disepakati dengan sisi klien lebih dulu.
      */
      salah(
        `Discount (${discount}) must be less than price (${price}) for product_id ${ambil(
          b,
          "product_id"
        )}`
      );
    }
  }
});

export const updateUnitPriceSchema = z.object({
  /*
    product_id lebih dulu daripada data: rantai lama memasang keduanya dalam
    urutan itu, dan pada badan yang dua-duanya salah pesan product_id yang
    muncul.
  */
  product_id: requiredInt(
    ErrorList["Product ID is required"],
    ErrorList["Product ID must be numeric"],
    0
  ),
  data: dataHargaSatuan,
});

/**
 * GET /product-price-sales/:id
 *
 * Sumbernya req.params, jadi nilainya selalu teks dan varian *FromText yang
 * dipakai — kebijakan ketat hanya berlaku pada req.body.
 */
export const getSalesPriceSchema = z.object({
  id: requiredIntFromText(
    ErrorList["ID is required"],
    ErrorList["ID must be numeric"],
    1
  ),
});

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
