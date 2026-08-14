import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import request from "supertest";
import { body, param, query } from "express-validator";
import ErrorHelper from "./helpers/legacy-error.helper";
import ErrorList from "../src/constants/error-list.constant";
import { validate } from "../src/utils/validate.helper";
import {
  activateProductSchema,
  createProductSchema,
  updateProductPriceSchema,
  updateProductSchema,
} from "../src/schemas/product.schema";
import {
  getProductSchema,
  deleteProductSchema,
} from "../src/schemas/product-price.schema";
import {
  createExpenseSchema,
  queryExpenseMutationSchema,
  queryExpenseSchema,
  updateExpenseSchema,
} from "../src/schemas/expense.schema";

/**
 * Perbandingan perilaku untuk produk dan pengeluaran.
 *
 * Dua sifat express-validator yang mudah salah ditiru dan diuji khusus di sini:
 *
 *   isNumeric() menerima TEKS. "5" lolos, sama seperti 5. Memakai z.number()
 *   akan menolak "5" dan diam-diam menolak permintaan yang selama ini
 *   diterima — dan frontend memang mengirim sebagian nilai sebagai teks.
 *
 *   isNumeric() menerima PECAHAN. Hanya isInt() yang menyaringnya.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

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

  const expenseBody = [
    body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("value").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("value").isNumeric().withMessage(ErrorList["Parameter error"]),
    body("company_id").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("company_id").isNumeric().withMessage(ErrorList["Parameter error"]),
    body("expense_type_id")
      .notEmpty()
      .withMessage(ErrorList["Parameter error"]),
  ];

  app.post("/biaya", ...expenseBody, ErrorHelper.intercept, balas);
  app.put(
    "/biaya",
    ...expenseBody,
    body("id").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("id").isNumeric().withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/biaya",
    query("month").notEmpty().withMessage(ErrorList["Month is required"]),
    query("month")
      .isInt({ min: 0, max: 12 })
      .withMessage(ErrorList["Month must be numeric"]),
    query("year").notEmpty().withMessage(ErrorList["Year is required"]),
    query("year").isNumeric().withMessage(ErrorList["Year must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/biaya/mutation",
    query("month").notEmpty().withMessage(ErrorList["Month is required"]),
    query("month").isNumeric().withMessage(ErrorList["Month must be numeric"]),
    query("year").notEmpty().withMessage(ErrorList["Year is required"]),
    query("year").isNumeric().withMessage(ErrorList["Year must be numeric"]),
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
  app.post("/biaya", validate(createExpenseSchema), balas);
  app.put("/biaya", validate(updateExpenseSchema), balas);
  app.get("/biaya", validate(queryExpenseSchema, "query"), balas);
  app.get(
    "/biaya/mutation",
    validate(queryExpenseMutationSchema, "query"),
    balas
  );
  return app;
}

const lama = appLama();
const baru = appBaru();

async function banding(
  metode: "post" | "put" | "get" | "delete",
  jalur: string,
  badan?: any
) {
  const kirim = (app: express.Express) => {
    const r = (request(app) as any)[metode](jalur);
    return badan === undefined ? r : r.send(badan);
  };
  const [a, b] = await Promise.all([kirim(lama), kirim(baru)]);
  return {
    lama: { status: a.status, teks: a.text },
    baru: { status: b.status, teks: b.text },
  };
}

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

describe("Pengeluaran", () => {
  const biaya = {
    date: "2026-05-01",
    description: "Listrik",
    value: 500000,
    company_id: 1,
    expense_type_id: 2,
  };
  const kasus: Array<[string, any]> = [
    ["lengkap", biaya],
    ["value berupa teks angka", { ...biaya, value: "500000" }],
    ["value bukan angka", { ...biaya, value: "abc" }],
    ["value pecahan diterima", { ...biaya, value: 1500.5 }],
    ["tanpa value", { ...biaya, value: undefined }],
    ["company_id berupa teks", { ...biaya, company_id: "1" }],
    ["tanpa description", { ...biaya, description: undefined }],
    ["badan kosong", {}],
  ];
  for (const [nama, badan] of kasus) {
    it(`buat: ${nama}`, async () => {
      const h = await banding("post", "/biaya", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  for (const [nama, badan] of [
    ["lengkap", { ...biaya, id: 1 }],
    ["tanpa id", biaya],
    ["id bukan angka", { ...biaya, id: "abc" }],
  ] as Array<[string, any]>) {
    it(`ubah: ${nama}`, async () => {
      const h = await banding("put", "/biaya", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Pengeluaran — dua rute kueri dengan aturan berbeda", () => {
  const kasus = [
    "?month=5&year=2026",
    "?month=0&year=2026",
    "?month=13&year=2026",
    "?month=abc&year=2026",
    "?year=2026",
    "",
  ];

  for (const q of kasus) {
    it(`GET /biaya${q}`, async () => {
      const h = await banding("get", "/biaya" + q);
      expect(h.baru).toEqual(h.lama);
    });
    it(`GET /biaya/mutation${q}`, async () => {
      const h = await banding("get", "/biaya/mutation" + q);
      expect(h.baru).toEqual(h.lama);
    });
  }

  it("penjaga: month=13 ditolak di / tetapi diterima di /mutation", async () => {
    // Kalau kedua rute disamakan, salah satu harapan ini gagal.
    const a = await request(baru).get("/biaya?month=13&year=2026");
    const b = await request(baru).get("/biaya/mutation?month=13&year=2026");
    expect(a.status).toBe(400);
    expect(b.status).toBe(200);
  });
});

describe("isNumeric menerima teks — jangan diganti z.number()", () => {
  it("value berupa teks '500000' diterima kedua sisi", async () => {
    const badan = {
      date: "2026-05-01",
      description: "Listrik",
      value: "500000",
      company_id: "1",
      expense_type_id: 2,
    };
    const h = await banding("post", "/biaya", badan);
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(200);
  });
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
      join(__dirname, "..", "src", "routes", "product.route.ts"),
      "utf8"
    );
    expect(isi).not.toMatch(/ErrorHelper\.intercept/);
    expect(isi).not.toMatch(/\bbody\(/);
    // Salah ketik "-router.delete(" pada berkas asli ikut dibersihkan.
    expect(isi).not.toMatch(/-router\./);
  });

  it("expense.route.ts", () => {
    const isi = readFileSync(
      join(__dirname, "..", "src", "routes", "expense.route.ts"),
      "utf8"
    );
    expect(isi).not.toMatch(/ErrorHelper\.intercept/);
    expect(isi).not.toMatch(/\bbody\(/);
  });
});
