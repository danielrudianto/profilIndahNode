import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import request from "supertest";
import { body, query } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import { balas, buatBanding } from "../support/schema-comparison.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import {
  createExpenseSchema,
  queryExpenseMutationSchema,
  queryExpenseSchema,
  updateExpenseSchema,
} from "../../src/schemas/expense.schema";

/**
 * Perbandingan perilaku untuk pengeluaran.
 *
 * isNumeric() pada express-validator menerima TEKS: "500000" lolos persis
 * seperti 500000, karena nilainya diubah menjadi teks sebelum diperiksa.
 * Mengganti bidang-bidang ini dengan z.number() akan diam-diam menolak
 * permintaan yang selama ini diterima — dan frontend memang mengirim sebagian
 * nilai sebagai teks. Blok terakhir di berkas ini menjaga sifat itu.
 *
 * Dua rute kuerinya juga TIDAK sama: GET /expense membatasi month lewat
 * isInt({ min: 0, max: 12 }), sedangkan GET /expense/mutation hanya memakai
 * isNumeric() tanpa batas atas. Menyeragamkannya akan mengubah salah satunya.
 */

function appLama() {
  const app = express();
  app.use(express.json());

  const badanBiaya = [
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

  app.post("/biaya", ...badanBiaya, ErrorHelper.intercept, balas);
  app.put(
    "/biaya",
    ...badanBiaya,
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

const baru = appBaru();
const banding = buatBanding(appLama(), baru);

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

describe("Penjaga: berkas route tidak lagi menyimpan aturan validasi", () => {
  it("expense.route.ts", () => {
    const isi = readFileSync(
      join(__dirname, "..", "..", "src", "routes", "expense.route.ts"),
      "utf8"
    );
    expect(isi).not.toMatch(/ErrorHelper\.intercept/);
    expect(isi).not.toMatch(/\bbody\(/);
  });
});
