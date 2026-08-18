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
  createExpenseTypeSchema,
  paramExpenseTypeSchema,
  updateExpenseTypeSchema,
} from "../../src/schemas/expense-type.schema";

/**
 * Perbandingan perilaku untuk tipe pengeluaran.
 *
 * Param id-nya memakai isNumeric() seperti tipe produk, tetapi PESANNYA
 * berbeda: "ID is required" lalu "ID must be integer", bukan "Parameter error".
 * Pada tipe produk perbedaan urutan itu tidak terlihat karena kedua pesannya
 * sama; di sini urutan pemeriksaan menentukan kalimat yang dilihat pengguna.
 *
 * Pada jalur ubah, id justru diperiksa PALING AKHIR — sesudah name dan
 * description. Urutan itu disalin dari berkas route dan sengaja dipertahankan.
 */

function appLama() {
  const app = express();
  app.use(express.json());

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
  app.get("/tipe-biaya/:id", validate(paramExpenseTypeSchema, "params"), balas);
  app.post("/tipe-biaya", validate(createExpenseTypeSchema), balas);
  app.put("/tipe-biaya", validate(updateExpenseTypeSchema), balas);
  return app;
}

const baru = appBaru();
const banding = buatBanding(appLama(), baru);

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

  /*
    Sejak tipe pengeluaran menjadi dua tingkat, create MEWAJIBKAN parent_id —
    perubahan kontrak yang disengaja, bukan selisih yang harus disamakan.
    Kasus paritas di bawah menyertakan parent_id sah supaya yang dibandingkan
    tinggal bagian yang memang tidak berubah (pesan name dan description);
    rantai lama mengabaikan bidang tambahan itu. Aturan parent_id sendiri
    diuji terpisah di bawah.
  */
  const kasus: Array<[string, any]> = [
    [
      "lengkap",
      { name: "Listrik", description: "Tagihan bulanan", parent_id: 1 },
    ],
    ["tanpa name", { description: "x", parent_id: 1 }],
    ["name kosong", { name: "", description: "x", parent_id: 1 }],
    ["tanpa description", { name: "Listrik", parent_id: 1 }],
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
  it("nama tipe pengeluaran 101 karakter ditolak", async () => {
    const res = await request(baru)
      .post("/tipe-biaya")
      .send({ name: "a".repeat(101), description: "x", parent_id: 1 });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Expense type name too long"]);
  });
});

describe("parent_id — aturan baru tipe dua tingkat", () => {
  const salah: Array<[string, any]> = [
    ["tanpa parent_id", { name: "Listrik", description: "x" }],
    [
      "parent_id bukan angka",
      { name: "Listrik", description: "x", parent_id: "abc" },
    ],
    ["parent_id nol", { name: "Listrik", description: "x", parent_id: 0 }],
    [
      "parent_id pecahan",
      { name: "Listrik", description: "x", parent_id: 1.5 },
    ],
  ];
  for (const [nama, badan] of salah) {
    it(`ditolak: ${nama}`, async () => {
      const res = await request(baru).post("/tipe-biaya").send(badan);
      expect(res.status).toBe(400);
      expect(res.text).toBe(ErrorList["Expense type parent invalid"]);
    });
  }

  it("parent_id bilangan bulat positif lolos skema", async () => {
    const res = await request(baru)
      .post("/tipe-biaya")
      .send({ name: "Listrik", description: "x", parent_id: 7 });
    expect(res.status).toBe(200);
  });
});

describe("Penjaga: berkas route tidak lagi menyimpan aturan validasi", () => {
  it("expense-type.route.ts", () => {
    const isi = readFileSync(
      join(__dirname, "..", "..", "src", "routes", "expense-type.route.ts"),
      "utf8"
    );
    expect(isi).not.toMatch(/ErrorHelper\.intercept/);
    expect(isi).not.toMatch(/\bbody\(/);
  });
});
