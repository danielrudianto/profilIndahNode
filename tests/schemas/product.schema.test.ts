import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import { balas, buatBanding } from "../support/schema-comparison.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import {
  activateProductSchema,
  createProductSchema,
  deleteProductSchema,
  getProductSchema,
  updateProductPriceSchema,
  updateProductSchema,
} from "../../src/schemas/product.schema";

/**
 * Perbandingan perilaku untuk produk.
 *
 * Dua sifat express-validator yang mudah salah ditiru dan diuji khusus di sini:
 *
 *   isNumeric() menerima TEKS. "5" lolos, sama seperti 5. Memakai z.number()
 *   akan menolak "5" dan diam-diam menolak permintaan yang selama ini
 *   diterima — dan frontend memang mengirim sebagian nilai sebagai teks.
 *
 *   isNumeric() menerima PECAHAN. Hanya isInt() yang menyaringnya.
 *
 * GET dan DELETE /product/:id memakai pasangan pesan yang BERBEDA satu sama
 * lain meski berada di berkas route yang sama — "ID is required"/"ID must be
 * numeric" versus "Parameter error". Perbedaan itu ditiru apa adanya.
 */

function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/produk",
    body("reference").exists().withMessage(ErrorList["Parameter error"]),
    body("reference").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("description").exists().withMessage(ErrorList["Parameter error"]),
    body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("product_type_id").exists().withMessage(ErrorList["Parameter error"]),
    body("product_brand_id").exists().withMessage(ErrorList["Parameter error"]),
    body("minimum_stock").exists().withMessage(ErrorList["Parameter error"]),
    body("unit").exists().withMessage(ErrorList["Parameter error"]),
    body("sales_price").exists().withMessage(ErrorList["Parameter error"]),
    body("purchase_price").exists().withMessage(ErrorList["Parameter error"]),
    body("sales_discount").exists().withMessage(ErrorList["Parameter error"]),
    body("purchase_discount")
      .exists()
      .withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/produk",
    body("id").exists().isNumeric().withMessage(ErrorList["ID is required"]),
    body("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
    body("reference")
      .exists()
      .withMessage(ErrorList["Product reference is required"]),
    body("reference")
      .notEmpty()
      .withMessage(ErrorList["Product reference is required"]),
    body("description")
      .exists()
      .withMessage(ErrorList["Product description is required"]),
    body("description")
      .notEmpty()
      .withMessage(ErrorList["Product description is required"]),
    body("product_brand_id")
      .exists()
      .withMessage(ErrorList["Product brand is required"]),
    body("product_type_id")
      .exists()
      .withMessage(ErrorList["Product type is required"]),
    body("minimum_stock")
      .exists()
      .withMessage(ErrorList["Product minimum stock is required"]),
    body("unit").exists().withMessage(ErrorList["Product unit is required"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/produk/active",
    body("id").isNumeric().withMessage(ErrorList["Parameter error"]),
    body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/produk/:id",
    param("id").notEmpty().withMessage(ErrorList["ID is required"]),
    param("id").isNumeric().withMessage(ErrorList["ID must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.delete(
    "/produk/:id",
    param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/produk", validate(createProductSchema), balas);
  app.put("/produk", validate(updateProductSchema), balas);
  app.put("/produk/active", validate(activateProductSchema), balas);
  app.get("/produk/:id", validate(getProductSchema, "params"), balas);
  app.delete("/produk/:id", validate(deleteProductSchema, "params"), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();
const banding = buatBanding(lama, baru);

const produkLengkap = {
  reference: "HB-001",
  description: "Huben pipa 1 inch",
  product_type_id: 1,
  product_brand_id: 2,
  minimum_stock: 10,
  unit: "batang",
  sales_price: 50000,
  purchase_price: 40000,
  sales_discount: 0,
  purchase_discount: 0,
};

describe("Produk — buat", () => {
  const kasus: Array<[string, any]> = [
    ["lengkap", produkLengkap],
    ["tanpa reference", { ...produkLengkap, reference: undefined }],
    ["reference kosong", { ...produkLengkap, reference: "" }],
    ["tanpa description", { ...produkLengkap, description: undefined }],
    [
      "minimum_stock nol tetap diterima",
      { ...produkLengkap, minimum_stock: 0 },
    ],
    ["sales_discount nol diterima", { ...produkLengkap, sales_discount: 0 }],
    ["unit kosong tetap diterima", { ...produkLengkap, unit: "" }],
    ["tanpa unit ditolak", { ...produkLengkap, unit: undefined }],
    ["badan kosong", {}],
  ];
  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await banding("post", "/produk", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Produk — ubah", () => {
  const lengkap = { ...produkLengkap, id: 1 };
  const kasus: Array<[string, any]> = [
    ["lengkap", lengkap],
    ["id berupa teks", { ...lengkap, id: "3" }],
    ["id nol", { ...lengkap, id: 0 }],
    ["id pecahan", { ...lengkap, id: 1.5 }],
    ["id bukan angka", { ...lengkap, id: "abc" }],
    ["tanpa id", produkLengkap],
    ["tanpa reference", { ...lengkap, reference: undefined }],
    ["tanpa unit", { ...lengkap, unit: undefined }],
  ];
  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await banding("put", "/produk", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Produk — aktif dan parameter jalur", () => {
  for (const badan of [{ id: 1 }, { id: "2" }, { id: 0 }, { id: 1.5 }, {}]) {
    it(`active ${JSON.stringify(badan)}`, async () => {
      const h = await banding("put", "/produk/active", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  for (const jalur of [
    "/produk/1",
    "/produk/0",
    "/produk/abc",
    "/produk/1.5",
  ]) {
    it(`ambil ${jalur}`, async () => {
      const h = await banding("get", jalur);
      expect(h.baru).toEqual(h.lama);
    });
    it(`hapus ${jalur}`, async () => {
      const h = await banding("delete", jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Batas panjang — aturan baru", () => {
  it("reference 51 karakter ditolak", async () => {
    const res = await request(baru)
      .post("/produk")
      .send({ ...produkLengkap, reference: "a".repeat(51) });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Product reference too long"]);
  });

  it("validasi lama meloloskannya", async () => {
    const res = await request(lama)
      .post("/produk")
      .send({ ...produkLengkap, reference: "a".repeat(51) });
    expect(res.status).toBe(200);
  });

  it("reference 51 karakter juga ditolak lewat PUT", async () => {
    const res = await request(baru)
      .put("/produk")
      .send({ ...produkLengkap, id: 1, reference: "a".repeat(51) });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Product reference too long"]);
  });

  it("description 192 karakter ditolak", async () => {
    const res = await request(baru)
      .post("/produk")
      .send({ ...produkLengkap, description: "a".repeat(192) });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Product description too long"]);
  });
});

/**
 * updateProductPriceSchema tinggal di product.schema.ts, bukan di
 * product-price.schema.ts — jangan tertukar dengan updateUnitPriceSchema yang
 * bentuk badannya berbeda. Yang ini dipakai PUT /product/price-purchase dan
 * PUT /product/price-sales.
 */
describe("Perubahan harga massal", () => {
  const sah = {
    items: [{ product_id: 1, price: 1000, discount: 0 }],
  };

  it("larik sah diterima", () => {
    expect(updateProductPriceSchema.safeParse(sah).success).toBe(true);
  });

  it("items bukan larik ditolak", () => {
    expect(
      updateProductPriceSchema.safeParse({ items: "bukan larik" }).success
    ).toBe(false);
  });

  it("baris tanpa price ditolak", () => {
    const hasil = updateProductPriceSchema.safeParse({
      items: [{ product_id: 1, discount: 0 }],
    });
    expect(hasil.success).toBe(false);
  });

  it("harga negatif ditolak — rantai lama memakai isFloat({ min: 0 })", () => {
    const hasil = updateProductPriceSchema.safeParse({
      items: [{ product_id: 1, price: -100, discount: 0 }],
    });
    expect(hasil.success).toBe(false);
  });

  it("diskon negatif ditolak", () => {
    const hasil = updateProductPriceSchema.safeParse({
      items: [{ product_id: 1, price: 100, discount: -1 }],
    });
    expect(hasil.success).toBe(false);
  });

  it("price berupa teks angka diterima", () => {
    const hasil = updateProductPriceSchema.safeParse({
      items: [{ product_id: "1", price: "1000", discount: "0" }],
    });
    expect(hasil.success).toBe(true);
  });
});

describe("Penjaga: berkas route tidak lagi menyimpan aturan validasi", () => {
  it("product.route.ts", () => {
    const isi = readFileSync(
      join(__dirname, "..", "..", "src", "routes", "product.route.ts"),
      "utf8"
    );
    expect(isi).not.toMatch(/ErrorHelper\.intercept/);
    expect(isi).not.toMatch(/\bbody\(/);
    // Salah ketik "-router.delete(" pada berkas asli ikut dibersihkan.
    expect(isi).not.toMatch(/-router\./);
  });
});
