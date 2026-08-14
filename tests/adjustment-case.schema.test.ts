import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../src/utils/error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  archiveAdjustmentCaseSchema,
  bodyIdAdjustmentCaseSchema,
  createAdjustmentCaseSchema,
  paramAdjustmentCaseSchema,
} from "../src/schemas/adjustment-case.schema";

/**
 * Perbandingan perilaku: express-validator lama versus skema Zod baru.
 *
 * Dua kelompok perbedaan memang disengaja dan diuji terpisah di bagian bawah:
 * kebijakan ketat pada req.body — yang di berkas ini terutama menyentuh
 * isBoolean() — dan urutan pesan antar anggota larik.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin apa adanya dari adjustment-case.route.ts. */
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
    body("isConfirm").isBoolean().withMessage(ErrorList["Parameter error"]),
    body("isReject").isBoolean().withMessage(ErrorList["Parameter error"]),
    body("isPending").isBoolean().withMessage(ErrorList["Parameter error"]),
    body("isLost")
      .isBoolean()
      .withMessage(ErrorList["Adjustment case lost type must be boolean"]),
    body("isFound")
      .isBoolean()
      .withMessage(ErrorList["Adjustment case found type must be boolean"]),
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
    "/approve",
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    body("id").isInt({ min: 0 }).withMessage(ErrorList["ID must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/",
    body("date").notEmpty().withMessage(ErrorList["Date required"]),
    body("type")
      .isInt({ min: 0 })
      .withMessage(ErrorList["Adjustment case type is required"]),
    body("adjustment_case").isArray().withMessage(ErrorList["Parameter error"]),
    body("adjustment_case.*.product_id")
      .notEmpty()
      .withMessage(ErrorList["Product ID is required"]),
    body("adjustment_case.*.quantity")
      .notEmpty()
      .withMessage(ErrorList["Quantity is required"]),
    body("adjustment_case.*.quantity")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Quantity must be numeric"]),
    body("adjustment_case.*.product_unit_id")
      .exists()
      .withMessage(ErrorList["Product unit ID is required"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/kasus/:id",
    param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/archives", validate(archiveAdjustmentCaseSchema), balas);
  app.post("/approve", validate(bodyIdAdjustmentCaseSchema), balas);
  app.post("/", validate(createAdjustmentCaseSchema), balas);
  app.get("/kasus/:id", validate(paramAdjustmentCaseSchema, "params"), balas);
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
  isConfirm: true,
  isReject: false,
  isPending: false,
  isLost: true,
  isFound: false,
  sortBy: "date",
  sortDirection: "asc",
};

describe("POST /archives — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", arsipLengkap],
    ["badan kosong", {}],
    ["tanpa tahun", { ...arsipLengkap, year: undefined }],
    ["tahun sebelum 2000", { ...arsipLengkap, year: 1999 }],
    ["tanpa bulan", { ...arsipLengkap, month: undefined }],
    ["bulan 0", { ...arsipLengkap, month: 0 }],
    ["bulan 13", { ...arsipLengkap, month: 13 }],
    ["tanpa isConfirm", { ...arsipLengkap, isConfirm: undefined }],
    ["isConfirm bukan boolean", { ...arsipLengkap, isConfirm: "ya" }],
    ["tanpa isReject", { ...arsipLengkap, isReject: undefined }],
    ["tanpa isPending", { ...arsipLengkap, isPending: undefined }],
    // isLost dan isFound memakai pesan sendiri, bukan "Parameter error".
    ["tanpa isLost", { ...arsipLengkap, isLost: undefined }],
    ["isLost bukan boolean", { ...arsipLengkap, isLost: "ya" }],
    ["tanpa isFound", { ...arsipLengkap, isFound: undefined }],
    ["isFound bukan boolean", { ...arsipLengkap, isFound: "ya" }],
    ["tanpa sortBy", { ...arsipLengkap, sortBy: undefined }],
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

/**
 * POST /approve dan POST /reject memakai rantai yang sama persis, jadi satu
 * skema dipakai bersama dan cukup diuji lewat satu jalur.
 */
describe("POST /approve — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["id sah", { id: 4 }],
    ["badan kosong", {}],
    ["id nol", { id: 0 }],
    ["id negatif", { id: -1 }],
    ["id pecahan", { id: 1.5 }],
    ["id null", { id: null }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/approve", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

const buatLengkap = {
  date: "2026-05-01",
  type: 1,
  adjustment_case: [{ product_id: 1, quantity: 2, product_unit_id: 3 }],
};

describe("POST / — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", buatLengkap],
    ["badan kosong", {}],
    ["tanpa date", { ...buatLengkap, date: undefined }],
    ["date teks kosong", { ...buatLengkap, date: "" }],
    ["tanpa type", { ...buatLengkap, type: undefined }],
    ["type negatif", { ...buatLengkap, type: -1 }],
    ["type nol", { ...buatLengkap, type: 0 }],
    ["type pecahan", { ...buatLengkap, type: 1.5 }],
    ["tanpa adjustment_case", { ...buatLengkap, adjustment_case: undefined }],
    ["adjustment_case bukan larik", { ...buatLengkap, adjustment_case: "abc" }],
    ["anggota bukan objek", { ...buatLengkap, adjustment_case: [1] }],
    ["anggota objek kosong", { ...buatLengkap, adjustment_case: [{}] }],
    [
      "anggota tanpa product_id",
      {
        ...buatLengkap,
        adjustment_case: [{ quantity: 2, product_unit_id: 3 }],
      },
    ],
    // notEmpty() memeriksa nilai setelah diubah menjadi teks, sehingga objek
    // menjadi "[object Object]" dan lolos. required meniru itu apa adanya.
    [
      "product_id berupa objek",
      {
        ...buatLengkap,
        adjustment_case: [{ product_id: {}, quantity: 2, product_unit_id: 3 }],
      },
    ],
    [
      "anggota tanpa quantity",
      {
        ...buatLengkap,
        adjustment_case: [{ product_id: 1, product_unit_id: 3 }],
      },
    ],
    [
      "quantity nol diterima",
      {
        ...buatLengkap,
        adjustment_case: [{ product_id: 1, quantity: 0, product_unit_id: 3 }],
      },
    ],
    [
      "quantity negatif",
      {
        ...buatLengkap,
        adjustment_case: [{ product_id: 1, quantity: -1, product_unit_id: 3 }],
      },
    ],
    [
      "quantity pecahan diterima",
      {
        ...buatLengkap,
        adjustment_case: [{ product_id: 1, quantity: 1.5, product_unit_id: 3 }],
      },
    ],
    [
      "quantity bukan angka",
      {
        ...buatLengkap,
        adjustment_case: [
          { product_id: 1, quantity: "abc", product_unit_id: 3 },
        ],
      },
    ],
    [
      "anggota tanpa product_unit_id",
      { ...buatLengkap, adjustment_case: [{ product_id: 1, quantity: 2 }] },
    ],
    // exists() hanya menolak nilai yang tidak dikirim; teks kosong lolos.
    [
      "product_unit_id teks kosong",
      {
        ...buatLengkap,
        adjustment_case: [{ product_id: 1, quantity: 2, product_unit_id: "" }],
      },
    ],
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
    const h = await bandingPost("/", {
      ...buatLengkap,
      adjustment_case: [],
    });
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(200);
    expect(h.baru).toEqual(h.lama);
  });
});

/**
 * Parameter :id di sini memakai isNumeric(), bukan isInt(). Pecahan dan
 * bilangan negatif ikut lolos — cacat lama yang sengaja dipertahankan supaya
 * status dan pesan tidak berubah.
 */
describe("Parameter :id — perilaku harus identik", () => {
  for (const jalur of [
    "/kasus/1",
    "/kasus/0",
    "/kasus/abc",
    "/kasus/-1",
    "/kasus/1.5",
    "/kasus/+3",
    "/kasus/1e3",
    "/kasus/%20",
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
 * Yang paling terasa di berkas ini adalah isBoolean(). express-validator
 * mengubah nilai menjadi teks lebih dulu, lalu isBoolean() menerima "true",
 * "false", "1", dan "0" — sehingga angka 1 dan 0 pun lolos. Nilai seperti itu
 * tidak berhenti di lapisan validasi: controller membaca isConfirm apa adanya
 * sebagai penyaring, dan 0 adalah nilai yang falsy sedangkan "0" tidak.
 * z.boolean() menolak semuanya.
 */
describe("Perbedaan yang disengaja: nilai bertipe salah ditolak", () => {
  const arsip: Array<[string, Record<string, unknown>, string]> = [
    ["tahun berupa teks", { year: "2026" }, ErrorList["Year must be numeric"]],
    ["bulan berupa teks", { month: "5" }, ErrorList["Month must be numeric"]],
    [
      'isConfirm berupa teks "true"',
      { isConfirm: "true" },
      ErrorList["Parameter error"],
    ],
    [
      'isReject berupa teks "false"',
      { isReject: "false" },
      ErrorList["Parameter error"],
    ],
    [
      "isPending berupa angka 1",
      { isPending: 1 },
      ErrorList["Parameter error"],
    ],
    [
      "isConfirm berupa angka 0",
      { isConfirm: 0 },
      ErrorList["Parameter error"],
    ],
    [
      'isLost berupa teks "true"',
      { isLost: "true" },
      ErrorList["Adjustment case lost type must be boolean"],
    ],
    [
      "isFound berupa angka 0",
      { isFound: 0 },
      ErrorList["Adjustment case found type must be boolean"],
    ],
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

  it("approve — id berupa teks: dulu diterima, sekarang ditolak", async () => {
    const l = await request(lama).post("/approve").send({ id: "5" });
    const b = await request(baru).post("/approve").send({ id: "5" });
    expect(l.status).toBe(200);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["ID must be numeric"]);
  });

  const buat: Array<[string, Record<string, unknown>, string]> = [
    [
      "type berupa teks",
      { type: "1" },
      ErrorList["Adjustment case type is required"],
    ],
    [
      "quantity berupa teks",
      {
        adjustment_case: [{ product_id: 1, quantity: "2", product_unit_id: 3 }],
      },
      ErrorList["Quantity must be numeric"],
    ],
  ];

  for (const [nama, tambalan, pesan] of buat) {
    it(`buat — ${nama}: dulu diterima, sekarang ditolak`, async () => {
      const badan = { ...buatLengkap, ...tambalan };
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
 * bidang yang memang berupa larik: `{ id: [] }` juga tidak menyentuh satu
 * aturan pun, sehingga notEmpty() dan isInt() sama-sama lolos dan controller
 * menerima id berupa larik kosong.
 *
 * Pada larik yang memang larik — adjustment_case — kelonggaran ini
 * dipertahankan karena itulah bentuk data yang sah. Pada bidang tunggal ia
 * murni lubang, dan z.number() menutupnya.
 */
describe("Perbedaan yang disengaja: bidang tunggal berisi larik kosong", () => {
  it("approve — id larik kosong: dulu diterima, sekarang ditolak", async () => {
    const l = await request(lama).post("/approve").send({ id: [] });
    const b = await request(baru).post("/approve").send({ id: [] });
    expect(l.status).toBe(200);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["ID must be numeric"]);
  });

  it("arsip — sortBy larik kosong: dulu diterima, sekarang ditolak", async () => {
    const badan = { ...arsipLengkap, sortBy: [] };
    const l = await request(lama).post("/archives").send(badan);
    const b = await request(baru).post("/archives").send(badan);
    expect(l.status).toBe(200);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["Sort by required"]);
  });

  it("larik adjustment_case yang kosong tetap diterima keduanya", async () => {
    const h = await bandingPost("/", { ...buatLengkap, adjustment_case: [] });
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(200);
  });
});

/**
 * PERBEDAAN YANG DISENGAJA — urutan pesan antar anggota larik.
 *
 * express-validator menjalankan satu rantai untuk SEMUA anggota sebelum
 * berpindah ke rantai berikutnya: seluruh product_id diperiksa lebih dulu,
 * baru seluruh quantity. Zod sebaliknya memeriksa anggota satu per satu dengan
 * seluruh bidangnya sekaligus.
 *
 * Statusnya tetap 400 dan kedua pesan sama-sama benar; yang berubah hanya
 * kesalahan mana yang dilaporkan lebih dulu.
 */
describe("Perbedaan yang disengaja: urutan pesan antar anggota larik", () => {
  it("lama melaporkan product_id anggota kedua, baru melaporkan quantity anggota pertama", async () => {
    const badan = {
      ...buatLengkap,
      adjustment_case: [
        { product_id: 1, quantity: undefined, product_unit_id: 3 },
        { product_id: undefined, quantity: 2, product_unit_id: 3 },
      ],
    };

    const l = await request(lama).post("/").send(badan);
    const b = await request(baru).post("/").send(badan);

    expect(l.status).toBe(400);
    expect(l.text).toBe(ErrorList["Product ID is required"]);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["Quantity is required"]);
  });

  it("bila hanya satu anggota yang salah, pesannya tetap sama", async () => {
    const h = await bandingPost("/", {
      ...buatLengkap,
      adjustment_case: [
        { product_id: 1, quantity: 2, product_unit_id: 3 },
        { product_id: 2, quantity: 3 },
      ],
    });
    expect(h.baru).toEqual(h.lama);
  });
});
