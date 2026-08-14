import { body } from "express-validator";
import express from "express";
import request from "supertest";
import ErrorHelper from "./helpers/legacy-error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import { requiredMonthPeriodSchema } from "../src/schemas/report.schema";
import { createSupplierSchema } from "../src/schemas/supplier.schema";
import { createCustomerSchema } from "../src/schemas/customer.schema";
import { createBrandSchema } from "../src/schemas/product-brand.schema";

/**
 * Penjaga kebijakan ketat pada req.body.
 *
 * Skema Zod di repo ini SENGAJA lebih ketat daripada rantai express-validator
 * yang digantikannya, dan alasannya ditulis lengkap di src/schemas/common.schema.ts.
 * Berkas ini mengunci keputusan itu.
 *
 * Dibuat setelah ditemukan bahwa dua perubahan perilaku sudah terlanjur masuk
 * tanpa satu pun kasus uji yang menyentuhnya: tidak ada tes migrasi yang pernah
 * mengirim angka sebagai teks, dan tidak ada yang pernah mengirim angka pada
 * bidang teks. Keduanya lolos karena setiap kasus uji kebetulan memakai tipe
 * yang sudah benar.
 *
 * Tiap kasus di sini menjalankan rantai LAMA juga, supaya yang tercatat bukan
 * hanya "sekarang ditolak" melainkan "dulu diterima, sekarang ditolak" —
 * beserta bukti bahwa selisihnya memang ada.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai lama untuk periode laporan. */
const periodeLama = express();
periodeLama.use(express.json());
periodeLama.post(
  "/x",
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

const periodeBaru = express();
periodeBaru.use(express.json());
periodeBaru.post("/x", validate(requiredMonthPeriodSchema), balas);

/** Rantai lama untuk bidang teks. */
const teksLama = express();
teksLama.use(express.json());
teksLama.post(
  "/x",
  body("name").not().isEmpty().withMessage(ErrorList["Name required"]),
  body("address").not().isEmpty().withMessage(ErrorList["Address required"]),
  ErrorHelper.intercept,
  balas
);

const teksBaru = express();
teksBaru.use(express.json());
teksBaru.post("/x", validate(createSupplierSchema), balas);

describe("Angka yang dikirim sebagai teks ditolak pada req.body", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["bulan dan tahun berupa teks", { month: "5", year: "2026" }],
    ["hanya bulan berupa teks", { month: "5", year: 2026 }],
    ["hanya tahun berupa teks", { month: 5, year: "2026" }],
  ];

  for (const [nama, badan] of kasus) {
    it(`${nama}: dulu diterima, sekarang ditolak`, async () => {
      const l = await request(periodeLama).post("/x").send(badan);
      const b = await request(periodeBaru).post("/x").send(badan);

      expect(l.status).toBe(200);
      expect(b.status).toBe(400);
      expect(b.text).toBe(
        badan.month === "5"
          ? ErrorList["Month must be numeric"]
          : ErrorList["Year must be numeric"]
      );
    });
  }

  it("angka asli tetap diterima keduanya", async () => {
    const badan = { month: 5, year: 2026 };
    const l = await request(periodeLama).post("/x").send(badan);
    const b = await request(periodeBaru).post("/x").send(badan);
    expect(l.status).toBe(200);
    expect(b.status).toBe(200);
  });
});

describe("Nilai bukan teks ditolak pada bidang teks", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["nama berupa angka", { name: 123, address: "Jl. Melati" }],
    ["nama berupa objek", { name: { nama: "Budi" }, address: "Jl. Melati" }],
    ["nama berupa boolean", { name: true, address: "Jl. Melati" }],
    ["alamat berupa angka", { name: "Budi", address: 42 }],
  ];

  for (const [nama, badan] of kasus) {
    it(`${nama}: dulu diterima, sekarang ditolak`, async () => {
      const l = await request(teksLama).post("/x").send(badan);
      const b = await request(teksBaru).post("/x").send(badan);

      expect(l.status).toBe(200);
      expect(b.status).toBe(400);
    });
  }

  it("teks biasa tetap diterima keduanya", async () => {
    const badan = { name: "Budi", address: "Jl. Melati" };
    const l = await request(teksLama).post("/x").send(badan);
    const b = await request(teksBaru).post("/x").send(badan);
    expect(l.status).toBe(200);
    expect(b.status).toBe(200);
  });
});

/**
 * Kebijakan ini harus seragam. Kalau satu skema saja diam-diam kembali
 * longgar, pengguna akan menemui aturan yang berbeda antar layar untuk
 * kesalahan yang sama.
 */
describe("Kebijakan berlaku seragam di seluruh domain", () => {
  it("pelanggan menolak nama berupa angka", () => {
    const hasil = createCustomerSchema.safeParse({
      name: 123,
      pic: "Budi",
      phone_number: "0811",
      address: "Jl. Melati",
      npwp: "01",
    });
    expect(hasil.success).toBe(false);
  });

  it("merek menolak nama berupa angka", () => {
    const hasil = createBrandSchema.safeParse({ name: 123 });
    expect(hasil.success).toBe(false);
  });

  it("supplier menolak nama berupa angka", () => {
    const hasil = createSupplierSchema.safeParse({
      name: 123,
      address: "Jl. Melati",
    });
    expect(hasil.success).toBe(false);
  });
});
