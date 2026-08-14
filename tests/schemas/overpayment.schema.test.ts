import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import {
  getOverpaymentSchema,
  createOverpaymentSchema,
  refundReportSchema,
} from "../../src/schemas/overpayment.schema";

/**
 * Perbandingan perilaku untuk domain kelebihan bayar: express-validator lama
 * versus skema Zod baru.
 *
 * Tujuannya bukan membuktikan skema barunya "benar", melainkan membuktikan ia
 * berperilaku SAMA dengan yang digantikan. Frontend menampilkan badan balasan
 * galat apa adanya, jadi status maupun isinya harus identik — bukan setara.
 *
 * Rantai lama di bawah disalin verbatim dari overpayment.route.ts sebelum
 * migrasi, termasuk urutan pemasangannya, karena urutan itulah yang menentukan
 * pesan mana yang dibalas lebih dulu.
 *
 * Perbedaan yang memang disengaja diuji terpisah di bagian bawah, dan selalu
 * berpasangan: rantai lama membalas 200, skema baru membalas 400.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/return",
    body("date").notEmpty().withMessage(ErrorList["Date required"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/",
    body("date").notEmpty().withMessage(ErrorList["Date required"]),
    body("value").notEmpty().withMessage(ErrorList["Amount is required"]),
    body("value")
      .isFloat({
        min: 0.1,
      })
      .withMessage(ErrorList["Amount must be numeric"]),
    body("customer_id")
      .exists()
      .withMessage(ErrorList["Customer ID is required"]),
    body("payment_method_id")
      .exists()
      .withMessage(ErrorList["Payment method required"]),
    body("return_payment_date")
      .notEmpty()
      .withMessage(ErrorList["Return date is required"]),
    body("return_payment_method")
      .isIn(["Cash", "Bank transfer"])
      .withMessage(
        ErrorList["Return payment method must be either Cash or Transfer"]
      ),
    body("return_payment_name")
      .notEmpty()
      .withMessage(ErrorList["Return name is required"]),
    body("return_payment_bank")
      .exists()
      .withMessage(ErrorList["Return payment bank is required"]),
    body("return_payment_number")
      .exists()
      .withMessage(ErrorList["Return payment number is required"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/:id",
    param("id").notEmpty().withMessage(ErrorList["ID is required"]),
    param("id")
      .isInt({
        min: 0,
      })
      .withMessage(ErrorList["ID must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/return", validate(refundReportSchema), balas);
  app.post("/", validate(createOverpaymentSchema), balas);
  app.get("/:id", validate(getOverpaymentSchema, "params"), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function kirim(jalur: string, badan?: Record<string, unknown>) {
  const l = await request(lama)
    .post(jalur)
    .send(badan ?? {});
  const b = await request(baru)
    .post(jalur)
    .send(badan ?? {});
  return {
    lama: { status: l.status, teks: l.text },
    baru: { status: b.status, teks: b.text },
  };
}

async function ambil(jalur: string) {
  const l = await request(lama).get(jalur);
  const b = await request(baru).get(jalur);
  return {
    lama: { status: l.status, teks: l.text },
    baru: { status: b.status, teks: b.text },
  };
}

/**
 * Badan permintaan yang lolos seluruh rantai lama.
 *
 * `return_payment_bank` dan `return_payment_number` sengaja bernilai null:
 * rantai lama memakai exists() yang meloloskan null, kolomnya nullable di basis
 * data, dan itulah yang dikirim pemanggil saat pengembalian dilakukan tunai.
 * Kasus ini harus tetap 200 di kedua sisi.
 */
const badanValid = (ubah: Record<string, unknown> = {}) => ({
  date: "2026-01-01",
  value: 1500.5,
  customer_id: 1,
  payment_method_id: 2,
  return_payment_date: "2026-01-05",
  return_payment_method: "Cash",
  return_payment_name: "Budi",
  return_payment_bank: null,
  return_payment_number: null,
  ...ubah,
});

/** Membuang satu bidang, untuk menguji cabang "tidak dikirim sama sekali". */
const tanpa = (bidang: string) => {
  const badan: Record<string, unknown> = badanValid();
  delete badan[bidang];
  return badan;
};

