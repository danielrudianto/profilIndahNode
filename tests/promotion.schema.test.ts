import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "./helpers/legacy-error.helper";
import ErrorList from "../src/constants/error-list.constant";
import { validate } from "../src/utils/validate.helper";
import {
  createPromotionSchema,
  paramPromotionResultSchema,
  paramPromotionSchema,
  updatePromotionSchema,
} from "../src/schemas/promotion.schema";

/**
 * Perbandingan perilaku: express-validator lama versus skema Zod baru.
 *
 * Dua kelompok perbedaan memang disengaja dan diuji terpisah di bagian bawah:
 * kebijakan ketat pada req.body, dan larik kosong yang dulu melewati
 * pemeriksaan tanpa disentuh.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin apa adanya dari promotion.route.ts. */
function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/",
    body("name").notEmpty().withMessage(ErrorList["Promotion name required"]),
    body("description")
      .notEmpty()
      .withMessage(ErrorList["Promotion description required"]),
    body("start_date")
      .notEmpty()
      .withMessage(ErrorList["Promotion start date required"]),
    body("end_date")
      .exists()
      .withMessage(ErrorList["Promotion end date required"]),
    body("target")
      .notEmpty()
      .withMessage(ErrorList["Promotion target required"]),
    body("target")
      .isNumeric()
      .withMessage(ErrorList["Promotion target must be numeric"]),
    body("supplier_id")
      .notEmpty()
      .withMessage(ErrorList["Supplier ID is required"]),
    body("supplier_id")
      .isNumeric()
      .withMessage(ErrorList["Supplier ID must be numeric"]),
    body("promotion_brand")
      .notEmpty()
      .withMessage(ErrorList["Promotion brand is required"]),
    body("promotion_brand")
      .isArray()
      .withMessage(ErrorList["Promotion brand must be an array"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/",
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    body("id")
      .isInt({
        min: 0,
      })
      .withMessage(ErrorList["ID must be numeric"]),
    body("name").notEmpty().withMessage(ErrorList["Promotion name required"]),
    body("description")
      .notEmpty()
      .withMessage(ErrorList["Promotion description required"]),
    body("start_date")
      .notEmpty()
      .withMessage(ErrorList["Promotion start date required"]),
    body("end_date")
      .exists()
      .withMessage(ErrorList["Promotion end date required"]),
    body("target")
      .notEmpty()
      .withMessage(ErrorList["Promotion target required"]),
    body("target")
      .isNumeric()
      .withMessage(ErrorList["Promotion target must be numeric"]),
    body("supplier_id")
      .notEmpty()
      .withMessage(ErrorList["Supplier ID is required"]),
    body("supplier_id")
      .isNumeric()
      .withMessage(ErrorList["Supplier ID must be numeric"]),
    body("promotion_brand")
      .notEmpty()
      .withMessage(ErrorList["Promotion brand is required"]),
    body("promotion_brand")
      .isArray()
      .withMessage(ErrorList["Promotion brand must be an array"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/promosi/:id",
    param("id").notEmpty().withMessage(ErrorList["ID is required"]),
    param("id").isNumeric().withMessage(ErrorList["ID must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/hasil/:id",
    param("id").notEmpty().withMessage(ErrorList["ID is required"]),
    param("id")
      .isInt({
        min: 0,
      })
      .withMessage(ErrorList["ID must be integer"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/", validate(createPromotionSchema), balas);
  app.put("/", validate(updatePromotionSchema), balas);
  app.get("/promosi/:id", validate(paramPromotionSchema, "params"), balas);
  app.get("/hasil/:id", validate(paramPromotionResultSchema, "params"), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function bandingPost(badan: Record<string, unknown>) {
  const l = await request(lama).post("/").send(badan);
  const b = await request(baru).post("/").send(badan);
  return {
    lama: { status: l.status, teks: l.text },
    baru: { status: b.status, teks: b.text },
  };
}

async function bandingPut(badan: Record<string, unknown>) {
  const l = await request(lama).put("/").send(badan);
  const b = await request(baru).put("/").send(badan);
  return {
    lama: { status: l.status, teks: l.text },
    baru: { status: b.status, teks: b.text },
  };
}

async function bandingGet(jalur: string) {
  const l = await request(lama).get(jalur);
  const b = await request(baru).get(jalur);
  return {
    lama: { status: l.status, teks: l.text },
    baru: { status: b.status, teks: b.text },
  };
}

const promosiLengkap = {
  name: "Promo Lebaran",
  description: "Diskon merek terpilih",
  start_date: "2026-05-01",
  end_date: "2026-05-31",
  target: 1000,
  supplier_id: 4,
  promotion_brand: [1, 2],
};

describe("POST /promotion — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", promosiLengkap],
    ["badan kosong", {}],
    ["tanpa nama", { ...promosiLengkap, name: undefined }],
    ["tanpa deskripsi", { ...promosiLengkap, description: undefined }],
    ["tanpa tanggal mulai", { ...promosiLengkap, start_date: undefined }],
    ["tanggal mulai kosong", { ...promosiLengkap, start_date: "" }],
    ["tanpa tanggal selesai", { ...promosiLengkap, end_date: undefined }],
    ["tanggal selesai kosong tetap lolos", { ...promosiLengkap, end_date: "" }],
    ["tanpa target", { ...promosiLengkap, target: undefined }],
    ["target null", { ...promosiLengkap, target: null }],
    ["target bukan angka", { ...promosiLengkap, target: "abc" }],
    ["target boolean", { ...promosiLengkap, target: true }],
    ["target nol", { ...promosiLengkap, target: 0 }],
    ["target pecahan", { ...promosiLengkap, target: 1500.5 }],
    ["target negatif", { ...promosiLengkap, target: -5 }],
    ["tanpa supplier_id", { ...promosiLengkap, supplier_id: undefined }],
    ["supplier_id bukan angka", { ...promosiLengkap, supplier_id: "abc" }],
    [
      "tanpa promotion_brand",
      { ...promosiLengkap, promotion_brand: undefined },
    ],
    ["promotion_brand null", { ...promosiLengkap, promotion_brand: null }],
    ["promotion_brand teks", { ...promosiLengkap, promotion_brand: "1,2" }],
    ["promotion_brand angka", { ...promosiLengkap, promotion_brand: 5 }],
    ["promotion_brand objek", { ...promosiLengkap, promotion_brand: { a: 1 } }],
    ["promotion_brand nol", { ...promosiLengkap, promotion_brand: 0 }],
    [
      "promotion_brand berisi teks kosong",
      {
        ...promosiLengkap,
        promotion_brand: [""],
      },
    ],
    [
      "promotion_brand berisi null",
      {
        ...promosiLengkap,
        promotion_brand: [null],
      },
    ],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost(badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("PUT /promotion — perilaku harus identik", () => {
  const putLengkap = { id: 7, ...promosiLengkap };

  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", putLengkap],
    ["badan kosong", {}],
    ["tanpa id", { ...putLengkap, id: undefined }],
    ["id nol", { ...putLengkap, id: 0 }],
    ["id negatif", { ...putLengkap, id: -1 }],
    ["id pecahan", { ...putLengkap, id: 1.5 }],
    ["id bukan angka", { ...putLengkap, id: "abc" }],
    ["id sah tetapi nama kosong", { ...putLengkap, name: undefined }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPut(badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/**
 * URUTAN BIDANG. Pesan yang muncul harus tetap pesan bidang pertama yang gagal
 * menurut urutan rantai lama, bukan urutan lain.
 */
describe("Urutan pesan mengikuti urutan rantai lama", () => {
  it("nama dan target sama-sama kosong: nama yang dilaporkan", async () => {
    const h = await bandingPost({
      ...promosiLengkap,
      name: undefined,
      target: undefined,
    });
    expect(h.baru.teks).toBe(ErrorList["Promotion name required"]);
    expect(h.baru).toEqual(h.lama);
  });

  it("id dan nama sama-sama kosong pada PUT: id yang dilaporkan", async () => {
    const h = await bandingPut({ ...promosiLengkap, name: undefined });
    expect(h.baru.teks).toBe(ErrorList["ID is required"]);
    expect(h.baru).toEqual(h.lama);
  });
});

describe("Parameter :id promosi — perilaku harus identik", () => {
  for (const jalur of [
    "/promosi/1",
    "/promosi/0",
    "/promosi/abc",
    "/promosi/-1",
    "/promosi/1.5",
    "/promosi/01",
    "/promosi/+2",
    "/promosi/1e5",
    "/promosi/%201",
  ]) {
    it(jalur, async () => {
      const h = await bandingGet(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Parameter :id pendaftaran /result kedua — perilaku harus identik", () => {
  for (const jalur of ["/hasil/1", "/hasil/0", "/hasil/abc", "/hasil/-1"]) {
    it(jalur, async () => {
      const h = await bandingGet(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — kebijakan ketat pada req.body.
 * Penjelasan lengkapnya di src/schemas/common.schema.ts.
 */
describe("Perbedaan yang disengaja: nilai bertipe salah ditolak", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["target berupa teks", { ...promosiLengkap, target: "1000" }],
    ["target pecahan berupa teks", { ...promosiLengkap, target: "1500.5" }],
    ["supplier_id berupa teks", { ...promosiLengkap, supplier_id: "4" }],
    ["nama berupa angka", { ...promosiLengkap, name: 123 }],
    ["nama berupa objek", { ...promosiLengkap, name: { a: 1 } }],
    ["nama berupa boolean", { ...promosiLengkap, name: true }],
    ["deskripsi berupa angka", { ...promosiLengkap, description: 5 }],
    // requiredText memangkas spasi sebelum memeriksa; notEmpty() tidak. Nama yang
    // hanya berisi spasi tersimpan sebagai nama kosong pada rantai lama.
    ["nama hanya berisi spasi", { ...promosiLengkap, name: "   " }],
  ];

  for (const [nama, badan] of kasus) {
    it(`${nama}: dulu diterima, sekarang ditolak`, async () => {
      const l = await request(lama).post("/").send(badan);
      const b = await request(baru).post("/").send(badan);
      expect(l.status).toBe(200);
      expect(b.status).toBe(400);
    });
  }

  it("id PUT berupa teks: dulu diterima, sekarang ditolak", async () => {
    const badan = { ...promosiLengkap, id: "7" };
    const l = await request(lama).put("/").send(badan);
    const b = await request(baru).put("/").send(badan);
    expect(l.status).toBe(200);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["ID must be numeric"]);
  });
});

/**
 * LARIK KOSONG — perilaku express-validator yang mudah terlewat.
 *
 * StandardValidation memecah bidang berisi larik menjadi anggotanya sebelum
 * memanggil validator. Larik KOSONG karena itu tidak diperiksa sama sekali dan
 * lolos, berapa pun banyaknya aturan yang dipasang pada bidang itu.
 *
 * Untuk `promotion_brand` perilaku itu memang benar dan dipertahankan: larik
 * kosong adalah larik yang sah. Untuk bidang lain — nama, target, tanggal —
 * lolosnya larik kosong hanyalah kebocoran, dan skema baru menutupnya.
 */
describe("Larik kosong pada bidang berisi larik", () => {
  it("promotion_brand larik kosong tetap lolos di keduanya", async () => {
    const h = await bandingPost({ ...promosiLengkap, promotion_brand: [] });
    expect(h.lama.status).toBe(200);
    expect(h.baru).toEqual(h.lama);
  });

  const bocor: Array<[string, Record<string, unknown>]> = [
    ["nama", { ...promosiLengkap, name: [] }],
    ["deskripsi", { ...promosiLengkap, description: [] }],
    ["tanggal mulai", { ...promosiLengkap, start_date: [] }],
    ["target", { ...promosiLengkap, target: [] }],
    ["supplier_id", { ...promosiLengkap, supplier_id: [] }],
  ];

  for (const [nama, badan] of bocor) {
    it(`${nama} berupa larik kosong: dulu lolos tanpa diperiksa, sekarang ditolak`, async () => {
      const l = await request(lama).post("/").send(badan);
      const b = await request(baru).post("/").send(badan);
      expect(l.status).toBe(200);
      expect(b.status).toBe(400);
    });
  }

  it("target berupa larik berisi satu angka: dulu lolos, sekarang ditolak", async () => {
    const badan = { ...promosiLengkap, target: [1000] };
    const l = await request(lama).post("/").send(badan);
    const b = await request(baru).post("/").send(badan);
    expect(l.status).toBe(200);
    expect(b.status).toBe(400);
  });
});
