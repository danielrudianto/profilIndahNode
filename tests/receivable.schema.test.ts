import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../src/utils/error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  createReceivablePaymentSchema,
  paramCustomerReceivableSchema,
} from "../src/schemas/receivable.schema";

/**
 * Perbandingan perilaku untuk domain piutang: express-validator lama versus
 * skema Zod baru.
 *
 * Rantai lama di bawah disalin verbatim dari receivable.route.ts sebelum
 * migrasi — termasuk urutan pemasangannya, karena urutan itulah yang
 * menentukan pesan mana yang dibalas lebih dulu.
 *
 * Satu perbedaan memang disengaja dan diuji terpisah di bagian bawah.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

function appLama() {
  const app = express();
  app.use(express.json());

  app.get(
    "/customer/:id",
    param("id").notEmpty().withMessage(ErrorList["Customer ID is required"]),
    param("id")
      .isInt({ min: 0 })
      .withMessage(ErrorList["CUstomer ID must be integer"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/payment",
    body("date").notEmpty().withMessage(ErrorList["Date required"]),
    body("amount").notEmpty().withMessage(ErrorList["Amount is required"]),
    body("amount")
      .isFloat({
        min: 0,
      })
      .withMessage(ErrorList["Amount must be numeric"]),
    body("full_payment")
      .isBoolean()
      .withMessage(ErrorList["Payment status required"]),
    body("payment_method_id")
      .exists()
      .withMessage(ErrorList["Payment method required"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());

  app.get(
    "/customer/:id",
    validate(paramCustomerReceivableSchema, "params"),
    balas
  );
  app.post("/payment", validate(createReceivablePaymentSchema), balas);

  return app;
}

const lama = appLama();
const baru = appBaru();

async function kirim(
  metode: "get" | "post",
  jalur: string,
  badan?: Record<string, unknown>
) {
  const l =
    metode === "get"
      ? await request(lama).get(jalur)
      : await request(lama)
          .post(jalur)
          .send(badan ?? {});
  const b =
    metode === "get"
      ? await request(baru).get(jalur)
      : await request(baru)
          .post(jalur)
          .send(badan ?? {});

  return {
    lama: { status: l.status, teks: l.text },
    baru: { status: b.status, teks: b.text },
  };
}

/** Badan permintaan lengkap; tiap tes hanya mengganti bagian yang diuji. */
const pembayaranLengkap = {
  date: "2024-05-01",
  amount: 15000,
  full_payment: false,
  payment_method_id: 3,
  sales_invoice_id: 12,
};

describe("GET /customer/:id — perilaku harus identik", () => {
  it("menerima id bilangan bulat", async () => {
    const h = await kirim("get", "/customer/5");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menerima id 0, yang controller artikan sebagai semua pelanggan", async () => {
    const h = await kirim("get", "/customer/0");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak id bukan angka", async () => {
    const h = await kirim("get", "/customer/abc");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["CUstomer ID must be integer"]);
  });

  it("menolak id pecahan", async () => {
    const h = await kirim("get", "/customer/1.5");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["CUstomer ID must be integer"]);
  });

  it("menolak id negatif", async () => {
    const h = await kirim("get", "/customer/-3");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["CUstomer ID must be integer"]);
  });
});