describe("POST /return — perilaku harus identik", () => {
  it("menerima tanggal yang terisi", async () => {
    const h = await kirim("/return", { date: "2026-01-01" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak badan kosong", async () => {
    const h = await kirim("/return");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Date required"]);
  });

  it("menolak tanggal berupa teks kosong", async () => {
    const h = await kirim("/return", { date: "" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Date required"]);
  });

  it("menolak tanggal bernilai null", async () => {
    const h = await kirim("/return", { date: null });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Date required"]);
  });

  it("membiarkan bidang tambahan lewat tanpa dipermasalahkan", async () => {
    const h = await kirim("/return", { date: "2026-01-01", userId: 7 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });
});

describe("POST / — perilaku harus identik", () => {
  it("menerima badan lengkap", async () => {
    const h = await kirim("/", badanValid());
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menerima metode pengembalian Bank transfer", async () => {
    const h = await kirim(
      "/",
      badanValid({
        return_payment_method: "Bank transfer",
        return_payment_bank: "BCA",
        return_payment_number: "1234567890",
      })
    );
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menerima nominal pecahan", async () => {
    const h = await kirim("/", badanValid({ value: 0.1 }));
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  /*
    Urutan bidang: pada badan kosong, pesan pertama yang muncul harus pesan
    bidang PERTAMA pada rantai lama, bukan pesan bidang mana pun yang kebetulan
    diperiksa lebih dulu oleh Zod.
  */
  it("menolak badan kosong dengan pesan tanggal lebih dulu", async () => {
    const h = await kirim("/");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Date required"]);
  });

  const bidangWajib: Array<[string, string]> = [
    ["date", ErrorList["Date required"]],
    ["value", ErrorList["Amount is required"]],
    ["customer_id", ErrorList["Customer ID is required"]],
    ["payment_method_id", ErrorList["Payment method required"]],
    ["return_payment_date", ErrorList["Return date is required"]],
    [
      "return_payment_method",
      ErrorList["Return payment method must be either Cash or Transfer"],
    ],
    ["return_payment_name", ErrorList["Return name is required"]],
    ["return_payment_bank", ErrorList["Return payment bank is required"]],
    ["return_payment_number", ErrorList["Return payment number is required"]],
  ];

  for (const [bidang, pesan] of bidangWajib) {
    it(`menolak tanpa ${bidang} dengan pesannya sendiri`, async () => {
      const h = await kirim("/", tanpa(bidang));
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(pesan);
    });
  }

  /*
    exists() hanya gagal pada nilai yang tidak dikirim. null harus tetap lolos —
    empat kolom ini nullable, dan menolak null berarti mengubah bidang opsional
    menjadi wajib.
  */
  const bolehNull = [
    "customer_id",
    "payment_method_id",
    "return_payment_bank",
    "return_payment_number",
  ];

  for (const bidang of bolehNull) {
    it(`membiarkan ${bidang} bernilai null seperti sebelumnya`, async () => {
      const h = await kirim("/", badanValid({ [bidang]: null }));
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(200);
    });
  }

  it("menolak metode pengembalian di luar daftar", async () => {
    const h = await kirim(
      "/",
      badanValid({ return_payment_method: "Transfer" })
    );
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(
      ErrorList["Return payment method must be either Cash or Transfer"]
    );
  });

  it("menolak nama pengembalian berupa teks kosong", async () => {
    const h = await kirim("/", badanValid({ return_payment_name: "" }));
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Return name is required"]);
  });
});

/**
 * Bidang uang tidak boleh diperlonggar.
 *
 * Rantai lama memakai isFloat({ min: 0.1 }). Nilai negatif, nol, dan pecahan di
 * bawah batas harus tetap ditolak dengan pesan yang sama persis. Ini bagian
 * yang paling mudah longgar tanpa disadari saat menerjemahkan validator ke
 * skema, jadi tiap sisi batasnya diuji sendiri.
 */
describe("POST / — batas nominal dipertahankan", () => {
  const ditolak: Array<[string, unknown]> = [
    ["negatif", -5],
    ["negatif pecahan", -0.5],
    ["nol", 0],
    ["di bawah batas bawah", 0.05],
  ];

  for (const [nama, nilai] of ditolak) {
    it(`menolak nominal ${nama}`, async () => {
      const h = await kirim("/", badanValid({ value: nilai }));
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(ErrorList["Amount must be numeric"]);
    });
  }

  /*
    Dua pesan berbeda pada satu bidang: null dianggap "tidak dikirim" oleh
    express-validator karena bentuk teksnya kosong, sehingga notEmpty() yang
    gagal lebih dulu — bukan isFloat().
  */
  it("menolak nominal null dengan pesan 'wajib', bukan 'harus angka'", async () => {
    const h = await kirim("/", badanValid({ value: null }));
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Amount is required"]);
  });
});

describe("GET /:id — perilaku harus identik", () => {
  it("menerima id bulat", async () => {
    const h = await ambil("/5");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menerima id nol seperti sebelumnya", async () => {
    const h = await ambil("/0");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  const ditolak = ["/abc", "/-1", "/1.5", "/5a"];

  for (const jalur of ditolak) {
    it(`menolak ${jalur}`, async () => {
      const h = await ambil(jalur);
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(ErrorList["ID must be numeric"]);
    });
  }
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — kebijakan ketat pada req.body.
 *
 * Alasannya ditulis lengkap di src/schemas/common.schema.ts: express-validator
 * mengubah setiap nilai menjadi teks sebelum memeriksanya, sehingga "1500.5"
 * lolos isFloat dan angka 123 lolos notEmpty pada bidang teks. Skema Zod tidak
 * menirunya.
 *
 * Tiap kasus di sini menjalankan rantai LAMA juga, supaya yang tercatat bukan
 * hanya "sekarang ditolak" melainkan "dulu diterima, sekarang ditolak".
 */
describe("Kebijakan ketat: nilai yang dulu diterima kini ditolak", () => {
  const kasus: Array<[string, Record<string, unknown>, string]> = [
    [
      "nominal dikirim sebagai teks",
      { value: "1500.5" },
      ErrorList["Amount must be numeric"],
    ],
    [
      "tanggal dikirim sebagai angka epoch",
      { date: 1700000000000 },
      ErrorList["Date required"],
    ],
    [
      "tanggal dikirim sebagai objek",
      { date: { tahun: 2026 } },
      ErrorList["Date required"],
    ],
    [
      "tanggal pengembalian dikirim sebagai angka epoch",
      { return_payment_date: 1700000000000 },
      ErrorList["Return date is required"],
    ],
    [
      "nama pengembalian dikirim sebagai angka",
      { return_payment_name: 123 },
      ErrorList["Return name is required"],
    ],
    [
      "nama pengembalian dikirim sebagai objek",
      { return_payment_name: { nama: "Budi" } },
      ErrorList["Return name is required"],
    ],
    [
      "nama pengembalian dikirim sebagai boolean",
      { return_payment_name: true },
      ErrorList["Return name is required"],
    ],
  ];

  for (const [nama, ubah, pesan] of kasus) {
    it(`${nama}: dulu diterima, sekarang ditolak`, async () => {
      const h = await kirim("/", badanValid(ubah));
      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(pesan);
    });
  }

  /*
    notEmpty() hanya mengukur panjang teks, jadi teks berisi spasi saja lolos.
    requiredText memangkasnya lebih dulu. Perbedaan ini sudah berlaku di domain
    lain (lihat tests/auth.schema.test.ts) dan dipertahankan agar seragam.
  */
  it("tanggal berisi spasi saja: dulu diterima, sekarang ditolak", async () => {
    const h = await kirim("/return", { date: "   " });
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Date required"]);
  });

  it("nama pengembalian berisi spasi saja: dulu diterima, sekarang ditolak", async () => {
    const h = await kirim("/", badanValid({ return_payment_name: "   " }));
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Return name is required"]);
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — penulisan angka pada req.params.
 *
 * Arahnya berlawanan dengan kebijakan ketat di atas: di sini skema baru justru
 * lebih longgar. requiredIntFromText memakai Number(), sedangkan isInt() bekerja
 * pada bentuk teksnya dan hanya menerima deretan digit.
 *
 * Yang lolos tetap bilangan bulat >= 0 saat sampai ke controller, jadi tidak
 * ada nilai baru yang bisa mencapai basis data — yang berubah hanya penulisan
 * yang diampuni. Perlakuan ini sama dengan paramCustomerReceivableSchema di
 * receivable.schema.ts, supaya penulisan id tidak berbeda antar rute.
 */
describe("Perbedaan yang disengaja: penulisan id pada params", () => {
  const kasus: Array<[string, string]> = [
    ["notasi eksponen", "/1e2"],
    ["notasi heksadesimal", "/0x10"],
  ];

  for (const [nama, jalur] of kasus) {
    it(`${nama} (${jalur}): dulu ditolak, sekarang diterima`, async () => {
      const h = await ambil(jalur);
      expect(h.lama.status).toBe(400);
      expect(h.lama.teks).toBe(ErrorList["ID must be numeric"]);
      expect(h.baru.status).toBe(200);
    });
  }
});
