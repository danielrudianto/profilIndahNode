import express from "express";
import request from "supertest";
import { body, query } from "express-validator";
import ErrorHelper from "./helpers/legacy-error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  outputSchema,
  dailySalesSchema,
  optionalMonthPeriodSchema,
  queryPeriodSchema,
  requiredMonthPeriodSchema,
} from "../src/schemas/report.schema";

/**
 * Perbandingan perilaku untuk domain laporan.
 *
 * Yang paling perlu dijaga di sini adalah perbedaan antara dua varian bulan.
 * Sebagian endpoint mensyaratkan 1-12, sebagian menerima 0 sebagai penanda
 * "seluruh tahun". Menyamakan keduanya akan mematikan laporan tahunan tanpa
 * galat apa pun — permintaannya ditolak di lapisan validasi dan tidak pernah
 * sampai ke kode yang menanganinya.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

function appLama() {
  const app = express();
  app.use(express.json());

  // Varian bulan wajib 1-12 — seperti /report/sales dan /report/purchase.
  app.post(
    "/wajib",
    body("month").notEmpty().withMessage(ErrorList["Month is required"]),
    body("month")
      .isInt({ min: 1, max: 12 })
      .withMessage(ErrorList["Month must be numeric"]),
    body("year").notEmpty().withMessage(ErrorList["Year is required"]),
    body("year")
      .isInt({ min: 2000 })
      .withMessage(ErrorList["Year must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  // Varian yang menerima 0 — seperti /report/profit-loss.
  app.post(
    "/tahunan",
    body("month").notEmpty().withMessage(ErrorList["Month is required"]),
    body("month")
      .isInt({ min: 0, max: 12 })
      .withMessage(ErrorList["Month must be numeric"]),
    body("year").notEmpty().withMessage(ErrorList["Year is required"]),
    body("year")
      .isInt({ min: 2000 })
      .withMessage(ErrorList["Year must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  // Varian query — seperti /report/sales/brand.
  app.get(
    "/kueri",
    query("month").notEmpty().withMessage(ErrorList["Month is required"]),
    query("month")
      .isInt({ min: 0, max: 12 })
      .withMessage(ErrorList["Month must be numeric"]),
    query("year").notEmpty().withMessage(ErrorList["Year is required"]),
    query("year")
      .isInt({ min: 2000 })
      .withMessage(ErrorList["Year must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/wajib", validate(requiredMonthPeriodSchema), balas);
  app.post("/tahunan", validate(optionalMonthPeriodSchema), balas);
  app.get("/kueri", validate(queryPeriodSchema, "query"), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function bandingPost(jalur: string, badan: any) {
  const [a, b] = await Promise.all([
    request(lama).post(jalur).send(badan),
    request(baru).post(jalur).send(badan),
  ]);
  return {
    lama: { status: a.status, teks: a.text },
    baru: { status: b.status, teks: b.text },
  };
}

async function bandingGet(jalur: string) {
  const [a, b] = await Promise.all([
    request(lama).get(jalur),
    request(baru).get(jalur),
  ]);
  return {
    lama: { status: a.status, teks: a.text },
    baru: { status: b.status, teks: b.text },
  };
}

describe("Bulan wajib 1-12 — perilaku harus identik", () => {
  const kasus: Array<[string, any]> = [
    ["bulan sah", { month: 5, year: 2026 }],
    ["bulan 1", { month: 1, year: 2026 }],
    ["bulan 12", { month: 12, year: 2026 }],
    ["bulan 0 ditolak", { month: 0, year: 2026 }],
    ["bulan 13 ditolak", { month: 13, year: 2026 }],
    ["bulan negatif", { month: -1, year: 2026 }],
    ["tanpa bulan", { year: 2026 }],
    ["tanpa tahun", { month: 5 }],
    ["tahun sebelum 2000", { month: 5, year: 1999 }],
    ["badan kosong", {}],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/wajib", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Bulan boleh 0 — perilaku harus identik", () => {
  const kasus: Array<[string, any]> = [
    ["bulan 0 berarti setahun penuh", { month: 0, year: 2026 }],
    ["bulan sah", { month: 7, year: 2026 }],
    ["bulan 13 ditolak", { month: 13, year: 2026 }],
    ["tanpa bulan", { year: 2026 }],
    ["badan kosong", {}],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/tahunan", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Parameter kueri — nilainya selalu teks", () => {
  const kasus: Array<[string, string]> = [
    ["bulan dan tahun sah", "/kueri?month=5&year=2026"],
    ["bulan 0", "/kueri?month=0&year=2026"],
    ["bulan 13 ditolak", "/kueri?month=13&year=2026"],
    ["bulan bukan angka", "/kueri?month=abc&year=2026"],
    ["tanpa parameter", "/kueri"],
  ];

  for (const [nama, jalur] of kasus) {
    it(nama, async () => {
      const h = await bandingGet(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Penjaga: dua varian bulan tidak boleh disatukan", () => {
  it("month=0 ditolak pada varian wajib, diterima pada varian tahunan", async () => {
    // Kalau suatu saat keduanya disatukan, salah satu dari dua harapan ini
    // gagal. Tanpa penjaga ini, penyatuan terlihat seperti perapian kode yang
    // wajar padahal mematikan seluruh laporan tahunan.
    const wajib = await request(baru)
      .post("/wajib")
      .send({ month: 0, year: 2026 });
    const tahunan = await request(baru)
      .post("/tahunan")
      .send({ month: 0, year: 2026 });

    expect(wajib.status).toBe(400);
    expect(tahunan.status).toBe(200);
  });
});

describe("Skema lain pada domain laporan", () => {
  it("output menolak group di luar brand dan type", () => {
    const hasil = outputSchema.safeParse({
      month: 5,
      year: 2026,
      group: "warna",
      type: [1],
      brand: [2],
    });
    expect(hasil.success).toBe(false);
  });

  it("output menerima permintaan yang sah", () => {
    const hasil = outputSchema.safeParse({
      month: 5,
      year: 2026,
      group: "brand",
      type: [1, 2],
      brand: [3],
    });
    expect(hasil.success).toBe(true);
  });

  it("output menolak isi array yang bukan bilangan bulat", () => {
    const hasil = outputSchema.safeParse({
      month: 5,
      year: 2026,
      group: "brand",
      type: [1.5],
      brand: [3],
    });
    expect(hasil.success).toBe(false);
  });

  it("penjualan harian menerima day 0 sebagai penanda seluruh bulan", () => {
    const hasil = dailySalesSchema.safeParse({
      day: 0,
      month: 5,
      year: 2026,
      group: "brand",
    });
    expect(hasil.success).toBe(true);
  });

  it("penjualan harian menolak day 32", () => {
    const hasil = dailySalesSchema.safeParse({
      day: 32,
      month: 5,
      year: 2026,
      group: "brand",
    });
    expect(hasil.success).toBe(false);
  });
});
