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
  createBrandSchema,
  paramBrandSchema,
  updateBrandSchema,
} from "../../src/schemas/product-brand.schema";

/**
 * Perbandingan perilaku untuk merek produk.
 *
 * Rantai lama dibaca langsung dari berkas route saat menyusun tes ini, bukan
 * dari ingatan. Pada batch sebelumnya urutan bidang sempat direkonstruksi
 * keliru dan tesnya tetap lulus, karena kedua sisi memakai urutan yang
 * sama-sama salah.
 *
 * Param id-nya memakai exists() lalu isInt — berbeda dari tipe produk dan tipe
 * pengeluaran yang memakai isNumeric(). Perbedaan itu ditiru apa adanya.
 */

function appLama() {
  const app = express();
  app.use(express.json());

  app.get(
    "/merek/:id",
    param("id").exists().withMessage(ErrorList["Parameter error"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );
  app.post(
    "/merek",
    body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );
  app.put(
    "/merek",
    body("id").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.get("/merek/:id", validate(paramBrandSchema, "params"), balas);
  app.post("/merek", validate(createBrandSchema), balas);
  app.put("/merek", validate(updateBrandSchema), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();
const banding = buatBanding(lama, baru);

describe("Merek produk — perilaku harus identik", () => {
  for (const jalur of ["/merek/1", "/merek/0", "/merek/abc", "/merek/1.5"]) {
    it(`param ${jalur}`, async () => {
      const h = await banding("get", jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }

  const buat: Array<[string, any]> = [
    ["nama sah", { name: "Huben" }],
    ["nama kosong", { name: "" }],
    ["tanpa nama", {}],
  ];
  for (const [nama, badan] of buat) {
    it(`buat: ${nama}`, async () => {
      const h = await banding("post", "/merek", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  const ubah: Array<[string, any]> = [
    ["lengkap", { id: 1, name: "Huben" }],
    ["tanpa id", { name: "Huben" }],
    ["tanpa name", { id: 1 }],
    ["keduanya kosong", {}],
    ["id bukan angka", { id: "abc", name: "Huben" }],
    ["id nol", { id: 0, name: "Huben" }],
    ["id pecahan", { id: 1.5, name: "Huben" }],
  ];
  for (const [nama, badan] of ubah) {
    it(`ubah: ${nama}`, async () => {
      const h = await banding("put", "/merek", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Batas panjang — aturan baru", () => {
  it("nama merek 46 karakter ditolak", async () => {
    const res = await request(baru)
      .post("/merek")
      .send({ name: "a".repeat(46) });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Brand name too long"]);
  });

  it("validasi lama meloloskannya", async () => {
    const res = await request(lama)
      .post("/merek")
      .send({ name: "a".repeat(46) });
    expect(res.status).toBe(200);
  });

  it("nama merek 46 karakter ditolak juga lewat PUT", async () => {
    // Celah yang ditemukan uji falsifikasi: batas panjang pada jalur ubah
    // sempat tidak teruji sama sekali, karena tes hanya memakai POST.
    const res = await request(baru)
      .put("/merek")
      .send({ id: 1, name: "a".repeat(46) });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Brand name too long"]);
  });
});

describe("Penjaga: berkas route tidak lagi menyimpan aturan validasi", () => {
  it("product-brand.route.ts", () => {
    const isi = readFileSync(
      join(__dirname, "..", "..", "src", "routes", "product-brand.route.ts"),
      "utf8"
    );
    expect(isi).not.toMatch(/ErrorHelper\.intercept/);
    expect(isi).not.toMatch(/\bbody\(/);
  });
});
