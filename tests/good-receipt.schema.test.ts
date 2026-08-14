import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "./helpers/legacy-error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  archiveGoodReceiptSchema,
  checkGoodReceiptSchema,
  confirmGoodReceiptSchema,
  createGoodReceiptSchema,
  deleteGoodReceiptSchema,
  paramGoodReceiptSchema,
  rejectGoodReceiptSchema,
  updateGoodReceiptSchema,
} from "../src/schemas/good-receipt.schema";

/**
 * Perbandingan perilaku: express-validator lama versus skema Zod baru untuk
 * domain penerimaan barang.
 *
 * Bentuknya differential — dua aplikasi Express menerima permintaan yang sama
 * persis, lalu status dan badan balasannya dibandingkan. Yang diuji bukan
 * "skema baru menolak X", melainkan "skema baru menjawab sama dengan rantai
 * lama", sehingga migrasi tidak diam-diam mengubah kalimat yang dilihat
 * pengguna.
 *
 * Tiga kelompok perbedaan memang disengaja dan diuji terpisah di bagian bawah,
 * masing-masing dengan bukti "dulu 200, sekarang 400":
 *
 *   1. kebijakan ketat pada req.body (angka berupa teks, teks berupa angka,
 *      boolean palsu) — lihat src/schemas/common.schema.ts
 *   2. lubang larik kosong pada pemeriksaan bawaan express-validator
 *   3. batas panjang teks dan teks berisi spasi saja
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin apa adanya dari good-receipt.route.ts. */
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
    body("isActive").isBoolean().withMessage(ErrorList["Parameter error"]),
    body("isDelete").isBoolean().withMessage(ErrorList["Parameter error"]),
    body("isPending").isBoolean().withMessage(ErrorList["Parameter error"]),
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
    "/check",
    body("name").exists().withMessage(ErrorList["Name required"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/buat",
    body("date").notEmpty().withMessage(ErrorList["Date required"]),
    body("name").notEmpty().withMessage(ErrorList["Name required"]),
    body("company_id").notEmpty().withMessage(ErrorList["Company ID required"]),
    body("supplier_id")
      .notEmpty()
      .withMessage(ErrorList["Supplier ID required"]),
    body("good_receipt")
      .notEmpty()
      .withMessage(ErrorList["Good receipt required"]),
    body("good_receipt")
      .isArray()
      .withMessage(ErrorList["Good receipt must be array"]),
    body("good_receipt.*.product_id")
      .notEmpty()
      .withMessage(ErrorList["Product ID is required"]),
    body("good_receipt.*.product_id")
      .isInt({ min: 1 })
      .withMessage(ErrorList["Product ID must be numeric"]),
    body("good_receipt.*.price")
      .notEmpty()
      .withMessage(ErrorList["Price is required"]),
    body("good_receipt.*.price")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Price must be numeric"]),
    body("good_receipt.*.discount")
      .notEmpty()
      .withMessage(ErrorList["Discount required"]),
    body("good_receipt.*.discount")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Discount must be numeric"]),
    body("good_receipt.*.quantity")
      .notEmpty()
      .withMessage(ErrorList["Quantity required"]),
    body("good_receipt.*.quantity")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Quantity must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/ubah",
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    body("date").notEmpty().withMessage(ErrorList["Date required"]),
    body("name").notEmpty().withMessage(ErrorList["Invoice name required"]),
    body("faktur").exists().withMessage(ErrorList["Tax invoice required"]),
    body("invoice_name").notEmpty().withMessage(ErrorList["Name required"]),
    body("company_id").notEmpty().withMessage(ErrorList["Company ID required"]),
    body("supplier_id")
      .notEmpty()
      .withMessage(ErrorList["Supplier ID required"]),
    body("good_receipt")
      .notEmpty()
      .withMessage(ErrorList["Good receipt required"]),
    body("good_receipt")
      .isArray()
      .withMessage(ErrorList["Good receipt must be array"]),
    body("good_receipt.*.product_id")
      .notEmpty()
      .withMessage(ErrorList["Product ID is required"]),
    body("good_receipt.*.product_id")
      .isInt({ min: 1 })
      .withMessage(ErrorList["Product ID must be numeric"]),
    body("good_receipt.*.price")
      .notEmpty()
      .withMessage(ErrorList["Price is required"]),
    body("good_receipt.*.price")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Price must be numeric"]),
    body("good_receipt.*.discount")
      .notEmpty()
      .withMessage(ErrorList["Discount required"]),
    body("good_receipt.*.discount")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Discount must be numeric"]),
    body("good_receipt.*.quantity")
      .notEmpty()
      .withMessage(ErrorList["Quantity required"]),
    body("good_receipt.*.quantity")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Quantity must be numeric"]),
    body("discount").notEmpty().withMessage(ErrorList["Discount required"]),
    body("discount")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Discount must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/confirm",
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    body("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
    body("name").notEmpty().withMessage(ErrorList["Name required"]),
    body("invoice_name")
      .notEmpty()
      .withMessage(ErrorList["Invoice name required"]),
    body("date").notEmpty().withMessage(ErrorList["Date required"]),
    body("faktur").exists().withMessage(ErrorList["Tax invoice required"]),
    body("good_receipt")
      .isArray()
      .withMessage(ErrorList["Good receipt must be array"]),
    body("good_receipt.*.id")
      .notEmpty()
      .withMessage(ErrorList["Good receipt ID required"]),
    body("good_receipt.*.price")
      .notEmpty()
      .withMessage(ErrorList["Price is required"]),
    body("good_receipt.*.price")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Price must be numeric"]),
    body("good_receipt.*.discount")
      .notEmpty()
      .withMessage(ErrorList["Discount required"]),
    body("good_receipt.*.discount")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Discount must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/reject",
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    body("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/gr/:id",
    param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  app.delete(
    "/hapus/:id",
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
  app.post("/archives", validate(archiveGoodReceiptSchema), balas);
  app.post("/check", validate(checkGoodReceiptSchema), balas);
  app.post("/buat", validate(createGoodReceiptSchema), balas);
  app.put("/ubah", validate(updateGoodReceiptSchema), balas);
  app.put("/confirm", validate(confirmGoodReceiptSchema), balas);
  app.put("/reject", validate(rejectGoodReceiptSchema), balas);
  app.get("/gr/:id", validate(paramGoodReceiptSchema, "params"), balas);
  app.delete("/hapus/:id", validate(deleteGoodReceiptSchema, "params"), balas);
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

async function bandingPut(jalur: string, badan: Record<string, unknown>) {
  const l = await request(lama).put(jalur).send(badan);
  const b = await request(baru).put(jalur).send(badan);
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

async function bandingDelete(jalur: string) {
  const l = await request(lama).delete(jalur);
  const b = await request(baru).delete(jalur);
  return {
    lama: { status: l.status, teks: l.text },
    baru: { status: b.status, teks: b.text },
  };
}

/** Menegaskan selisih yang disengaja: rantai lama 200, skema baru 400. */
async function dulu200Sekarang400(
  kirim: (app: express.Express) => request.Test
) {
  const l = await kirim(lama);
  const b = await kirim(baru);
  expect(l.status).toBe(200);
  expect(b.status).toBe(400);
}

const arsipLengkap = {
  year: 2026,
  month: 5,
  isActive: true,
  isDelete: false,
  isPending: false,
  sortBy: "date",
  sortDirection: "asc",
};

const barangSah = {
  product_id: 1,
  price: 1500.5,
  discount: 0,
  quantity: 2,
};

const buatLengkap = {
  date: "2026-05-01",
  name: "GR-001",
  company_id: 1,
  supplier_id: 2,
  good_receipt: [barangSah],
};

const ubahLengkap = {
  id: 7,
  date: "2026-05-01",
  name: "GR-001",
  faktur: "010.000-26.00000001",
  invoice_name: "INV-001",
  company_id: 1,
  supplier_id: 2,
  good_receipt: [barangSah],
  discount: 0,
};

const konfirmasiLengkap = {
  id: 7,
  name: "GR-001",
  invoice_name: "INV-001",
  date: "2026-05-01",
  faktur: "010.000-26.00000001",
  good_receipt: [{ id: 11, price: 1500.5, discount: 0 }],
};

describe("POST /archives — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", arsipLengkap],
    ["badan kosong", {}],
    ["tanpa tahun", { ...arsipLengkap, year: undefined }],
    ["tahun null", { ...arsipLengkap, year: null }],
    ["tahun teks kosong", { ...arsipLengkap, year: "" }],
    ["tahun bukan angka", { ...arsipLengkap, year: "abc" }],
    ["tahun sebelum 2000", { ...arsipLengkap, year: 1999 }],
    ["tahun pecahan", { ...arsipLengkap, year: 2026.5 }],
    ["tanpa bulan", { ...arsipLengkap, month: undefined }],
    ["bulan 0", { ...arsipLengkap, month: 0 }],
    ["bulan 13", { ...arsipLengkap, month: 13 }],
    ["tanpa isActive", { ...arsipLengkap, isActive: undefined }],
    ["isActive teks bebas", { ...arsipLengkap, isActive: "ya" }],
    ["tanpa isDelete", { ...arsipLengkap, isDelete: undefined }],
    ["tanpa isPending", { ...arsipLengkap, isPending: undefined }],
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

describe("POST /check — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["nama terisi", { name: "GR-001" }],
    ["badan kosong", {}],
    ["nama null tetap lolos, sama seperti exists()", { name: null }],
    ["nama teks kosong tetap lolos", { name: "" }],
    ["nama berupa angka tetap lolos", { name: 123 }],
    ["nama berupa larik kosong tetap lolos", { name: [] }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/check", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("POST / — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", buatLengkap],
    ["badan kosong", {}],
    ["tanpa tanggal", { ...buatLengkap, date: undefined }],
    ["tanggal null", { ...buatLengkap, date: null }],
    ["tanpa nama", { ...buatLengkap, name: undefined }],
    ["nama teks kosong", { ...buatLengkap, name: "" }],
    ["tanpa company_id", { ...buatLengkap, company_id: undefined }],
    ["tanpa supplier_id", { ...buatLengkap, supplier_id: undefined }],
    ["tanpa good_receipt", { ...buatLengkap, good_receipt: undefined }],
    ["good_receipt null", { ...buatLengkap, good_receipt: null }],
    ["good_receipt teks kosong", { ...buatLengkap, good_receipt: "" }],
    ["good_receipt bukan larik", { ...buatLengkap, good_receipt: "abc" }],
    ["good_receipt berupa angka", { ...buatLengkap, good_receipt: 5 }],
    ["good_receipt berupa objek", { ...buatLengkap, good_receipt: { a: 1 } }],
    ["good_receipt larik kosong", { ...buatLengkap, good_receipt: [] }],
    [
      "barang tanpa product_id",
      {
        ...buatLengkap,
        good_receipt: [{ ...barangSah, product_id: undefined }],
      },
    ],
    [
      "product_id nol",
      { ...buatLengkap, good_receipt: [{ ...barangSah, product_id: 0 }] },
    ],
    [
      "product_id pecahan",
      { ...buatLengkap, good_receipt: [{ ...barangSah, product_id: 1.5 }] },
    ],
    [
      "barang tanpa harga",
      { ...buatLengkap, good_receipt: [{ ...barangSah, price: undefined }] },
    ],
    [
      "harga negatif",
      { ...buatLengkap, good_receipt: [{ ...barangSah, price: -1 }] },
    ],
    [
      "harga nol diterima",
      { ...buatLengkap, good_receipt: [{ ...barangSah, price: 0 }] },
    ],
    [
      "barang tanpa diskon",
      { ...buatLengkap, good_receipt: [{ ...barangSah, discount: undefined }] },
    ],
    [
      "diskon negatif",
      { ...buatLengkap, good_receipt: [{ ...barangSah, discount: -0.5 }] },
    ],
    [
      "barang tanpa kuantitas",
      { ...buatLengkap, good_receipt: [{ ...barangSah, quantity: undefined }] },
    ],
    [
      "kuantitas negatif",
      { ...buatLengkap, good_receipt: [{ ...barangSah, quantity: -2 }] },
    ],
    [
      "kuantitas pecahan diterima",
      { ...buatLengkap, good_receipt: [{ ...barangSah, quantity: 2.5 }] },
    ],
    [
      "dua barang, keduanya sah",
      {
        ...buatLengkap,
        good_receipt: [barangSah, { ...barangSah, price: 10 }],
      },
    ],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/buat", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("PUT / — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", ubahLengkap],
    ["badan kosong", {}],
    ["tanpa id", { ...ubahLengkap, id: undefined }],
    ["tanpa tanggal", { ...ubahLengkap, date: undefined }],
    ["tanpa nama", { ...ubahLengkap, name: undefined }],
    ["tanpa faktur", { ...ubahLengkap, faktur: undefined }],
    [
      "faktur null tetap lolos, sama seperti exists()",
      {
        ...ubahLengkap,
        faktur: null,
      },
    ],
    ["faktur teks kosong tetap lolos", { ...ubahLengkap, faktur: "" }],
    ["tanpa invoice_name", { ...ubahLengkap, invoice_name: undefined }],
    ["tanpa company_id", { ...ubahLengkap, company_id: undefined }],
    ["tanpa supplier_id", { ...ubahLengkap, supplier_id: undefined }],
    ["tanpa good_receipt", { ...ubahLengkap, good_receipt: undefined }],
    ["good_receipt bukan larik", { ...ubahLengkap, good_receipt: "abc" }],
    ["good_receipt larik kosong", { ...ubahLengkap, good_receipt: [] }],
    ["tanpa diskon", { ...ubahLengkap, discount: undefined }],
    ["diskon negatif", { ...ubahLengkap, discount: -1 }],
    ["diskon pecahan diterima", { ...ubahLengkap, discount: 1500.5 }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPut("/ubah", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("PUT /confirm — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", konfirmasiLengkap],
    ["badan kosong", {}],
    ["tanpa id", { ...konfirmasiLengkap, id: undefined }],
    ["id nol", { ...konfirmasiLengkap, id: 0 }],
    ["id bukan angka", { ...konfirmasiLengkap, id: "abc" }],
    ["tanpa nama", { ...konfirmasiLengkap, name: undefined }],
    ["tanpa invoice_name", { ...konfirmasiLengkap, invoice_name: undefined }],
    ["tanpa tanggal", { ...konfirmasiLengkap, date: undefined }],
    ["tanpa faktur", { ...konfirmasiLengkap, faktur: undefined }],
    ["faktur null tetap lolos", { ...konfirmasiLengkap, faktur: null }],
    [
      "tanpa good_receipt tetap 'must be array'",
      { ...konfirmasiLengkap, good_receipt: undefined },
    ],
    ["good_receipt bukan larik", { ...konfirmasiLengkap, good_receipt: "abc" }],
    ["good_receipt larik kosong", { ...konfirmasiLengkap, good_receipt: [] }],
    [
      "barang tanpa id",
      { ...konfirmasiLengkap, good_receipt: [{ price: 1, discount: 0 }] },
    ],
    [
      "barang tanpa harga",
      { ...konfirmasiLengkap, good_receipt: [{ id: 11, discount: 0 }] },
    ],
    [
      "harga negatif",
      {
        ...konfirmasiLengkap,
        good_receipt: [{ id: 11, price: -1, discount: 0 }],
      },
    ],
    [
      "barang tanpa diskon",
      { ...konfirmasiLengkap, good_receipt: [{ id: 11, price: 1 }] },
    ],
    [
      "diskon negatif",
      {
        ...konfirmasiLengkap,
        good_receipt: [{ id: 11, price: 1, discount: -1 }],
      },
    ],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPut("/confirm", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("PUT /reject — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["id sah", { id: 7 }],
    ["badan kosong", {}],
    ["id null", { id: null }],
    ["id teks kosong", { id: "" }],
    ["id nol", { id: 0 }],
    ["id negatif", { id: -1 }],
    ["id pecahan", { id: 1.5 }],
    ["id bukan angka", { id: "abc" }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPut("/reject", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("GET /:id — perilaku harus identik", () => {
  for (const jalur of ["/gr/1", "/gr/0", "/gr/abc", "/gr/-1", "/gr/1.5"]) {
    it(jalur, async () => {
      const h = await bandingGet(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("DELETE /:id — perilaku harus identik", () => {
  for (const jalur of [
    "/hapus/1",
    "/hapus/0",
    "/hapus/abc",
    "/hapus/-1",
    "/hapus/1.5",
  ]) {
    it(jalur, async () => {
      const h = await bandingDelete(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }

  /*
    Cabang "ID is required" pada DELETE hanya bisa dicapai lewat safeParse.
    Express tidak pernah mencocokkan rute :id dengan parameter kosong, jadi
    rantai notEmpty() di sana memang tidak pernah gagal lewat HTTP — tetapi
    pesannya tetap harus berbeda dari cabang "ID must be numeric".
  */
  it("id tidak dikirim memakai pesan 'ID is required'", () => {
    const hasil = deleteGoodReceiptSchema.safeParse({});
    expect(hasil.success).toBe(false);
    expect(hasil.error?.issues[0].message).toBe(ErrorList["ID is required"]);
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — kebijakan ketat pada req.body.
 * Penjelasan lengkapnya di src/schemas/common.schema.ts.
 */
describe("Perbedaan yang disengaja: kebijakan ketat pada req.body", () => {
  const arsip: Array<[string, Record<string, unknown>]> = [
    ["tahun berupa teks", { ...arsipLengkap, year: "2026" }],
    ["bulan berupa teks", { ...arsipLengkap, month: "5" }],
    ["isActive berupa teks 'true'", { ...arsipLengkap, isActive: "true" }],
    ["isDelete berupa angka 1", { ...arsipLengkap, isDelete: 1 }],
    ["isPending berupa angka 0", { ...arsipLengkap, isPending: 0 }],
  ];

  for (const [nama, badan] of arsip) {
    it(`/archives ${nama}: dulu diterima, sekarang ditolak`, async () => {
      await dulu200Sekarang400((app) =>
        request(app).post("/archives").send(badan)
      );
    });
  }

  const buat: Array<[string, Record<string, unknown>]> = [
    ["nama berupa angka", { ...buatLengkap, name: 123 }],
    ["nama berupa objek", { ...buatLengkap, name: { a: 1 } }],
    ["nama berupa boolean", { ...buatLengkap, name: true }],
    ["company_id berupa teks", { ...buatLengkap, company_id: "1" }],
    ["company_id nol", { ...buatLengkap, company_id: 0 }],
    ["company_id berupa objek", { ...buatLengkap, company_id: { a: 1 } }],
    ["supplier_id berupa teks", { ...buatLengkap, supplier_id: "2" }],
    [
      "product_id berupa teks",
      { ...buatLengkap, good_receipt: [{ ...barangSah, product_id: "1" }] },
    ],
    [
      "harga berupa teks",
      { ...buatLengkap, good_receipt: [{ ...barangSah, price: "1500.5" }] },
    ],
    [
      "diskon berupa teks",
      { ...buatLengkap, good_receipt: [{ ...barangSah, discount: "0" }] },
    ],
    [
      "kuantitas berupa teks",
      { ...buatLengkap, good_receipt: [{ ...barangSah, quantity: "2" }] },
    ],
  ];

  for (const [nama, badan] of buat) {
    it(`POST / ${nama}: dulu diterima, sekarang ditolak`, async () => {
      await dulu200Sekarang400((app) => request(app).post("/buat").send(badan));
    });
  }

  const ubah: Array<[string, Record<string, unknown>]> = [
    ["id berupa teks", { ...ubahLengkap, id: "7" }],
    ["id nol", { ...ubahLengkap, id: 0 }],
    ["nama berupa angka", { ...ubahLengkap, name: 123 }],
    ["invoice_name berupa angka", { ...ubahLengkap, invoice_name: 123 }],
    ["diskon berupa teks", { ...ubahLengkap, discount: "0" }],
  ];

  for (const [nama, badan] of ubah) {
    it(`PUT / ${nama}: dulu diterima, sekarang ditolak`, async () => {
      await dulu200Sekarang400((app) => request(app).put("/ubah").send(badan));
    });
  }

  const konfirmasi: Array<[string, Record<string, unknown>]> = [
    ["id berupa teks", { ...konfirmasiLengkap, id: "7" }],
    ["nama berupa angka", { ...konfirmasiLengkap, name: 123 }],
    ["invoice_name berupa objek", { ...konfirmasiLengkap, invoice_name: {} }],
    [
      "harga barang berupa teks",
      {
        ...konfirmasiLengkap,
        good_receipt: [{ id: 11, price: "1500.5", discount: 0 }],
      },
    ],
  ];

  for (const [nama, badan] of konfirmasi) {
    it(`PUT /confirm ${nama}: dulu diterima, sekarang ditolak`, async () => {
      await dulu200Sekarang400((app) =>
        request(app).put("/confirm").send(badan)
      );
    });
  }

  it("PUT /reject id berupa teks: dulu diterima, sekarang ditolak", async () => {
    await dulu200Sekarang400((app) =>
      request(app).put("/reject").send({ id: "7" })
    );
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — lubang larik kosong.
 *
 * Pemeriksaan bawaan express-validator memperlakukan bidang berisi larik
 * sebagai KUMPULAN nilai. Untuk larik KOSONG jumlah anggotanya nol, sehingga
 * perulangannya tidak berjalan sekali pun dan bidang itu lolos TANPA DIPERIKSA
 * SAMA SEKALI — termasuk bidang yang jelas-jelas wajib diisi.
 */
describe("Perbedaan yang disengaja: bidang berisi larik kosong", () => {
  const kasus: Array<[string, (app: express.Express) => request.Test]> = [
    [
      "/archives year: []",
      (app) =>
        request(app)
          .post("/archives")
          .send({ ...arsipLengkap, year: [] }),
    ],
    [
      "/archives month: []",
      (app) =>
        request(app)
          .post("/archives")
          .send({ ...arsipLengkap, month: [] }),
    ],
    [
      "/archives isActive: []",
      (app) =>
        request(app)
          .post("/archives")
          .send({ ...arsipLengkap, isActive: [] }),
    ],
    [
      "/archives sortBy: []",
      (app) =>
        request(app)
          .post("/archives")
          .send({ ...arsipLengkap, sortBy: [] }),
    ],
    [
      "/archives sortDirection: []",
      (app) =>
        request(app)
          .post("/archives")
          .send({ ...arsipLengkap, sortDirection: [] }),
    ],
    [
      "POST / date: []",
      (app) =>
        request(app)
          .post("/buat")
          .send({ ...buatLengkap, date: [] }),
    ],
    [
      "POST / name: []",
      (app) =>
        request(app)
          .post("/buat")
          .send({ ...buatLengkap, name: [] }),
    ],
    [
      "POST / company_id: []",
      (app) =>
        request(app)
          .post("/buat")
          .send({ ...buatLengkap, company_id: [] }),
    ],
    [
      "POST / harga barang: []",
      (app) =>
        request(app)
          .post("/buat")
          .send({
            ...buatLengkap,
            good_receipt: [{ ...barangSah, price: [] }],
          }),
    ],
    [
      "PUT / discount: []",
      (app) =>
        request(app)
          .put("/ubah")
          .send({ ...ubahLengkap, discount: [] }),
    ],
    [
      "PUT /confirm id barang: []",
      (app) =>
        request(app)
          .put("/confirm")
          .send({
            ...konfirmasiLengkap,
            good_receipt: [{ id: [], price: 1, discount: 0 }],
          }),
    ],
    [
      "PUT /reject id: []",
      (app) => request(app).put("/reject").send({ id: [] }),
    ],
  ];

  for (const [nama, kirim] of kasus) {
    it(`${nama}: dulu diterima, sekarang ditolak`, async () => {
      await dulu200Sekarang400(kirim);
    });
  }

  /*
    Kebalikannya: `good_receipt: []` TETAP diterima keduanya. isArray() adalah
    custom validator, bukan pemeriksaan bawaan, sehingga ia menerima nilai
    aslinya utuh dan larik kosong memang sah menurut rantai lama. z.array()
    tanpa .min() menirunya. Perbedaan ini gampang tertukar dengan kasus di
    atas, jadi dikunci di sini.
  */
  it("good_receipt: [] tetap diterima di kedua sisi", async () => {
    const h = await bandingPost("/buat", { ...buatLengkap, good_receipt: [] });
    expect(h.lama.status).toBe(200);
    expect(h.baru).toEqual(h.lama);
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — batas panjang dan teks berisi spasi.
 *
 * Batas panjang diambil dari lebar kolom di prisma/schema.prisma
 * (good_receipt_code.name VarChar(100), invoice_name VarChar(191)). Sebelumnya
 * nilai yang lebih panjang lolos validasi lalu ditolak MySQL sebagai 500.
 *
 * Pesannya memakai key "wajib diisi" milik bidang itu, karena ErrorList belum
 * punya key "too long" untuk domain ini dan key baru tidak boleh dikarang —
 * lihat catatannya di src/schemas/good-receipt.schema.ts.
 */
describe("Perbedaan yang disengaja: panjang teks dan spasi saja", () => {
  const seratusSatu = "A".repeat(101);
  const seratusSembilanPuluhDua = "B".repeat(192);

  it("POST / nama 101 karakter: dulu diterima, sekarang ditolak", async () => {
    await dulu200Sekarang400((app) =>
      request(app)
        .post("/buat")
        .send({ ...buatLengkap, name: seratusSatu })
    );
  });

  it("POST / nama 100 karakter tetap diterima keduanya", async () => {
    const h = await bandingPost("/buat", {
      ...buatLengkap,
      name: "A".repeat(100),
    });
    expect(h.lama.status).toBe(200);
    expect(h.baru).toEqual(h.lama);
  });

  it("PUT / invoice_name 192 karakter: dulu diterima, sekarang ditolak", async () => {
    await dulu200Sekarang400((app) =>
      request(app)
        .put("/ubah")
        .send({ ...ubahLengkap, invoice_name: seratusSembilanPuluhDua })
    );
  });

  it("POST / nama berisi spasi saja: dulu diterima, sekarang ditolak", async () => {
    await dulu200Sekarang400((app) =>
      request(app)
        .post("/buat")
        .send({ ...buatLengkap, name: "   " })
    );
  });

  it("pesan panjang memakai key khusus batas panjang", () => {
    const hasil = createGoodReceiptSchema.safeParse({
      ...buatLengkap,
      name: seratusSatu,
    });
    expect(hasil.success).toBe(false);
    expect(hasil.error?.issues[0].message).toBe(
      ErrorList["Good receipt name too long"]
    );
  });
});

/**
 * PERBEDAAN URUTAN PESAN PADA LARIK BERSARANG.
 *
 * express-validator menjalankan satu rantai per BIDANG dan mengumpulkan
 * galatnya untuk seluruh anggota larik sekaligus, sehingga urutan pesannya
 * bidang-dulu. Zod memeriksa anggota-dulu. Selisihnya hanya terlihat bila dua
 * anggota berbeda gagal pada bidang yang berbeda; statusnya tetap 400 dan
 * kedua pesan sama-sama benar untuk badan yang dikirim.
 */
describe("Perbedaan yang disengaja: urutan pesan antar anggota larik", () => {
  const badan = {
    ...buatLengkap,
    good_receipt: [
      { ...barangSah, price: -1 },
      { ...barangSah, product_id: 0 },
    ],
  };

  it("lama melaporkan product_id, baru melaporkan price", async () => {
    const l = await request(lama).post("/buat").send(badan);
    const b = await request(baru).post("/buat").send(badan);

    expect(l.status).toBe(400);
    expect(l.text).toBe(ErrorList["Product ID must be numeric"]);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["Price must be numeric"]);
  });

  it("satu anggota saja: urutannya tetap sama", async () => {
    const h = await bandingPost("/buat", {
      ...buatLengkap,
      good_receipt: [{ ...barangSah, product_id: 0, price: -1 }],
    });
    expect(h.baru).toEqual(h.lama);
  });
});

/**
 * PUT / dan POST / varian superadministrator memakai rantai yang sama persis,
 * jadi keduanya berbagi satu skema. Dikunci di sini supaya pemisahan aturan di
 * kemudian hari tidak terjadi diam-diam.
 */
describe("PUT / dan POST / superadministrator berbagi satu skema", () => {
  it("keduanya menerima badan yang sama", () => {
    expect(updateGoodReceiptSchema.safeParse(ubahLengkap).success).toBe(true);
  });

  it("pesan name dan invoice_name memang tertukar, seperti rantai lama", () => {
    const tanpaName = updateGoodReceiptSchema.safeParse({
      ...ubahLengkap,
      name: undefined,
    });
    expect(tanpaName.error?.issues[0].message).toBe(
      ErrorList["Invoice name required"]
    );

    const tanpaInvoiceName = updateGoodReceiptSchema.safeParse({
      ...ubahLengkap,
      invoice_name: undefined,
    });
    expect(tanpaInvoiceName.error?.issues[0].message).toBe(
      ErrorList["Name required"]
    );
  });
});
