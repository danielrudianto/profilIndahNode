import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import {
  archiveSalesDepositSchema,
  confirmSalesDepositSchema,
  createSalesDepositSchema,
  paramSalesDepositSchema,
  rejectSalesDepositSchema,
} from "../../src/schemas/sales-deposit.schema";

/**
 * Perbandingan perilaku: rantai express-validator lama versus skema Zod baru
 * untuk domain setoran penjualan.
 *
 * Bentuknya diferensial. Dua aplikasi Express dibangun berdampingan — satu
 * memakai rantai lama yang disalin apa adanya dari sales-deposit.route.ts, satu
 * memakai skema baru — lalu permintaan yang sama dikirim ke keduanya dan
 * status serta badan balasannya dibandingkan. Menuliskan hasil yang diharapkan
 * secara manual tidak cukup: yang perlu dibuktikan bukan "skema menolak badan
 * ini", melainkan "skema menolak badan ini persis seperti rantai lama".
 *
 * Ini jalur uang, jadi batas nilai diuji dua arah: pecahan harus tetap
 * diterima dan negatif harus tetap ditolak.
 *
 * Tiga kelompok perbedaan memang disengaja dan diuji terpisah di bagian bawah:
 * kebijakan ketat pada req.body, larik kosong yang dulu meloloskan seluruh
 * pemeriksaan, dan urutan pesan pada larik pembayaran berisi banyak baris.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin apa adanya dari sales-deposit.route.ts. */
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
    body("page").notEmpty().withMessage(ErrorList["Page is required"]),
    body("page")
      .isInt({ min: 1 })
      .withMessage(ErrorList["Page must be numeric"]),
    body("pageSize").notEmpty().withMessage(ErrorList["Page size is required"]),
    body("pageSize")
      .isInt({ min: 10, max: 50 })
      .withMessage(ErrorList["Page size must be numeric"]),
    body("isPending").exists().withMessage(ErrorList["Parameter error"]),
    body("isDelete").exists().withMessage(ErrorList["Parameter error"]),
    body("isPending").isBoolean().withMessage(ErrorList["Parameter error"]),
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
    "/confirm",
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    body("id").isInt({ min: 0 }).withMessage(ErrorList["ID must be numeric"]),
    body("date").notEmpty().withMessage(ErrorList["Date required"]),
    body("sales_invoice_payment")
      .notEmpty()
      .withMessage(ErrorList["Payment is required"]),
    body("sales_invoice_payment")
      .isArray()
      .withMessage(ErrorList["Payment must be an array"]),
    body("sales_invoice_payment.*.payment_method_id")
      .exists()
      .withMessage(ErrorList["Payment method required"]),
    body("sales_invoice_payment.*.value")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Amount must be numeric"]),
    body("sales_invoice_payment.*.date")
      .notEmpty()
      .withMessage(ErrorList["Payment date is required"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/reject",
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    body("id").isInt({ min: 0 }).withMessage(ErrorList["ID must be numeric"]),
    body("method")
      .isIn(["create", "delete"])
      .withMessage(ErrorList["Parameter error"]),
    body("return_payment_date")
      .if(body("method").equals("create"))
      .notEmpty()
      .withMessage(ErrorList["Date required"]),
    body("return_payment_method")
      .if(body("method").equals("create"))
      .notEmpty()
      .withMessage(ErrorList["Return payment method is required"]),
    body("return_payment_name")
      .if(body("method").equals("create"))
      .notEmpty()
      .withMessage(ErrorList["Return payment name is required"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/buat",
    body("uuid").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("customer_id")
      .exists()
      .withMessage(ErrorList["Customer ID is required"]),
    body("discount").notEmpty().withMessage(ErrorList["Discount required"]),
    body("discount")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Discount must be numeric"]),
    // Pesan "Discount" pada delivery dan service memang tertulis begitu pada
    // rantai aslinya. Cacat salin-tempel ini sengaja ikut disalin ke sini.
    body("delivery").notEmpty().withMessage(ErrorList["Discount required"]),
    body("delivery")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Discount must be numeric"]),
    body("service").notEmpty().withMessage(ErrorList["Discount required"]),
    body("service")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Discount must be numeric"]),
    body("is_paid")
      .isBoolean()
      .withMessage(ErrorList["Payment status is required"]),
    body("type")
      .isIn(["INTERNAL", "EXTERNAL"])
      .withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/setoran/:id",
    param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/archives", validate(archiveSalesDepositSchema), balas);
  app.post("/confirm", validate(confirmSalesDepositSchema), balas);
  app.post("/reject", validate(rejectSalesDepositSchema), balas);
  app.post("/buat", validate(createSalesDepositSchema), balas);
  app.get("/setoran/:id", validate(paramSalesDepositSchema, "params"), balas);
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

/** Memastikan yang lama benar-benar menerima dan yang baru menolak. */
async function bandingPengetatan(
  jalur: string,
  badan: Record<string, unknown>
) {
  const l = await request(lama).post(jalur).send(badan);
  const b = await request(baru).post(jalur).send(badan);
  return { lama: l.status, baru: b.status, teksBaru: b.text };
}

/* -------------------------------------------------------------- /archives */

const arsipLengkap = {
  year: 2026,
  month: 5,
  page: 1,
  pageSize: 10,
  isPending: true,
  isDelete: false,
  sortBy: "date",
  sortDirection: "asc",
};

describe("POST /archives — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", arsipLengkap],
    ["badan kosong", {}],
    ["tanpa tahun", { ...arsipLengkap, year: undefined }],
    ["tahun null", { ...arsipLengkap, year: null }],
    ["tahun sebelum 2000", { ...arsipLengkap, year: 1999 }],
    ["tahun pecahan", { ...arsipLengkap, year: 2026.5 }],
    ["tanpa bulan", { ...arsipLengkap, month: undefined }],
    ["bulan 0", { ...arsipLengkap, month: 0 }],
    ["bulan 13", { ...arsipLengkap, month: 13 }],
    ["tanpa halaman", { ...arsipLengkap, page: undefined }],
    ["halaman 0", { ...arsipLengkap, page: 0 }],
    ["tanpa pageSize", { ...arsipLengkap, pageSize: undefined }],
    ["pageSize di bawah 10", { ...arsipLengkap, pageSize: 9 }],
    ["pageSize di atas 50", { ...arsipLengkap, pageSize: 51 }],
    ["pageSize 50", { ...arsipLengkap, pageSize: 50 }],
    ["tanpa isPending", { ...arsipLengkap, isPending: undefined }],
    ["isPending objek", { ...arsipLengkap, isPending: { a: 1 } }],
    ["tanpa isDelete", { ...arsipLengkap, isDelete: undefined }],
    ["tanpa sortBy", { ...arsipLengkap, sortBy: undefined }],
    ["sortBy kosong", { ...arsipLengkap, sortBy: "" }],
    ["sortDirection salah", { ...arsipLengkap, sortDirection: "naik" }],
    ["sortDirection desc", { ...arsipLengkap, sortDirection: "desc" }],
    ["tanpa sortDirection", { ...arsipLengkap, sortDirection: undefined }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/archives", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/* --------------------------------------------------------------- /confirm */

const konfirmasiLengkap = {
  id: 7,
  date: "2026-05-01",
  sales_invoice_payment: [
    { payment_method_id: 1, value: 1500.5, date: "2026-05-01" },
  ],
};

describe("POST /confirm — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", konfirmasiLengkap],
    ["badan kosong", {}],
    ["tanpa id", { ...konfirmasiLengkap, id: undefined }],
    ["id 0 diterima", { ...konfirmasiLengkap, id: 0 }],
    ["id negatif", { ...konfirmasiLengkap, id: -1 }],
    ["id pecahan", { ...konfirmasiLengkap, id: 1.5 }],
    ["tanpa tanggal", { ...konfirmasiLengkap, date: undefined }],
    ["tanggal kosong", { ...konfirmasiLengkap, date: "" }],
    [
      "tanpa daftar pembayaran",
      { ...konfirmasiLengkap, sales_invoice_payment: undefined },
    ],
    [
      "daftar pembayaran null",
      { ...konfirmasiLengkap, sales_invoice_payment: null },
    ],
    [
      "daftar pembayaran berupa teks",
      { ...konfirmasiLengkap, sales_invoice_payment: "abc" },
    ],
    [
      "daftar pembayaran berupa objek",
      { ...konfirmasiLengkap, sales_invoice_payment: { a: 1 } },
    ],
    [
      "daftar pembayaran berupa angka",
      { ...konfirmasiLengkap, sales_invoice_payment: 0 },
    ],
    [
      "anggota bukan objek",
      { ...konfirmasiLengkap, sales_invoice_payment: ["a", "b"] },
    ],
    ["anggota null", { ...konfirmasiLengkap, sales_invoice_payment: [null] }],
    [
      "baris tanpa payment_method_id",
      {
        ...konfirmasiLengkap,
        sales_invoice_payment: [{ value: 10, date: "2026-05-01" }],
      },
    ],
    [
      "payment_method_id null tetap lolos",
      {
        ...konfirmasiLengkap,
        sales_invoice_payment: [
          { payment_method_id: null, value: 10, date: "2026-05-01" },
        ],
      },
    ],
    [
      "nilai negatif ditolak",
      {
        ...konfirmasiLengkap,
        sales_invoice_payment: [
          { payment_method_id: 1, value: -0.01, date: "2026-05-01" },
        ],
      },
    ],
    [
      "nilai pecahan diterima",
      {
        ...konfirmasiLengkap,
        sales_invoice_payment: [
          { payment_method_id: 1, value: 0.05, date: "2026-05-01" },
        ],
      },
    ],
    [
      "nilai nol diterima",
      {
        ...konfirmasiLengkap,
        sales_invoice_payment: [
          { payment_method_id: 1, value: 0, date: "2026-05-01" },
        ],
      },
    ],
    [
      "nilai null",
      {
        ...konfirmasiLengkap,
        sales_invoice_payment: [
          { payment_method_id: 1, value: null, date: "2026-05-01" },
        ],
      },
    ],
    [
      "tanpa tanggal pembayaran",
      {
        ...konfirmasiLengkap,
        sales_invoice_payment: [{ payment_method_id: 1, value: 10 }],
      },
    ],
    [
      "dua baris sah",
      {
        ...konfirmasiLengkap,
        sales_invoice_payment: [
          { payment_method_id: 1, value: 10, date: "2026-05-01" },
          { payment_method_id: 2, value: 20.25, date: "2026-05-02" },
        ],
      },
    ],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/confirm", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  /*
    Larik KOSONG adalah satu-satunya tempat kelonggaran express-validator
    dipertahankan dengan sengaja. Lihat penjelasannya di skema.
  */
  it("daftar pembayaran kosong tetap lolos di keduanya", async () => {
    const badan = { ...konfirmasiLengkap, sales_invoice_payment: [] };
    const h = await bandingPost("/confirm", badan);
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(200);
    expect(h.baru).toEqual(h.lama);
  });
});

/* ---------------------------------------------------------------- /reject */

const tolakCreate = {
  id: 7,
  method: "create",
  return_payment_date: "2026-05-01",
  return_payment_method: "Cash",
  return_payment_name: "Budi",
};

describe("POST /reject — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["create lengkap", tolakCreate],
    ["badan kosong", {}],
    ["tanpa id", { ...tolakCreate, id: undefined }],
    ["id negatif", { ...tolakCreate, id: -1 }],
    ["id 0 diterima", { ...tolakCreate, id: 0 }],
    ["tanpa method", { ...tolakCreate, method: undefined }],
    ["method di luar daftar", { ...tolakCreate, method: "hapus" }],
    ["method delete tanpa bidang pengembalian", { id: 7, method: "delete" }],
    [
      "method delete dengan bidang pengembalian kosong",
      {
        id: 7,
        method: "delete",
        return_payment_date: "",
        return_payment_method: "",
        return_payment_name: "",
      },
    ],
    [
      "create tanpa return_payment_date",
      { ...tolakCreate, return_payment_date: undefined },
    ],
    [
      "create return_payment_date kosong",
      { ...tolakCreate, return_payment_date: "" },
    ],
    [
      "create tanpa return_payment_method",
      { ...tolakCreate, return_payment_method: undefined },
    ],
    [
      "create tanpa return_payment_name",
      { ...tolakCreate, return_payment_name: undefined },
    ],
    [
      "create tanpa ketiganya — pesan pertama harus tanggal",
      {
        id: 7,
        method: "create",
      },
    ],
    [
      "id salah dan bidang bersyarat hilang — pesan id lebih dulu",
      { id: -1, method: "create" },
    ],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/reject", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/* ------------------------------------------------------------------ POST / */

const setoranLengkap = {
  uuid: "abc-123",
  customer_id: 4,
  discount: 0,
  delivery: 0,
  service: 0,
  /* Wajib sejak biaya administrasi kartu kredit ditambahkan; rantai lama
     tidak mengenalnya, jadi ketiadaannya adalah perubahan perilaku yang
     disengaja dan diuji terpisah di bawah. */
  admin_fee: 0,
  is_paid: true,
  type: "INTERNAL",
};

describe("POST / — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", setoranLengkap],
    ["badan kosong", {}],
    ["tanpa uuid", { ...setoranLengkap, uuid: undefined }],
    ["uuid kosong", { ...setoranLengkap, uuid: "" }],
    ["tanpa customer_id", { ...setoranLengkap, customer_id: undefined }],
    ["customer_id null tetap lolos", { ...setoranLengkap, customer_id: null }],
    ["tanpa diskon", { ...setoranLengkap, discount: undefined }],
    ["diskon negatif", { ...setoranLengkap, discount: -1 }],
    ["diskon pecahan diterima", { ...setoranLengkap, discount: 1500.5 }],
    ["tanpa delivery", { ...setoranLengkap, delivery: undefined }],
    ["delivery negatif", { ...setoranLengkap, delivery: -0.01 }],
    ["delivery pecahan diterima", { ...setoranLengkap, delivery: 12.75 }],
    ["tanpa service", { ...setoranLengkap, service: undefined }],
    ["service negatif", { ...setoranLengkap, service: -5 }],
    /*
      Jenisnya ikut disertakan karena biayanya di atas nol. Rantai lama tidak
      mengenal jenis jasa sama sekali, jadi tanpa ini kasus paritas berubah
      menjadi kasus aturan baru — dan yang diuji di sini bukan itu.
    */
    [
      "service pecahan diterima",
      { ...setoranLengkap, service: 0.5, service_type: "CNC" },
    ],
    ["tanpa is_paid", { ...setoranLengkap, is_paid: undefined }],
    ["is_paid objek", { ...setoranLengkap, is_paid: { a: 1 } }],
    ["is_paid false", { ...setoranLengkap, is_paid: false }],
    ["tanpa type", { ...setoranLengkap, type: undefined }],
    ["type di luar daftar", { ...setoranLengkap, type: "LAINNYA" }],
    ["type EXTERNAL", { ...setoranLengkap, type: "EXTERNAL" }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/buat", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  /*
    Cacat salin-tempel pada rantai lama sengaja TIDAK diperbaiki di sini, lain
    dari sales-invoice.schema.ts. Tes ini mengunci keputusan itu supaya tidak
    berubah tanpa sengaja.
  */
  it("delivery kosong tetap memakai pesan diskon, sama seperti rantai lama", async () => {
    const h = await bandingPost("/buat", {
      ...setoranLengkap,
      delivery: undefined,
    });
    expect(h.lama.teks).toBe(ErrorList["Discount required"]);
    expect(h.baru.teks).toBe(ErrorList["Discount required"]);
  });

  it("service negatif tetap memakai pesan diskon, sama seperti rantai lama", async () => {
    const h = await bandingPost("/buat", { ...setoranLengkap, service: -1 });
    expect(h.lama.teks).toBe(ErrorList["Discount must be numeric"]);
    expect(h.baru.teks).toBe(ErrorList["Discount must be numeric"]);
  });
});

/* --------------------------------------------------------------- GET /:id */

describe("Parameter :id — perilaku harus identik", () => {
  for (const jalur of [
    "/setoran/1",
    "/setoran/0",
    "/setoran/-1",
    "/setoran/abc",
    "/setoran/1.5",
    "/setoran/999999",
  ]) {
    it(jalur, async () => {
      const h = await bandingGet(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — penulisan id pada req.params.
 *
 * intFromText memakai Number(), sedangkan isNumeric() bekerja pada bentuk
 * teksnya. Beberapa penulisan yang dulu ditolak sekarang diterima. Angkanya
 * tetap bilangan bulat >= 1, jadi tidak ada nilai baru yang lolos ke basis
 * data; yang berubah hanya penulisan yang diampuni.
 */
describe("Perbedaan yang disengaja: penulisan id yang lebih diampuni", () => {
  for (const [jalur, hasil] of [
    ["/setoran/1e2", 100],
    ["/setoran/0x10", 16],
    ["/setoran/%205%20", 5],
  ] as Array<[string, number]>) {
    it(`${jalur}: dulu ditolak, sekarang diterima sebagai ${hasil}`, async () => {
      const h = await bandingGet(jalur);
      expect(h.lama.status).toBe(400);
      expect(h.baru.status).toBe(200);
    });
  }
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — kebijakan ketat pada req.body.
 * Penjelasan lengkapnya di src/schemas/common.schema.ts.
 *
 * Tiap kasus menjalankan rantai LAMA juga, supaya yang tercatat bukan hanya
 * "sekarang ditolak" melainkan "dulu diterima, sekarang ditolak".
 */
describe("Perbedaan yang disengaja: angka berupa teks ditolak", () => {
  const kasus: Array<[string, string, Record<string, unknown>, string]> = [
    [
      "/archives",
      "tahun berupa teks",
      { ...arsipLengkap, year: "2026" },
      ErrorList["Year must be numeric"],
    ],
    [
      "/archives",
      "bulan berupa teks",
      { ...arsipLengkap, month: "5" },
      ErrorList["Month must be numeric"],
    ],
    [
      "/archives",
      "halaman berupa teks",
      { ...arsipLengkap, page: "1" },
      ErrorList["Page must be numeric"],
    ],
    [
      "/archives",
      "pageSize berupa teks",
      { ...arsipLengkap, pageSize: "10" },
      ErrorList["Page size must be numeric"],
    ],
    [
      "/confirm",
      "id berupa teks",
      { ...konfirmasiLengkap, id: "7" },
      ErrorList["ID must be numeric"],
    ],
    [
      "/confirm",
      "nilai pembayaran berupa teks",
      {
        ...konfirmasiLengkap,
        sales_invoice_payment: [
          { payment_method_id: 1, value: "1500.50", date: "2026-05-01" },
        ],
      },
      ErrorList["Amount must be numeric"],
    ],
    [
      "/reject",
      "id berupa teks",
      { ...tolakCreate, id: "7" },
      ErrorList["ID must be numeric"],
    ],
    [
      "/buat",
      "diskon berupa teks",
      { ...setoranLengkap, discount: "0" },
      ErrorList["Discount must be numeric"],
    ],
    [
      "/buat",
      "delivery berupa teks",
      { ...setoranLengkap, delivery: "12.75" },
      ErrorList["Discount must be numeric"],
    ],
  ];

  for (const [jalur, nama, badan, pesan] of kasus) {
    it(`${jalur} ${nama}: dulu diterima, sekarang ditolak`, async () => {
      const h = await bandingPengetatan(jalur, badan);
      expect(h.lama).toBe(200);
      expect(h.baru).toBe(400);
      expect(h.teksBaru).toBe(pesan);
    });
  }
});

describe("Perbedaan yang disengaja: boolean palsu ditolak", () => {
  const kasus: Array<[string, Record<string, unknown>, string]> = [
    [
      "isPending berupa teks",
      { ...arsipLengkap, isPending: "true" },
      ErrorList["Parameter error"],
    ],
    [
      "isDelete berupa teks",
      { ...arsipLengkap, isDelete: "false" },
      ErrorList["Parameter error"],
    ],
    [
      "isPending berupa angka 1",
      { ...arsipLengkap, isPending: 1 },
      ErrorList["Parameter error"],
    ],
    [
      "isDelete berupa angka 0",
      { ...arsipLengkap, isDelete: 0 },
      ErrorList["Parameter error"],
    ],
  ];

  for (const [nama, badan, pesan] of kasus) {
    it(`${nama}: dulu diterima, sekarang ditolak`, async () => {
      const h = await bandingPengetatan("/archives", badan);
      expect(h.lama).toBe(200);
      expect(h.baru).toBe(400);
      expect(h.teksBaru).toBe(pesan);
    });
  }

  it("is_paid berupa teks pada POST /: dulu diterima, sekarang ditolak", async () => {
    const h = await bandingPengetatan("/buat", {
      ...setoranLengkap,
      is_paid: "true",
    });
    expect(h.lama).toBe(200);
    expect(h.baru).toBe(400);
    expect(h.teksBaru).toBe(ErrorList["Payment status is required"]);
  });
});

describe("Perbedaan yang disengaja: nilai bukan teks pada bidang teks ditolak", () => {
  const kasus: Array<[string, string, Record<string, unknown>, string]> = [
    [
      "/confirm",
      "tanggal berupa angka epoch",
      { ...konfirmasiLengkap, date: 1700000000000 },
      ErrorList["Date required"],
    ],
    [
      "/confirm",
      "tanggal pembayaran berupa angka epoch",
      {
        ...konfirmasiLengkap,
        sales_invoice_payment: [
          { payment_method_id: 1, value: 10, date: 1700000000000 },
        ],
      },
      ErrorList["Payment date is required"],
    ],
    [
      "/reject",
      "return_payment_date berupa angka",
      { ...tolakCreate, return_payment_date: 1700000000000 },
      ErrorList["Date required"],
    ],
    [
      "/reject",
      "return_payment_method berupa angka",
      { ...tolakCreate, return_payment_method: 5 },
      ErrorList["Return payment method is required"],
    ],
    [
      "/reject",
      "return_payment_name berupa objek",
      { ...tolakCreate, return_payment_name: { nama: "Budi" } },
      ErrorList["Return payment name is required"],
    ],
  ];

  for (const [jalur, nama, badan, pesan] of kasus) {
    it(`${jalur} ${nama}: dulu diterima, sekarang ditolak`, async () => {
      const h = await bandingPengetatan(jalur, badan);
      expect(h.lama).toBe(200);
      expect(h.baru).toBe(400);
      expect(h.teksBaru).toBe(pesan);
    });
  }

  it("/confirm tanggal berisi spasi saja: dulu diterima, sekarang ditolak", async () => {
    const h = await bandingPengetatan("/confirm", {
      ...konfirmasiLengkap,
      date: "   ",
    });
    expect(h.lama).toBe(200);
    expect(h.baru).toBe(400);
    expect(h.teksBaru).toBe(ErrorList["Date required"]);
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — larik kosong.
 *
 * express-validator memperlakukan bidang berisi larik sebagai KUMPULAN nilai
 * dan memeriksa tiap anggotanya. Larik kosong tidak punya anggota, sehingga
 * TIDAK SATU PUN aturan dijalankan dan nilainya lolos — termasuk pada bidang
 * yang jelas bukan larik seperti `year` atau `is_paid`. Kelonggaran ini tidak
 * ditiru; satu-satunya pengecualian adalah `sales_invoice_payment` yang memang
 * berupa larik dan diuji terpisah di atas.
 */
describe("Perbedaan yang disengaja: larik kosong tidak lagi meloloskan pemeriksaan", () => {
  const kasus: Array<[string, string, Record<string, unknown>, string]> = [
    [
      "/archives",
      "year",
      { ...arsipLengkap, year: [] },
      ErrorList["Year must be numeric"],
    ],
    [
      "/archives",
      "pageSize",
      { ...arsipLengkap, pageSize: [] },
      ErrorList["Page size must be numeric"],
    ],
    [
      "/archives",
      "isPending",
      { ...arsipLengkap, isPending: [] },
      ErrorList["Parameter error"],
    ],
    [
      "/archives",
      "sortBy",
      { ...arsipLengkap, sortBy: [] },
      ErrorList["Sort by required"],
    ],
    [
      "/archives",
      "sortDirection",
      { ...arsipLengkap, sortDirection: [] },
      ErrorList["Sort direction only supports ascending or descending"],
    ],
    [
      "/confirm",
      "date",
      { ...konfirmasiLengkap, date: [] },
      ErrorList["Date required"],
    ],
    [
      "/reject",
      "method",
      { ...tolakCreate, method: [] },
      ErrorList["Parameter error"],
    ],
    [
      "/buat",
      "discount",
      { ...setoranLengkap, discount: [] },
      ErrorList["Discount must be numeric"],
    ],
    [
      "/buat",
      "is_paid",
      { ...setoranLengkap, is_paid: [] },
      ErrorList["Payment status is required"],
    ],
    [
      "/buat",
      "type",
      { ...setoranLengkap, type: [] },
      ErrorList["Parameter error"],
    ],
  ];

  for (const [jalur, bidang, badan, pesan] of kasus) {
    it(`${jalur} ${bidang} berupa larik kosong: dulu diterima, sekarang ditolak`, async () => {
      const h = await bandingPengetatan(jalur, badan);
      expect(h.lama).toBe(200);
      expect(h.baru).toBe(400);
      expect(h.teksBaru).toBe(pesan);
    });
  }
});

/**
 * PERBEDAAN YANG DISENGAJA — urutan pesan pada larik berisi banyak baris.
 *
 * express-validator menjalankan rantainya per KOLOM: seluruh payment_method_id
 * lebih dulu, baru seluruh value. Zod memeriksa per BARIS. Permintaannya
 * sama-sama ditolak dengan 400; yang berbeda hanya bidang mana yang disebut.
 */
describe("Perbedaan yang disengaja: urutan pesan lintas baris pembayaran", () => {
  it("baris pertama salah nilai, baris kedua kehilangan metode", async () => {
    const badan = {
      ...konfirmasiLengkap,
      sales_invoice_payment: [
        { payment_method_id: 1, value: -1, date: "2026-05-01" },
        { value: 10, date: "2026-05-01" },
      ],
    };
    const h = await bandingPost("/confirm", badan);

    expect(h.lama.status).toBe(400);
    expect(h.baru.status).toBe(400);
    expect(h.lama.teks).toBe(ErrorList["Payment method required"]);
    expect(h.baru.teks).toBe(ErrorList["Amount must be numeric"]);
  });
});

/**
 * PERBEDAAN YANG DISENGAJA — `method` berupa larik satu anggota.
 *
 * isIn() memeriksa tiap anggota larik, sehingga ["create"] dulu lolos dan
 * permintaannya diproses sebagai "create". z.enum menolak nilai bukan teks.
 */
describe("Perbedaan yang disengaja: method berupa larik satu anggota", () => {
  it("dulu diproses sebagai create, sekarang ditolak sebagai parameter salah", async () => {
    const badan = { ...tolakCreate, method: ["create"] };
    const h = await bandingPost("/reject", badan);

    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Parameter error"]);
  });
});

/**
 * Aturan silang biaya jasa ↔ jenis jasa.
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA: rantai lama tidak mengenal jenis jasa,
 * sehingga tidak ada paritas yang bisa diuji di sini — hanya perilaku barunya.
 */
describe("Biaya jasa dan jenisnya harus sejalan", () => {
  const kirim = (badan: Record<string, unknown>) =>
    request(baru).post("/buat").send(badan);

  it("biaya jasa tanpa jenis ditolak", async () => {
    const h = await kirim({ ...setoranLengkap, service: 50000 });
    expect(h.status).toBe(400);
    expect(h.text).toBe("validation.serviceType.required");
  });

  it("jenis tanpa biaya jasa ditolak", async () => {
    const h = await kirim({ ...setoranLengkap, service_type: "CNC" });
    expect(h.status).toBe(400);
    expect(h.text).toBe("validation.serviceType.notAllowed");
  });

  it("jenis di luar daftar ditolak", async () => {
    const h = await kirim({
      ...setoranLengkap,
      service: 50000,
      service_type: "LASER",
    });
    expect(h.status).toBe(400);
  });

  it("biaya jasa dengan jenis diterima", async () => {
    const h = await kirim({
      ...setoranLengkap,
      service: 50000,
      service_type: "SOLID",
    });
    expect(h.status).toBe(200);
  });

  /* Tanpa jasa sama sekali — bentuk yang dipakai hampir semua dokumen. */
  it("tanpa jasa dan tanpa jenis diterima", async () => {
    const h = await kirim(setoranLengkap);
    expect(h.status).toBe(200);
  });

  /* Teks kosong dari kendali pilihan yang tersentuh lalu dikosongkan lagi
     harus dibaca sebagai "tidak ada", bukan sebagai jenis tak dikenal. */
  it("jenis berupa teks kosong dianggap tidak ada", async () => {
    const h = await kirim({ ...setoranLengkap, service_type: "" });
    expect(h.status).toBe(200);
  });
});

describe("Biaya administrasi wajib disebut", () => {
  it("tanpa admin_fee ditolak", async () => {
    const badan: Record<string, unknown> = { ...setoranLengkap };
    delete badan['admin_fee'];
    const h = await request(baru).post("/buat").send(badan);
    expect(h.status).toBe(400);
    expect(h.text).toBe("validation.adminFee.required");
  });

  it("admin_fee negatif ditolak", async () => {
    const h = await request(baru)
      .post("/buat")
      .send({ ...setoranLengkap, admin_fee: -1 });
    expect(h.status).toBe(400);
  });

  it("admin_fee bernilai diterima", async () => {
    const h = await request(baru)
      .post("/buat")
      .send({ ...setoranLengkap, admin_fee: 15000 });
    expect(h.status).toBe(200);
  });
});
