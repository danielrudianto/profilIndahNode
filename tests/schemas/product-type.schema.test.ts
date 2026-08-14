import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import request from "supertest";
import { param } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import { balas, buatBanding } from "../support/schema-comparison.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import {
  createProductTypeSchema,
  paramProductTypeSchema,
  updateProductTypeSchema,
} from "../../src/schemas/product-type.schema";

/**
 * Perbandingan perilaku untuk tipe produk.
 *
 * Hanya jalur parameternya yang punya pembanding: param id memakai isNumeric()
 * lalu isInt, berbeda dari merek produk yang memakai exists(). isNumeric()
 * menolak "abc" tetapi menerima "1.5"; pemeriksaan isInt sesudahnya yang
 * menyaring pecahan.
 *
 * POST dan PUT tidak punya pembanding sama sekali — lihat blok keduanya di
 * bawah.
 */

function appLama() {
  const app = express();
  app.use(express.json());

  app.get(
    "/tipe-produk/:id",
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
  app.get(
    "/tipe-produk/:id",
    validate(paramProductTypeSchema, "params"),
    balas
  );
  /*
    Tidak ada padanannya di appLama: POST dan PUT /product-type memang tidak
    pernah divalidasi pada rantai lama, jadi tidak ada perilaku yang bisa
    dibandingkan. Keduanya diuji langsung di describe kedua di bawah.
  */
  app.post("/tipe-produk", validate(createProductTypeSchema), balas);
  app.put("/tipe-produk", validate(updateProductTypeSchema), balas);
  return app;
}

const baru = appBaru();
const banding = buatBanding(appLama(), baru);

describe("Tipe produk — perilaku harus identik", () => {
  for (const jalur of [
    "/tipe-produk/1",
    "/tipe-produk/0",
    "/tipe-produk/abc",
    "/tipe-produk/1.5",
  ]) {
    it(`param ${jalur}`, async () => {
      const h = await banding("get", jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/**
 * POST dan PUT /product-type adalah satu-satunya jalur tulis data master yang
 * lolos tanpa pemeriksaan apa pun pada rantai lama. Tidak ada perilaku lama
 * yang bisa dibandingkan, jadi seluruh blok ini menguji aturan barunya secara
 * langsung — dan setiap kasus di sini adalah permintaan yang DULU DITERIMA.
 */
describe("Tipe produk — validasi yang sebelumnya tidak ada", () => {
  it("POST tanpa name ditolak 400", async () => {
    const res = await request(baru).post("/tipe-produk").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Parameter error"]);
  });

  it("POST dengan name kosong ditolak 400", async () => {
    const res = await request(baru).post("/tipe-produk").send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Parameter error"]);
  });

  it("POST dengan name 46 karakter ditolak 400", async () => {
    const res = await request(baru)
      .post("/tipe-produk")
      .send({ name: "a".repeat(46) });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Product type name too long"]);
  });

  it("POST dengan name 45 karakter diterima", async () => {
    const res = await request(baru)
      .post("/tipe-produk")
      .send({ name: "a".repeat(45) });
    expect(res.status).toBe(200);
  });

  it("POST dengan name berupa angka ditolak — kebijakan ketat req.body", async () => {
    const res = await request(baru).post("/tipe-produk").send({ name: 123 });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Parameter error"]);
  });

  it("PUT tanpa id ditolak 400", async () => {
    const res = await request(baru).put("/tipe-produk").send({ name: "Besi" });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Parameter error"]);
  });

  it("PUT dengan id berupa teks ditolak — req.body bukan req.params", async () => {
    const res = await request(baru)
      .put("/tipe-produk")
      .send({ id: "1", name: "Besi" });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Parameter error"]);
  });

  it("PUT dengan id 0 ditolak — batas bawahnya 1", async () => {
    const res = await request(baru)
      .put("/tipe-produk")
      .send({ id: 0, name: "Besi" });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Parameter error"]);
  });

  it("PUT dengan name 46 karakter ditolak 400", async () => {
    const res = await request(baru)
      .put("/tipe-produk")
      .send({ id: 1, name: "a".repeat(46) });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Product type name too long"]);
  });

  it("PUT yang sah diterima", async () => {
    const res = await request(baru)
      .put("/tipe-produk")
      .send({ id: 1, name: "Besi" });
    expect(res.status).toBe(200);
  });

  it("id diperiksa lebih dulu daripada name ketika keduanya salah", async () => {
    // Urutan bidang di skema menentukan kalimat mana yang sampai ke pengguna.
    const res = await request(baru)
      .put("/tipe-produk")
      .send({ name: "a".repeat(46) });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Parameter error"]);
  });
});

describe("Penjaga: berkas route tidak lagi menyimpan aturan validasi", () => {
  it("product-type.route.ts", () => {
    const isi = readFileSync(
      join(__dirname, "..", "..", "src", "routes", "product-type.route.ts"),
      "utf8"
    );
    expect(isi).not.toMatch(/ErrorHelper\.intercept/);
    expect(isi).not.toMatch(/\bbody\(/);
  });
});
