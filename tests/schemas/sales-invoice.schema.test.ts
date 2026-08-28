import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import {
  invoiceArchiveSchema,
  createInvoiceSchemaWithRules,
  searchSalesReturnSchema,
  paramInvoiceSchema,
} from "../../src/schemas/sales-invoice.schema";

/**
 * Perbandingan perilaku: express-validator lama versus skema Zod baru.
 *
 * Dua kelompok perbedaan memang disengaja dan diuji terpisah di bagian bawah:
 * kebijakan ketat pada req.body, dan perbaikan pesan salah salin pada
 * `delivery` serta `service`.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin apa adanya dari sales-invoice.route.ts. */
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
    body("isPaid").exists().withMessage(ErrorList["Parameter error"]),
    body("isUnpaid").exists().withMessage(ErrorList["Parameter error"]),
    body("isActive").exists().withMessage(ErrorList["Parameter error"]),
    body("isDelete").exists().withMessage(ErrorList["Parameter error"]),
    body("isPaid").isBoolean().withMessage(ErrorList["Parameter error"]),
    body("isUnpaid").isBoolean().withMessage(ErrorList["Parameter error"]),
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
    "/buat",
    body("uuid").notEmpty().withMessage(ErrorList["Parameter error"]),
    body("customer_id")
      .exists()
      .withMessage(ErrorList["Customer ID is required"]),
    body("discount").notEmpty().withMessage(ErrorList["Discount required"]),
    body("discount")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Discount must be numeric"]),
    // Pesan di bawah memang tertulis "Discount" pada rantai aslinya.
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
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/faktur/:id",
    param("id").notEmpty().withMessage(ErrorList["ID is required"]),
    param("id").isInt({ min: 0 }).withMessage(ErrorList["ID must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/archives", validate(invoiceArchiveSchema), balas);
  app.post("/buat", validate(createInvoiceSchemaWithRules), balas);
  app.get("/faktur/:id", validate(paramInvoiceSchema, "params"), balas);
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
  page: 1,
  pageSize: 10,
  isPaid: true,
  isUnpaid: false,
  isActive: true,
  isDelete: false,
  sortBy: "date",
  sortDirection: "asc",
  startDate: "2026-05-01",
  endDate: "2026-05-31",
};

describe("POST /archives — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", arsipLengkap],
    ["badan kosong", {}],
    ["tanpa tahun", { ...arsipLengkap, year: undefined }],
    ["tahun sebelum 2000", { ...arsipLengkap, year: 1999 }],
    ["bulan 0", { ...arsipLengkap, month: 0 }],
    ["bulan 13", { ...arsipLengkap, month: 13 }],
    ["halaman 0", { ...arsipLengkap, page: 0 }],
    ["pageSize di bawah 10", { ...arsipLengkap, pageSize: 9 }],
    ["pageSize di atas 50", { ...arsipLengkap, pageSize: 51 }],
    ["tanpa isPaid", { ...arsipLengkap, isPaid: undefined }],
    ["tanpa sortBy", { ...arsipLengkap, sortBy: undefined }],
    ["sortDirection salah", { ...arsipLengkap, sortDirection: "naik" }],
    ["tanpa sortDirection", { ...arsipLengkap, sortDirection: undefined }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/archives", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("POST /sales-return — larik bersarang", () => {
  const sah = {
    date: "2026-05-01",
    sales_invoice: [{ product_id: 1, quantity: 2 }],
  };

  it("permintaan sah diterima", () => {
    expect(searchSalesReturnSchema.safeParse(sah).success).toBe(true);
  });

  it("larik kosong tetap lolos, sama seperti rantai lama", () => {
    const hasil = searchSalesReturnSchema.safeParse({
      date: "2026-05-01",
      sales_invoice: [],
    });
    expect(hasil.success).toBe(true);
  });

  it("product_id nol ditolak", () => {
    const hasil = searchSalesReturnSchema.safeParse({
      ...sah,
      sales_invoice: [{ product_id: 0, quantity: 2 }],
    });
    expect(hasil.success).toBe(false);
  });

  it("kuantitas di bawah 0.01 ditolak", () => {
    const hasil = searchSalesReturnSchema.safeParse({
      ...sah,
      sales_invoice: [{ product_id: 1, quantity: 0 }],
    });
    expect(hasil.success).toBe(false);
  });

  it("kuantitas pecahan diterima", () => {
    const hasil = searchSalesReturnSchema.safeParse({
      ...sah,
      sales_invoice: [{ product_id: 1, quantity: 1.5 }],
    });
    expect(hasil.success).toBe(true);
  });

  it("sales_invoice bukan larik ditolak", () => {
    const hasil = searchSalesReturnSchema.safeParse({
      date: "2026-05-01",
      sales_invoice: "bukan larik",
    });
    expect(hasil.success).toBe(false);
    expect(hasil.error?.issues[0].message).toBe(
      ErrorList["Sales invoice item must be an array"]
    );
  });
});

