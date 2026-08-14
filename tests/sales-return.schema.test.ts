import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../src/utils/error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  archiveSalesReturnSchema,
  createSalesReturnSchema,
  paramSalesReturnSchema,
} from "../src/schemas/sales-return.schema";

/**
 * Perbandingan perilaku: express-validator lama versus skema Zod baru.
 *
 * Dua kelompok perbedaan memang disengaja dan diuji terpisah di bagian bawah:
 * kebijakan ketat pada req.body, dan urutan pesan antar anggota larik.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin apa adanya dari sales-return.route.ts. */
function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/archives",
    body("year").notEmpty().withMessage(ErrorList["Year is required"]),
    body("year")
      .isInt({ min: 2000 })
      .withMessage(ErrorList["Year must be numeric"]),
    body("month").notEmpty().withMessage(ErrorList["Month is required"]),
    body("month")
      .isInt({ min: 1, max: 12 })
      .withMessage(ErrorList["Month must be numeric"]),
    body("isActive").exists().withMessage(ErrorList["Parameter error"]),
    body("isDelete").exists().withMessage(ErrorList["Parameter error"]),
    body("isActive").isBoolean().withMessage(ErrorList["Parameter error"]),
    body("isDelete").isBoolean().withMessage(ErrorList["Parameter error"]),
    body("sortBy").notEmpty().withMessage(ErrorList["Sort by required"]),
    body("sortDirection")
      .isIn(["asc", "desc"])
      .withMessage(
        ErrorList["Sort direction only supports ascending or descending"]
      ),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/",
    body("date").notEmpty().withMessage(ErrorList["Date required"]),
    body("payment_method_id")
      .notEmpty()
      .withMessage(ErrorList["Payment method required"]),
    body("payment_method_id")
      .isInt({ min: 0 })
      .withMessage(ErrorList["Payment method must be numeric"]),
    body("sales_return")
      .isArray()
      .withMessage(ErrorList["Sales return items required"]),
    body("sales_return.*.sales_invoice_id")
      .notEmpty()
      .withMessage(ErrorList["Sales invoice ID is required"]),
    body("sales_return.*.sales_invoice_id")
      .isInt({ min: 1 })
      .withMessage(ErrorList["Sales invoice ID must be numeric"]),
    body("sales_return.*.quantity")
      .notEmpty()
      .withMessage(ErrorList["Quantity is required"]),
    body("sales_return.*.quantity")
      .isFloat({ min: 0.01 })
      .withMessage(ErrorList["Quantity must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/retur/:id",
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
  app.post("/archives", validate(archiveSalesReturnSchema), balas);
  app.post("/", validate(createSalesReturnSchema), balas);
  app.get("/retur/:id", validate(paramSalesReturnSchema, "params"), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function bandingPost(jalur: string, badan: Record<string, unknown>) {
  const l = await request(lama).post(jalur).send(badan);
  const b = await request(baru).post(jalur).send(badan);
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

const arsipLengkap = {
  year: 2026,
  month: 5,
  isActive: true,
  isDelete: false,
  sortBy: "date",
  sortDirection: "asc",
};

describe("POST /archives — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", arsipLengkap],
    ["badan kosong", {}],
    ["tanpa tahun", { ...arsipLengkap, year: undefined }],
    ["tahun sebelum 2000", { ...arsipLengkap, year: 1999 }],
    ["tahun bukan bulat", { ...arsipLengkap, year: 2026.5 }],
    ["tanpa bulan", { ...arsipLengkap, month: undefined }],
    ["bulan 0", { ...arsipLengkap, month: 0 }],
    ["bulan 13", { ...arsipLengkap, month: 13 }],
    ["tanpa isActive", { ...arsipLengkap, isActive: undefined }],
    ["tanpa isDelete", { ...arsipLengkap, isDelete: undefined }],
    ["isActive bukan boolean", { ...arsipLengkap, isActive: "ya" }],
    ["isDelete null", { ...arsipLengkap, isDelete: null }],
    ["tanpa sortBy", { ...arsipLengkap, sortBy: undefined }],
    ["sortBy teks kosong", { ...arsipLengkap, sortBy: "" }],
    ["sortDirection salah", { ...arsipLengkap, sortDirection: "naik" }],
    ["tanpa sortDirection", { ...arsipLengkap, sortDirection: undefined }],
    ["sortDirection desc", { ...arsipLengkap, sortDirection: "desc" }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/archives", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

const returLengkap = {
  date: "2026-05-01",
  payment_method_id: 1,
  sales_return: [{ sales_invoice_id: 1, quantity: 2 }],
};

describe("POST / — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", returLengkap],
    ["badan kosong", {}],
    ["tanpa date", { ...returLengkap, date: undefined }],
    ["date teks kosong", { ...returLengkap, date: "" }],
    // notEmpty() mengubah nilai menjadi teks lebih dulu, jadi angka lolos —
    // required meniru kelonggaran itu apa adanya.
    ["date berupa angka", { ...returLengkap, date: 20260501 }],
    [
      "tanpa payment_method_id",
      { ...returLengkap, payment_method_id: undefined },
    ],
    ["payment_method_id negatif", { ...returLengkap, payment_method_id: -1 }],
    ["payment_method_id nol", { ...returLengkap, payment_method_id: 0 }],
    ["payment_method_id pecahan", { ...returLengkap, payment_method_id: 1.5 }],
    ["tanpa sales_return", { ...returLengkap, sales_return: undefined }],
    ["sales_return bukan larik", { ...returLengkap, sales_return: "abc" }],
    ["sales_return berupa objek", { ...returLengkap, sales_return: {} }],
    [
      "anggota tanpa sales_invoice_id",
      { ...returLengkap, sales_return: [{ quantity: 2 }] },
    ],
    [
      "sales_invoice_id nol",
      { ...returLengkap, sales_return: [{ sales_invoice_id: 0, quantity: 2 }] },
    ],
    [
      "anggota tanpa quantity",
      { ...returLengkap, sales_return: [{ sales_invoice_id: 1 }] },
    ],
    [
      "quantity nol",
      { ...returLengkap, sales_return: [{ sales_invoice_id: 1, quantity: 0 }] },
    ],
    [
      "quantity pecahan diterima",
      {
        ...returLengkap,
        sales_return: [{ sales_invoice_id: 1, quantity: 1.5 }],
      },
    ],
    [
      "quantity bukan angka",
      {
        ...returLengkap,
        sales_return: [{ sales_invoice_id: 1, quantity: "abc" }],
      },
    ],
    ["anggota bukan objek", { ...returLengkap, sales_return: [1] }],
    ["anggota null", { ...returLengkap, sales_return: [null] }],
    ["anggota objek kosong", { ...returLengkap, sales_return: [{}] }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  /**
   * express-validator memperlakukan bidang berisi LARIK sebagai kumpulan
   * nilai: aturan dipasang pada tiap anggota, sehingga larik KOSONG tidak
   * menyentuh satu aturan pun dan lolos. Perilaku itu dipertahankan.
   */
  it("larik kosong lolos di kedua sisi — tidak ada anggota untuk diperiksa", async () => {
    const h = await bandingPost("/", { ...returLengkap, sales_return: [] });
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(200);
    expect(h.baru).toEqual(h.lama);
  });
});

describe("Parameter :id — perilaku harus identik", () => {
  for (const jalur of [
    "/retur/1",
    "/retur/0",
    "/retur/abc",
    "/retur/-1",
    "/retur/1.5",
    "/retur/999999",
  ]) {
    it(jalur, async () => {
      const h = await bandingGet(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — kebijakan ketat pada req.body.
 * Penjelasan lengkapnya di src/schemas/common.schema.ts.
 *
 * express-validator mengubah setiap nilai menjadi teks sebelum memeriksanya,
 * sehingga isInt() meloloskan "5" dan isBoolean() meloloskan "true", 1, dan 0.
 * z.number() dan z.boolean() menolak semuanya.
 */
describe("Perbedaan yang disengaja: nilai bertipe salah ditolak", () => {
  const arsip: Array<[string, Record<string, unknown>, string]> = [
    ["tahun berupa teks", { year: "2026" }, ErrorList["Year must be numeric"]],
    ["bulan berupa teks", { month: "5" }, ErrorList["Month must be numeric"]],
    [
      'isActive berupa teks "true"',
      { isActive: "true" },
      ErrorList["Parameter error"],
    ],
    ["isActive berupa angka 1", { isActive: 1 }, ErrorList["Parameter error"]],
    ["isDelete berupa angka 0", { isDelete: 0 }, ErrorList["Parameter error"]],
  ];

  for (const [nama, tambalan, pesan] of arsip) {
    it(`arsip — ${nama}: dulu diterima, sekarang ditolak`, async () => {
      const badan = { ...arsipLengkap, ...tambalan };
      const l = await request(lama).post("/archives").send(badan);
      const b = await request(baru).post("/archives").send(badan);
      expect(l.status).toBe(200);
      expect(b.status).toBe(400);
      expect(b.text).toBe(pesan);
    });
  }

  const buat: Array<[string, Record<string, unknown>, string]> = [
    [
      "payment_method_id berupa teks",
      { payment_method_id: "1" },
      ErrorList["Payment method must be numeric"],
    ],
    [
      "sales_invoice_id berupa teks",
      { sales_return: [{ sales_invoice_id: "1", quantity: 2 }] },
      ErrorList["Sales invoice ID must be numeric"],
    ],
    [
      "quantity berupa teks",
      { sales_return: [{ sales_invoice_id: 1, quantity: "2" }] },
      ErrorList["Quantity must be numeric"],
    ],
  ];

  for (const [nama, tambalan, pesan] of buat) {
    it(`buat — ${nama}: dulu diterima, sekarang ditolak`, async () => {
      const badan = { ...returLengkap, ...tambalan };
      const l = await request(lama).post("/").send(badan);
      const b = await request(baru).post("/").send(badan);
      expect(l.status).toBe(200);
      expect(b.status).toBe(400);
      expect(b.text).toBe(pesan);
    });
  }
});

/**
 * PERBEDAAN YANG DISENGAJA — bidang biasa yang diisi larik kosong.
 *
 * express-validator memperlakukan bidang berisi LARIK sebagai kumpulan nilai
 * dan memasang aturan pada tiap anggotanya. Sifat itu tidak terbatas pada
 * bidang yang memang berupa larik: `{ payment_method_id: [] }` juga tidak
 * menyentuh satu aturan pun, sehingga notEmpty() dan isInt() sama-sama lolos
 * dan controller menerima larik kosong sebagai id metode pembayaran.
 *
 * Pada larik yang memang larik — sales_return — kelonggaran ini dipertahankan
 * karena itulah bentuk data yang sah. Pada bidang tunggal ia murni lubang, dan
 * z.number() menutupnya.
 */
describe("Perbedaan yang disengaja: bidang tunggal berisi larik kosong", () => {
  it("payment_method_id larik kosong: dulu diterima, sekarang ditolak", async () => {
    const badan = { ...returLengkap, payment_method_id: [] };
    const l = await request(lama).post("/").send(badan);
    const b = await request(baru).post("/").send(badan);
    expect(l.status).toBe(200);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["Payment method must be numeric"]);
  });

  it("arsip — sortBy larik kosong: dulu diterima, sekarang ditolak", async () => {
    const badan = { ...arsipLengkap, sortBy: [] };
    const l = await request(lama).post("/archives").send(badan);
    const b = await request(baru).post("/archives").send(badan);
    expect(l.status).toBe(200);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["Sort by required"]);
  });
});

/**
 * PERBEDAAN YANG DISENGAJA — urutan pesan antar anggota larik.
 *
 * express-validator menjalankan satu rantai untuk SEMUA anggota sebelum
 * berpindah ke rantai berikutnya: seluruh sales_invoice_id diperiksa lebih
 * dulu, baru seluruh quantity. Zod sebaliknya memeriksa anggota satu per satu
 * dengan seluruh bidangnya sekaligus.
 *
 * Akibatnya, bila anggota pertama salah pada quantity dan anggota kedua salah
 * pada sales_invoice_id, pesan yang muncul berbeda. Statusnya tetap 400 dan
 * kedua pesan sama-sama benar — yang berubah hanya kesalahan mana yang
 * dilaporkan lebih dulu. Urutan per anggota justru lebih mudah dipahami
 * pengguna, dan menirukan urutan lama akan menuntut pemeriksaan bidang-demi-
 * bidang di seluruh larik.
 */
describe("Perbedaan yang disengaja: urutan pesan antar anggota larik", () => {
  it("lama melaporkan anggota kedua lebih dulu, baru melaporkan anggota pertama", async () => {
    const badan = {
      ...returLengkap,
      sales_return: [
        { sales_invoice_id: 1 },
        { sales_invoice_id: undefined, quantity: 2 },
      ],
    };

    const l = await request(lama).post("/").send(badan);
    const b = await request(baru).post("/").send(badan);

    expect(l.status).toBe(400);
    expect(l.text).toBe(ErrorList["Sales invoice ID is required"]);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["Quantity is required"]);
  });

  it("bila hanya satu anggota yang salah, pesannya tetap sama", async () => {
    const h = await bandingPost("/", {
      ...returLengkap,
      sales_return: [
        { sales_invoice_id: 1, quantity: 2 },
        { sales_invoice_id: 2 },
      ],
    });
    expect(h.baru).toEqual(h.lama);
  });
});
