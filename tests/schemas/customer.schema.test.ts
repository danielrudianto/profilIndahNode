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
  createCustomerSchema,
  paramCustomerSchema,
  updateCustomerSchema,
} from "../../src/schemas/customer.schema";

/**
 * Perbandingan perilaku untuk pelanggan.
 *
 * Yang paling mudah tertukar di sini adalah exists() versus notEmpty().
 * customer.phone_number dan customer.npwp memakai exists() — teks kosong
 * diterima — sedangkan customer.name memakai notEmpty(). Menyamakannya akan
 * menolak pelanggan tanpa NPWP, yang selama ini data sah.
 */

function appLama() {
  const app = express();
  app.use(express.json());

  const badanPelanggan = [
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

  app.post("/pelanggan", ...badanPelanggan, ErrorHelper.intercept, balas);

  // Urutan disalin persis dari src/routes/customer.route.ts:
  // id lebih dulu, baru badanPelanggan. Sempat saya tulis terbalik, dan tesnya
  // tetap lulus karena kedua sisi memakai urutan yang sama-sama keliru —
  // rekonstruksi yang salah membuat perbandingan kehilangan artinya.
  app.put(
    "/pelanggan",
    body("id").notEmpty().withMessage(ErrorList["Customer ID is required"]),
    body("id")
      .isInt({ min: 1 })
      .withMessage(ErrorList["CUstomer ID must be integer"]),
    ...badanPelanggan,
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

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/pelanggan", validate(createCustomerSchema), balas);
  app.put("/pelanggan", validate(updateCustomerSchema), balas);
  app.get("/pelanggan/:id", validate(paramCustomerSchema, "params"), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();
const banding = buatBanding(lama, baru);

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
    join(__dirname, "..", "..", "src", "routes", "customer.route.ts"),
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