const fakturLengkap = {
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
};

describe("POST / — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", fakturLengkap],
    ["badan kosong", {}],
    ["tanpa uuid", { ...fakturLengkap, uuid: undefined }],
    ["tanpa customer_id", { ...fakturLengkap, customer_id: undefined }],
    ["diskon negatif", { ...fakturLengkap, discount: -1 }],
    ["nilai pecahan diterima", { ...fakturLengkap, delivery: 1500.5 }],
    ["is_paid bukan boolean", { ...fakturLengkap, is_paid: "ya" }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/buat", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Parameter :id — perilaku harus identik", () => {
  for (const jalur of [
    "/faktur/1",
    "/faktur/0",
    "/faktur/abc",
    "/faktur/-1",
    "/faktur/1.5",
  ]) {
    it(jalur, async () => {
      const h = await bandingGet(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — pesan salah salin.
 *
 * Rantai lama memakai ErrorList["Discount required"] untuk `delivery` dan
 * `service`, sehingga pengguna yang lupa mengisi ongkos kirim diberi tahu
 * bahwa diskonnya yang kosong. Setelah nilainya menjadi key i18n, frontend
 * bahkan tidak bisa lagi membedakan bidang mana yang bermasalah.
 */
describe("Perbedaan yang disengaja: pesan delivery dan service diperbaiki", () => {
  it("delivery kosong: lama menyebut diskon, baru menyebut pengiriman", async () => {
    const badan = { ...fakturLengkap, delivery: undefined };
    const l = await request(lama).post("/buat").send(badan);
    const b = await request(baru).post("/buat").send(badan);

    expect(l.status).toBe(400);
    expect(l.text).toBe(ErrorList["Discount required"]);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["Delivery required"]);
  });

  it("service kosong: lama menyebut diskon, baru menyebut layanan", async () => {
    const badan = { ...fakturLengkap, service: undefined };
    const l = await request(lama).post("/buat").send(badan);
    const b = await request(baru).post("/buat").send(badan);

    expect(l.status).toBe(400);
    expect(l.text).toBe(ErrorList["Discount required"]);
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["Service required"]);
  });

  it("delivery negatif memakai key numerik pengiriman", async () => {
    const b = await request(baru)
      .post("/buat")
      .send({ ...fakturLengkap, delivery: -1 });
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["Delivery must be numeric"]);
  });

  it("diskon tetap memakai key diskon", async () => {
    const b = await request(baru)
      .post("/buat")
      .send({ ...fakturLengkap, discount: undefined });
    expect(b.status).toBe(400);
    expect(b.text).toBe(ErrorList["Discount required"]);
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — kebijakan ketat pada req.body.
 * Penjelasan lengkapnya di src/schemas/common.schema.ts.
 */
describe("Perbedaan yang disengaja: angka berupa teks ditolak", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["tahun berupa teks", { ...arsipLengkap, year: "2026" }],
    ["halaman berupa teks", { ...arsipLengkap, page: "1" }],
    ["isPaid berupa teks", { ...arsipLengkap, isPaid: "true" }],
    /*
      Aturan BARU pada rentang tanggal: rantai lama tidak memeriksanya
      sama sekali dan controller meledak 500 lewat Invalid Date ke
      Prisma. Kini absen atau tak terbaca ditolak 400.
    */
    ["tanpa startDate", { ...arsipLengkap, startDate: undefined }],
    ["startDate tak terbaca", { ...arsipLengkap, startDate: "bukan-tanggal" }],
    ["tanpa endDate", { ...arsipLengkap, endDate: undefined }],
    ["endDate tak terbaca", { ...arsipLengkap, endDate: "31-31-2026x" }],
  ];

  for (const [nama, badan] of kasus) {
    it(`${nama}: dulu diterima, sekarang ditolak`, async () => {
      const l = await request(lama).post("/archives").send(badan);
      const b = await request(baru).post("/archives").send(badan);
      expect(l.status).toBe(200);
      expect(b.status).toBe(400);
    });
  }
});

/**
 * Aturan silang biaya jasa ↔ jenis jasa.
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA: rantai lama tidak mengenal jenis jasa,
 * sehingga tidak ada paritas yang bisa diuji — hanya perilaku barunya.
 *
 * Aturannya sendiri tinggal di common.schema.ts dan dipakai bersama setoran;
 * diuji di kedua tempat karena setoran yang dikonfirmasi berubah menjadi
 * faktur, dan aturan yang lebih longgar di salah satunya akan bocor ke
 * yang lain.
 */
describe("Biaya jasa dan jenisnya harus sejalan", () => {
  const kirim = (badan: Record<string, unknown>) =>
    request(baru).post("/buat").send(badan);

  it("biaya jasa tanpa jenis ditolak", async () => {
    const h = await kirim({ ...fakturLengkap, service: 50000 });
    expect(h.status).toBe(400);
    expect(h.text).toBe("validation.serviceType.required");
  });

  it("jenis tanpa biaya jasa ditolak", async () => {
    const h = await kirim({ ...fakturLengkap, service_type: "CNC" });
    expect(h.status).toBe(400);
    expect(h.text).toBe("validation.serviceType.notAllowed");
  });

  it("jenis di luar daftar ditolak", async () => {
    const h = await kirim({
      ...fakturLengkap,
      service: 50000,
      service_type: "LASER",
    });
    expect(h.status).toBe(400);
  });

  it("ketiga jenis yang sah diterima", async () => {
    for (const jenis of ["CNC", "FRAME", "SOLID"]) {
      const h = await kirim({
        ...fakturLengkap,
        service: 50000,
        service_type: jenis,
      });
      expect(h.status).toBe(200);
    }
  });

  it("tanpa jasa dan tanpa jenis diterima", async () => {
    const h = await kirim(fakturLengkap);
    expect(h.status).toBe(200);
  });

  /* Teks kosong dari kendali pilihan yang tersentuh lalu dikosongkan lagi
     harus dibaca sebagai "tidak ada", bukan sebagai jenis tak dikenal. */
  it("jenis berupa teks kosong dianggap tidak ada", async () => {
    const h = await kirim({ ...fakturLengkap, service_type: "" });
    expect(h.status).toBe(200);
  });
});

/**
 * Pengembalian diskon wajib menyebut metode pembayarannya.
 *
 * Bidangnya sudah lama ada di basis data dan tidak pernah terisi: frontend
 * mengirim metodenya sebagai teks `method` yang tidak dibaca siapa pun sambil
 * menulis `payment_method_id: null`. Uji ini mengunci agar bentuk itu ditolak.
 */
describe("Pengembalian diskon harus menyebut metodenya", () => {
  const kirim = (badan: Record<string, unknown>) =>
    request(baru).post("/buat").send(badan);

  it("pengembalian tanpa metode ditolak", async () => {
    const h = await kirim({
      ...fakturLengkap,
      rebate: { value: 50000, receiver_name: "Budi" },
    });
    expect(h.status).toBe(400);
    expect(h.text).toBe("validation.rebate.methodRequired");
  });

  it("metode null ditolak — bentuk persis yang dulu dikirim", async () => {
    const h = await kirim({
      ...fakturLengkap,
      rebate: {
        value: 50000,
        payment_method_id: null,
        method: "Cash",
        receiver_name: "Budi",
      },
    });
    expect(h.status).toBe(400);
  });

  it("pengembalian dengan metode diterima", async () => {
    const h = await kirim({
      ...fakturLengkap,
      rebate: { value: 50000, payment_method_id: 1, receiver_name: "Budi" },
    });
    expect(h.status).toBe(200);
  });

  /* Nol berarti tidak ada pengembalian; tidak ada yang perlu dijaga. */
  it("pengembalian bernilai nol tidak menuntut metode", async () => {
    const h = await kirim({ ...fakturLengkap, rebate: { value: 0 } });
    expect(h.status).toBe(200);
  });

  it("tanpa pengembalian sama sekali diterima", async () => {
    const h = await kirim(fakturLengkap);
    expect(h.status).toBe(200);
  });
});

describe("Biaya administrasi wajib disebut", () => {
  it("tanpa admin_fee ditolak", async () => {
    const badan: Record<string, unknown> = { ...fakturLengkap };
    delete badan['admin_fee'];
    const h = await request(baru).post("/buat").send(badan);
    expect(h.status).toBe(400);
    expect(h.text).toBe("validation.adminFee.required");
  });

  it("admin_fee negatif ditolak", async () => {
    const h = await request(baru)
      .post("/buat")
      .send({ ...fakturLengkap, admin_fee: -1 });
    expect(h.status).toBe(400);
  });

  it("admin_fee bernilai diterima", async () => {
    const h = await request(baru)
      .post("/buat")
      .send({ ...fakturLengkap, admin_fee: 15000 });
    expect(h.status).toBe(200);
  });
});
