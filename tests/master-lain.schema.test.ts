import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../src/utils/error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  createBrandSchema,
  paramBrandSchema,
  updateBrandSchema,
} from "../src/schemas/product-brand.schema";
import {
  createExpenseTypeSchema,
  paramExpenseTypeSchema,
  updateExpenseTypeSchema,
} from "../src/schemas/expense-type.schema";
import { paramProductTypeSchema } from "../src/schemas/product-type.schema";

/**
 * Perbandingan perilaku untuk merek produk, tipe produk, dan tipe pengeluaran.
 *
 * Rantai lama dibaca langsung dari berkas route saat menyusun tes ini, bukan
 * dari ingatan. Pada batch sebelumnya urutan bidang sempat direkonstruksi
 * keliru dan tesnya tetap lulus, karena kedua sisi memakai urutan yang
 * sama-sama salah.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

function appLama() {
  const app = express();
  app.use(express.json());

  // product-brand
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

  // product-type
  app.get(
    "/tipe-produk/:id",
    param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  // expense-type
  app.get(
    "/tipe-biaya/:id",
    param("id").isNumeric().withMessage(ErrorList["ID is required"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be integer"]),
    ErrorHelper.intercept,
    balas
  );
  app.post(
    "/tipe-biaya",
    body("name")
      .not()
      .isEmpty()
      .withMessage(ErrorList["Expense type name is required"]),
    body("description")
      .not()
      .isEmpty()
      .withMessage(ErrorList["Expense type description is required"]),
    ErrorHelper.intercept,
    balas
  );
  app.put(
    "/tipe-biaya",
    body("name")
      .not()
      .isEmpty()
      .withMessage(ErrorList["Expense type name is required"]),
    body("description")
      .not()
      .isEmpty()
      .withMessage(ErrorList["Expense type description is required"]),
    body("id").isNumeric().withMessage(ErrorList["ID is required"]),
    body("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be integer"]),
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
  app.get(
    "/tipe-produk/:id",
    validate(paramProductTypeSchema, "params"),
    balas
  );
  app.get("/tipe-biaya/:id", validate(paramExpenseTypeSchema, "params"), balas);
  app.post("/tipe-biaya", validate(createExpenseTypeSchema), balas);
  app.put("/tipe-biaya", validate(updateExpenseTypeSchema), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function banding(
  metode: "post" | "put" | "get",
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

describe("Merek produk — perilaku harus identik", () => {
  for (const jalur of ["/merek/1", "/merek/0", "/merek/abc", "/merek/1.5"]) {
    it(`param ${jalur}`, async () => {
      expect((await banding("get", jalur)).baru).toEqual(
        (await banding("get", jalur)).lama
      );
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

describe("Tipe pengeluaran — perilaku harus identik", () => {
  for (const jalur of [
    "/tipe-biaya/1",
    "/tipe-biaya/0",
    "/tipe-biaya/abc",
    "/tipe-biaya/1.5",
  ]) {
    it(`param ${jalur}`, async () => {
      const h = await banding("get", jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }

  const kasus: Array<[string, any]> = [
    ["lengkap", { name: "Listrik", description: "Tagihan bulanan" }],
    ["tanpa name", { description: "x" }],
    ["name kosong", { name: "", description: "x" }],
    ["tanpa description", { name: "Listrik" }],
    ["badan kosong", {}],
  ];
  for (const [nama, badan] of kasus) {
    it(`buat: ${nama}`, async () => {
      const h = await banding("post", "/tipe-biaya", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  const ubah: Array<[string, any]> = [
    ["lengkap", { id: 1, name: "Listrik", description: "x" }],
    ["tanpa id", { name: "Listrik", description: "x" }],
    ["id bukan angka", { id: "abc", name: "Listrik", description: "x" }],
    ["id nol", { id: 0, name: "Listrik", description: "x" }],
    ["badan kosong", {}],
  ];
  for (const [nama, badan] of ubah) {
    it(`ubah: ${nama}`, async () => {
      const h = await banding("put", "/tipe-biaya", badan);
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

  it("nama tipe pengeluaran 101 karakter ditolak", async () => {
    const res = await request(baru)
      .post("/tipe-biaya")
      .send({ name: "a".repeat(101), description: "x" });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Expense type name too long"]);
  });
});

describe("Penjaga: berkas route tidak lagi menyimpan aturan validasi", () => {
  const baca = (nama: string) =>
    readFileSync(join(__dirname, "..", "src", "routes", nama), "utf8");

  for (const berkas of [
    "product-brand.route.ts",
    "product-type.route.ts",
    "expense-type.route.ts",
  ]) {
    it(berkas, () => {
      const isi = baca(berkas);
      expect(isi).not.toMatch(/ErrorHelper\.intercept/);
      expect(isi).not.toMatch(/\bbody\(/);
    });
  }
});
