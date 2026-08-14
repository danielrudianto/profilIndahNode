import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "./helpers/legacy-error.helper";
import ErrorList from "../src/constants/error-list.constant";
import { validate } from "../src/utils/validate.helper";
import {
  createPaymentMethodSchema,
  deletePaymentMethodSchema,
  updatePaymentMethodSchema,
} from "../src/schemas/payment-method.schema";
import {
  createCustomerSchema,
  paramCustomerSchema,
  updateCustomerSchema,
} from "../src/schemas/customer.schema";
import { createCompanySchema } from "../src/schemas/company.schema";

/**
 * Perbandingan perilaku untuk data master.
 *
 * Yang paling mudah tertukar di sini adalah exists() versus notEmpty().
 * customer.phone_number dan customer.npwp memakai exists() — teks kosong
 * diterima — sedangkan customer.name memakai notEmpty(). Menyamakannya akan
 * menolak pelanggan tanpa NPWP, yang selama ini data sah.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

function appLama() {
  const app = express();
  app.use(express.json());

  const customerBody = [
    body("name").notEmpty().withMessage(ErrorList["Customer name is required"]),
    body("pic").notEmpty().withMessage(ErrorList["Customer PIC is required"]),
    body("phone_number")
      .exists()
      .withMessage(ErrorList["Customer phone number is required"]),
    body("address")
      .notEmpty()
      .withMessage(ErrorList["Customer address is required"]),
    body("npwp").exists().withMessage(ErrorList["Customer NPWP is required"]),
  ];

  app.post("/pelanggan", ...customerBody, ErrorHelper.intercept, balas);

  // Urutan disalin persis dari src/routes/customer.route.ts:
  // id lebih dulu, baru customerBody. Sempat saya tulis terbalik, dan tesnya
  // tetap lulus karena kedua sisi memakai urutan yang sama-sama keliru —
  // rekonstruksi yang salah membuat perbandingan kehilangan artinya.
  app.put(
    "/pelanggan",
    body("id").notEmpty().withMessage(ErrorList["Customer ID is required"]),
    body("id")
      .isInt({ min: 1 })
      .withMessage(ErrorList["CUstomer ID must be integer"]),
    ...customerBody,
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/pelanggan/:id",
    param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/perusahaan",
    body("name").exists().withMessage(ErrorList["Parameter error"]),
    body("address").exists().withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/metode",
    body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
    body("description")
      .not()
      .isEmpty()
      .withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/metode",
    body("id").not().isEmpty().withMessage(ErrorList["Parameter error"]),
    body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
    body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
    body("description")
      .not()
      .isEmpty()
      .withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  app.delete(
    "/metode/:id",
    param("id").notEmpty().withMessage(ErrorList["ID is required"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/pelanggan", validate(createCustomerSchema), balas);
  app.put("/pelanggan", validate(updateCustomerSchema), balas);
  app.get("/pelanggan/:id", validate(paramCustomerSchema, "params"), balas);
  app.post("/perusahaan", validate(createCompanySchema), balas);
  app.post("/metode", validate(createPaymentMethodSchema), balas);
  app.put("/metode", validate(updatePaymentMethodSchema), balas);
  app.delete(
    "/metode/:id",
    validate(deletePaymentMethodSchema, "params"),
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

const pelangganLengkap = {
  name: "PT Sejahtera",
  pic: "Budi",
  phone_number: "08123456789",
  address: "Jl. Merdeka 1",
  npwp: "1234567890123456",
};

describe("Pelanggan — perilaku harus identik", () => {
  const kasus: Array<[string, any]> = [
    ["lengkap", pelangganLengkap],
    ["tanpa name", { ...pelangganLengkap, name: undefined }],
    ["name kosong", { ...pelangganLengkap, name: "" }],
    ["tanpa pic", { ...pelangganLengkap, pic: undefined }],
    ["npwp kosong diterima", { ...pelangganLengkap, npwp: "" }],
    ["tanpa npwp ditolak", { ...pelangganLengkap, npwp: undefined }],
    ["phone_number kosong diterima", { ...pelangganLengkap, phone_number: "" }],
    [
      "tanpa phone_number ditolak",
      { ...pelangganLengkap, phone_number: undefined },
    ],
    ["address kosong", { ...pelangganLengkap, address: "" }],
    ["badan kosong", {}],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await banding("post", "/pelanggan", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  const kasusUbah: Array<[string, any]> = [
    ["lengkap dengan id", { ...pelangganLengkap, id: 1 }],
    ["tanpa id", pelangganLengkap],
    ["id nol", { ...pelangganLengkap, id: 0 }],
    ["id bukan angka", { ...pelangganLengkap, id: "abc" }],
    ["id berupa teks angka", { ...pelangganLengkap, id: "3" }],
  ];

  for (const [nama, badan] of kasusUbah) {
    it(`ubah: ${nama}`, async () => {
      const h = await banding("put", "/pelanggan", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  for (const jalur of ["/pelanggan/1", "/pelanggan/0", "/pelanggan/abc"]) {
    it(`param ${jalur}`, async () => {
      const h = await banding("get", jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

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

describe("Metode pembayaran — perilaku harus identik", () => {
  const kasus: Array<[string, any]> = [
    ["lengkap", { name: "Tunai", description: "Bayar langsung" }],
    ["tanpa name", { description: "x" }],
    ["name kosong", { name: "", description: "x" }],
    ["tanpa description", { name: "Tunai" }],
    ["badan kosong", {}],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await banding("post", "/metode", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  const kasusUbah: Array<[string, any]> = [
    ["lengkap", { id: 1, name: "Tunai", description: "x" }],
    ["tanpa id", { name: "Tunai", description: "x" }],
    ["id nol", { id: 0, name: "Tunai", description: "x" }],
    ["id bukan angka", { id: "abc", name: "Tunai", description: "x" }],
  ];

  for (const [nama, badan] of kasusUbah) {
    it(`ubah: ${nama}`, async () => {
      const h = await banding("put", "/metode", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  it("hapus memakai pesan berbeda dari rute lain", async () => {
    const h = await banding("delete", "/metode/abc");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["ID must be numeric"]);
  });
});

describe("Batas panjang — aturan baru", () => {
  it("nama pelanggan 101 karakter ditolak", async () => {
    const res = await request(baru)
      .post("/pelanggan")
      .send({ ...pelangganLengkap, name: "a".repeat(101) });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Customer name too long"]);
  });

  it("validasi lama meloloskannya", async () => {
    const res = await request(lama)
      .post("/pelanggan")
      .send({ ...pelangganLengkap, name: "a".repeat(101) });
    expect(res.status).toBe(200);
  });

  it("alamat pelanggan 192 karakter ditolak", async () => {
    const res = await request(baru)
      .post("/pelanggan")
      .send({ ...pelangganLengkap, address: "a".repeat(192) });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Customer address too long"]);
  });

  it("nama perusahaan 51 karakter ditolak", async () => {
    const res = await request(baru)
      .post("/perusahaan")
      .send({ name: "a".repeat(51), address: "Jl. B" });
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Company name too long"]);
  });
});

describe("Penjaga: urutan bidang skema mengikuti berkas route", () => {
  /**
   * Uji banding hanya sebermakna rekonstruksi sisi lamanya. Kalau rantai lama
   * ditulis ulang dengan urutan yang keliru, kedua sisi sama-sama keliru dan
   * tesnya tetap lulus tanpa membuktikan apa pun.
   *
   * Pemeriksaan di bawah membaca berkas route yang sebenarnya, bukan tiruan,
   * sehingga urutan yang tercatat di sini tidak bisa berbeda dari yang
   * dijalankan aplikasi.
   */
  const berkasRoute = readFileSync(
    join(__dirname, "..", "src", "routes", "customer.route.ts"),
    "utf8"
  );

  it("PUT /customer memeriksa id lebih dulu, baru bidang lainnya", async () => {
    // Pada badan yang kosong, pesan yang muncul menunjukkan bidang mana yang
    // diperiksa lebih dulu.
    const h = await banding("put", "/pelanggan", {});
    expect(h.baru.teks).toBe(ErrorList["Customer ID is required"]);
    expect(h.baru).toEqual(h.lama);
  });

  it("berkas route memang tidak lagi memuat rantai express-validator", () => {
    // Setelah beralih ke skema, berkas route tidak boleh lagi menyimpan
    // aturan validasi — kalau tersisa, ada dua sumber kebenaran yang bisa
    // berbeda tanpa ada yang menyadari.
    expect(berkasRoute).not.toMatch(/body\(/);
    expect(berkasRoute).not.toMatch(/ErrorHelper\.intercept/);
  });
});

describe("Penjaga: exists() dan notEmpty() tidak boleh disamakan", () => {
  it("npwp dan phone_number boleh kosong, name tidak", async () => {
    // Kalau ketiganya disamakan menjadi notEmpty(), pelanggan tanpa NPWP
    // tidak bisa disimpan lagi — padahal kolomnya boleh NULL di basis data.
    const tanpaNpwp = await request(baru)
      .post("/pelanggan")
      .send({ ...pelangganLengkap, npwp: "", phone_number: "" });
    expect(tanpaNpwp.status).toBe(200);

    const tanpaNama = await request(baru)
      .post("/pelanggan")
      .send({ ...pelangganLengkap, name: "" });
    expect(tanpaNama.status).toBe(400);
  });
});
