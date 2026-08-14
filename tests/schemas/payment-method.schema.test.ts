import express from "express";
import { body, param } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import { balas, buatBanding } from "../support/schema-comparison.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import {
  createPaymentMethodSchema,
  deletePaymentMethodSchema,
  updatePaymentMethodSchema,
} from "../../src/schemas/payment-method.schema";

/**
 * Perbandingan perilaku untuk metode pembayaran.
 *
 * Rute hapusnya memakai pasangan pesan yang berbeda dari rute lain —
 * "ID is required" lalu "ID must be numeric", bukan "Parameter error" —
 * sehingga kalimat yang dilihat pengguna bergantung pada urutan pemeriksaan.
 * Perbedaan itu ditiru apa adanya, bukan diseragamkan.
 */

function appLama() {
  const app = express();
  app.use(express.json());

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
  app.post("/metode", validate(createPaymentMethodSchema), balas);
  app.put("/metode", validate(updatePaymentMethodSchema), balas);
  app.delete(
    "/metode/:id",
    validate(deletePaymentMethodSchema, "params"),
    balas
  );
  return app;
}

const banding = buatBanding(appLama(), appBaru());

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
