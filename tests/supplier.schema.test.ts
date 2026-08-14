import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../src/utils/error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  buatSupplierSchema,
  ubahSupplierSchema,
  hapusSupplierSchema,
} from "../src/schemas/supplier.schema";

/**
 * Perbandingan perilaku: express-validator lama versus skema Zod baru.
 *
 * Tujuannya bukan membuktikan skema barunya "benar", melainkan membuktikan ia
 * berperilaku SAMA dengan yang digantikan. Frontend menampilkan badan balasan
 * galat apa adanya kepada pengguna, jadi status maupun kalimatnya harus
 * identik — bukan sekadar setara.
 *
 * Perbedaan yang memang disengaja dicatat terpisah di bagian paling bawah,
 * lengkap dengan alasannya, supaya tidak ada perubahan perilaku yang lolos
 * tanpa disadari.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Aplikasi dengan rantai validator lama, apa adanya seperti di route asli. */
function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/create",
    body("name").not().isEmpty().withMessage(ErrorList["Name required"]),
    body("address").not().isEmpty().withMessage(ErrorList["Address required"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/update",
    body("id").not().isEmpty().withMessage(ErrorList["ID is required"]),
    body("name").not().isEmpty().withMessage(ErrorList["Name required"]),
    body("address").not().isEmpty().withMessage(ErrorList["Address required"]),
    ErrorHelper.intercept,
    balas
  );

  app.delete(
    "/hapus/:id",
    param("id").notEmpty().withMessage(ErrorList["ID is required"]),
    param("id").isInt().withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

/** Aplikasi dengan skema Zod. */
function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/create", validate(buatSupplierSchema), balas);
  app.put("/update", validate(ubahSupplierSchema), balas);
  app.delete("/hapus/:id", validate(hapusSupplierSchema, "params"), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

/** Jalankan permintaan yang sama ke kedua aplikasi. */
async function keduanya(
  metode: "post" | "put" | "delete",
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

describe("POST /supplier — perilaku harus identik", () => {
  const kasus: Array<[string, any]> = [
    ["data lengkap", { name: "PT Maju", address: "Jl. A" }],
    ["tanpa name", { address: "Jl. A" }],
    ["name kosong", { name: "", address: "Jl. A" }],
    ["tanpa address", { name: "PT Maju" }],
    ["address kosong", { name: "PT Maju", address: "" }],
    ["badan kosong", {}],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await keduanya("post", "/create", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("PUT /supplier — perilaku harus identik", () => {
  const kasus: Array<[string, any]> = [
    ["lengkap", { id: 1, name: "A", address: "B" }],
    ["id berupa teks", { id: "1", name: "A", address: "B" }],
    ["tanpa id", { name: "A", address: "B" }],
    ["id kosong", { id: "", name: "A", address: "B" }],
    ["tanpa name", { id: 1, address: "B" }],
    ["badan kosong", {}],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await keduanya("put", "/update", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("DELETE /supplier/:id — perilaku harus identik", () => {
  const kasus: Array<[string, string]> = [
    ["id angka", "/hapus/5"],
    ["id berupa huruf", "/hapus/abc"],
    ["id pecahan", "/hapus/1.5"],
    ["id nol", "/hapus/0"],
  ];

  for (const [nama, jalur] of kasus) {
    it(nama, async () => {
      const h = await keduanya("delete", jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Batas panjang — aturan baru, tidak ada di validasi lama", () => {
  /**
   * Rantai lama tidak memeriksa panjang sama sekali. Nilai yang melampaui
   * lebar kolom lolos validasi lalu ditolak MySQL, dan pengguna menerima
   * "Internal server error" alih-alih penjelasan yang bisa ditindaklanjuti.
   *
   * Batas di sini mengikuti prisma/schema.prisma: supplier.name VarChar(100).
   */
  it("menerima nama tepat 100 karakter", async () => {
    const res = await request(appBaru())
      .post("/create")
      .send({ name: "a".repeat(100), address: "Jl. A" });
    expect(res.status).toBe(200);
  });

  it("menolak nama 101 karakter dengan pesan yang jelas", async () => {
    const res = await request(appBaru())
      .post("/create")
      .send({ name: "a".repeat(101), address: "Jl. A" });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Supplier name too long"]);
  });

  it("validasi lama meloloskan nama 101 karakter — inilah yang diperbaiki", async () => {
    const res = await request(appLama())
      .post("/create")
      .send({ name: "a".repeat(101), address: "Jl. A" });
    expect(res.status).toBe(200);
  });

  it("address tidak dibatasi panjangnya karena kolomnya bertipe Text", async () => {
    const res = await request(appBaru())
      .post("/create")
      .send({ name: "PT Maju", address: "a".repeat(5000) });
    expect(res.status).toBe(200);
  });
});

describe("Urutan bidang menentukan pesan yang muncul", () => {
  it("badan kosong pada PUT mengeluh soal id lebih dulu, bukan name", async () => {
    // Penjaga terhadap .extend() yang memindahkan kunci baru ke belakang.
    // Kalau urutan skema berubah, pesan yang dilihat pengguna ikut berubah.
    const res = await request(appBaru()).put("/update").send({});
    expect(res.text).toBe(ErrorList["ID is required"]);
  });

  it("badan kosong pada POST mengeluh soal name lebih dulu", async () => {
    const res = await request(appBaru()).post("/create").send({});
    expect(res.text).toBe(ErrorList["Name required"]);
  });
});

describe("Perbedaan yang disengaja", () => {
  it("id negatif: yang lama menerima, yang baru menolak", async () => {
    // Rantai lama pada DELETE memakai isInt() tanpa batas bawah, sedangkan
    // GET /:id pada berkas yang sama memakai isInt({ min: 0 }). Dua rute untuk
    // tabel yang sama berperilaku berbeda. Skema baru menyamakan keduanya pada
    // perilaku yang lebih ketat.
    //
    // Tes ini akan gagal bila salah satu sisi berubah — termasuk bila
    // seseorang kelak melonggarkan skema barunya. Perbedaan ini harus tetap
    // disengaja, bukan berubah diam-diam.
    const h = await keduanya("delete", "/hapus/-1");

    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Parameter error"]);
  });
});
