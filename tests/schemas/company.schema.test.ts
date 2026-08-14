import express from "express";
import request from "supertest";
import { body } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import { balas, buatBanding } from "../support/schema-comparison.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import { createCompanySchema } from "../../src/schemas/company.schema";

/**
 * Perbandingan perilaku untuk perusahaan.
 *
 * Kedua bidangnya memakai exists(), bukan notEmpty(). Bedanya terlihat pada
 * kasus "name kosong tetap diterima" di bawah: teks kosong lolos, sedangkan
 * bidang yang tidak dikirim sama sekali ditolak. Menyamakannya menjadi
 * notEmpty() akan menolak data yang selama ini tersimpan.
 */

function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/perusahaan",
    body("name").exists().withMessage(ErrorList["Parameter error"]),
    body("address").exists().withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/perusahaan", validate(createCompanySchema), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();
const banding = buatBanding(lama, baru);

describe("Perusahaan — perilaku harus identik", () => {
  const kasus: Array<[string, any]> = [
    ["lengkap", { name: "PT A", address: "Jl. B" }],
    ["name kosong tetap diterima", { name: "", address: "Jl. B" }],
    ["tanpa name", { address: "Jl. B" }],
    ["tanpa address", { name: "PT A" }],
    ["badan kosong", {}],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await banding("post", "/perusahaan", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Batas panjang — aturan baru", () => {
  it("nama perusahaan 51 karakter ditolak", async () => {
    const res = await request(baru)
      .post("/perusahaan")
      .send({ name: "a".repeat(51), address: "Jl. B" });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Company name too long"]);
  });
});