describe("POST /payment — perilaku harus identik", () => {
  it("menerima badan lengkap", async () => {
    const h = await kirim("post", "/payment", pembayaranLengkap);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak badan kosong dengan pesan tanggal lebih dulu", async () => {
    const h = await kirim("post", "/payment");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Date required"]);
  });

  it("menolak tanggal kosong", async () => {
    const h = await kirim("post", "/payment", {
      ...pembayaranLengkap,
      date: "",
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Date required"]);
  });

  it("menolak tanggal null", async () => {
    const h = await kirim("post", "/payment", {
      ...pembayaranLengkap,
      date: null,
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Date required"]);
  });

  it("menerima tanggal berupa angka — rantai lama tidak memeriksa tipenya", async () => {
    const h = await kirim("post", "/payment", {
      ...pembayaranLengkap,
      date: 20240501,
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak nominal yang tidak dikirim", async () => {
    const { amount, ...tanpaAmount } = pembayaranLengkap;
    const h = await kirim("post", "/payment", tanpaAmount);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Amount is required"]);
  });

  it("menolak nominal bukan angka", async () => {
    const h = await kirim("post", "/payment", {
      ...pembayaranLengkap,
      amount: "abc",
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Amount must be numeric"]);
  });

  it("menolak nominal negatif", async () => {
    const h = await kirim("post", "/payment", {
      ...pembayaranLengkap,
      amount: -1,
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Amount must be numeric"]);
  });

  it("menolak nominal berupa boolean", async () => {
    const h = await kirim("post", "/payment", {
      ...pembayaranLengkap,
      amount: true,
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Amount must be numeric"]);
  });

  it("menerima nominal 0", async () => {
    const h = await kirim("post", "/payment", {
      ...pembayaranLengkap,
      amount: 0,
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menerima nominal pecahan dan bentuk teksnya", async () => {
    for (const amount of [1500.75, "1500.75", ".5", "+3", "1e5"]) {
      const h = await kirim("post", "/payment", {
        ...pembayaranLengkap,
        amount,
      });
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(200);
    }
  });

  it("menolak nominal berspasi dan bernotasi tidak lazim", async () => {
    for (const amount of [" 5 ", "0x10", "5,5", "1.2.3"]) {
      const h = await kirim("post", "/payment", {
        ...pembayaranLengkap,
        amount,
      });
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.teks).toBe(ErrorList["Amount must be numeric"]);
    }
  });

  it("menolak status pembayaran yang tidak dikirim", async () => {
    const { full_payment, ...tanpaStatus } = pembayaranLengkap;
    const h = await kirim("post", "/payment", tanpaStatus);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Payment status required"]);
  });

  it("menerima status pembayaran dalam bentuk yang dikenali isBoolean", async () => {
    for (const full_payment of [true, false, "true", "false", 0, 1, "0", "1"]) {
      const h = await kirim("post", "/payment", {
        ...pembayaranLengkap,
        full_payment,
      });
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(200);
    }
  });

  it("menolak status pembayaran di luar bentuk yang dikenali", async () => {
    for (const full_payment of ["yes", "TRUE", "on", 2, null, ""]) {
      const h = await kirim("post", "/payment", {
        ...pembayaranLengkap,
        full_payment,
      });
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.teks).toBe(ErrorList["Payment status required"]);
    }
  });

  it("menolak metode pembayaran yang tidak dikirim", async () => {
    const { payment_method_id, ...tanpaMetode } = pembayaranLengkap;
    const h = await kirim("post", "/payment", tanpaMetode);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Payment method required"]);
  });

  it("menerima metode pembayaran null — exists() hanya menuntut bidangnya ada", async () => {
    const h = await kirim("post", "/payment", {
      ...pembayaranLengkap,
      payment_method_id: null,
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("mempertahankan urutan pesan ketika beberapa bidang salah sekaligus", async () => {
    const h = await kirim("post", "/payment", {
      amount: "abc",
      full_payment: "mungkin",
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Date required"]);
  });

  it("mendahulukan pesan nominal kosong daripada nominal salah bentuk", async () => {
    const h = await kirim("post", "/payment", {
      date: "2024-05-01",
      amount: "",
      full_payment: "mungkin",
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Amount is required"]);
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA.
 *
 * Parameter `:id` kini diubah ke angka dengan Number(), sedangkan isInt()
 * memeriksa bentuk teksnya. Penulisan seperti "1e2", "0x10", angka yang
 * diapit spasi, dan segmen yang hanya berisi spasi dulu ditolak, sekarang
 * diterima dan sampai ke controller sebagai bilangan bulat >= 0 yang sah.
 *
 * Statusnya berubah dari 400 menjadi 200; tidak ada nilai baru yang bisa
 * lolos ke basis data karena hasil akhirnya tetap bilangan bulat. Segmen
 * berisi spasi menjadi 0, dan 0 adalah nilai yang memang sudah diterima
 * rantai lama lewat `/customer/0`: controller mengartikannya sebagai seluruh
 * pelanggan.
 */
describe("Perbedaan yang disengaja: penulisan id yang diampuni Number()", () => {
  const penulisan = ["1e2", "0x10", "%205%20", "%20%20"];

  it("lama menolak notasi eksponen, heksadesimal, dan segmen berspasi", async () => {
    for (const id of penulisan) {
      const res = await request(lama).get(`/customer/${id}`);
      expect(res.status).toBe(400);
      expect(res.text).toBe(ErrorList["CUstomer ID must be integer"]);
    }
  });

  it("baru menerimanya sebagai bilangan bulat", async () => {
    for (const id of penulisan) {
      const res = await request(baru).get(`/customer/${id}`);
      expect(res.status).toBe(200);
    }
  });
});
