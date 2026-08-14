import express from "express";
import request from "supertest";
import { body } from "express-validator";
import ErrorHelper from "../src/utils/error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  buatDraftBillSchema,
  hapusDraftBillSchema,
  konfirmasiDraftBillSchema,
} from "../src/schemas/draft-bill.schema";

/**
 * Perbandingan perilaku: express-validator lama versus skema Zod baru.
 *
 * Tujuannya bukan membuktikan skema barunya "benar", melainkan membuktikan ia
 * berperilaku SAMA dengan yang digantikan. Frontend menampilkan badan balasan
 * galat apa adanya, jadi status maupun isinya harus identik — bukan setara.
 *
 * Perbedaan yang memang disengaja dikumpulkan di bagian bawah berkas, dan
 * masing-masing diuji BERPASANGAN: rantai lama membalas 200, skema baru
 * membalas 400. Tanpa pasangannya, yang tercatat hanya "sekarang ditolak" dan
 * bukan "dulu diterima, sekarang ditolak".
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin apa adanya dari draft-bill.route.ts sebelumnya. */
function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/confirm",
    body("payment_methods")
      .notEmpty()
      .withMessage(ErrorList["Payment method required"]),
    body("payment_methods")
      .isArray()
      .withMessage(ErrorList["Payment method required"]),
    body("service").notEmpty().withMessage(ErrorList["Service required"]),
    body("delivery").notEmpty().withMessage(ErrorList["Delivery required"]),
    body("discount").notEmpty().withMessage(ErrorList["Discount required"]),
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/delete",
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    ErrorHelper.intercept,
    balas
  );

  // Perhatikan: kalimat bahasa Inggris apa adanya, bukan key ErrorList —
  // persis seperti route aslinya.
  app.post(
    "/",
    body("customer_id").exists().withMessage("Please fill in customer ID"),
    body("note").exists().withMessage("Please fill in note"),
    body("items").exists().withMessage("Please fill in items"),
    body("service").exists().withMessage("Please fill in the service value"),
    body("delivery").exists().withMessage("Please fill in the delivery value"),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/confirm", validate(konfirmasiDraftBillSchema), balas);
  app.post("/delete", validate(hapusDraftBillSchema), balas);
  app.post("/", validate(buatDraftBillSchema), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function keduanya(jalur: string, badan?: Record<string, unknown>) {
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

/** Badan konfirmasi yang sah; tiap kasus menimpa satu bidang saja. */
const konfirmasiSah = {
  payment_methods: [{ payment_method_id: 1, amount: 1000 }],
  service: 0,
  delivery: 0,
  discount: 0,
  id: 5,
};

const konfirmasi = (ubahan: Record<string, unknown> = {}) => ({
  ...konfirmasiSah,
  ...ubahan,
});

/** Badan pembuatan yang sah. */
const buatSah = {
  customer_id: 1,
  note: "catatan",
  items: [{ item_id: 1, product_unit_id: 2 }],
  service: 0,
  delivery: 0,
};

const buat = (ubahan: Record<string, unknown> = {}) => ({
  ...buatSah,
  ...ubahan,
});

describe("POST /confirm — perilaku harus identik", () => {
  it("menerima badan yang lengkap", async () => {
    const h = await keduanya("/confirm", konfirmasiSah);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak badan kosong dengan pesan payment_methods lebih dulu", async () => {
    const h = await keduanya("/confirm");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Payment method required"]);
  });

  it("menolak payment_methods yang tidak dikirim", async () => {
    const { payment_methods: _abaikan, ...tanpa } = konfirmasiSah;
    const h = await keduanya("/confirm", tanpa);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Payment method required"]);
  });

  it("menolak payment_methods berupa teks", async () => {
    const h = await keduanya("/confirm", konfirmasi({ payment_methods: "1" }));
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Payment method required"]);
  });

  it("menolak payment_methods berupa objek", async () => {
    const h = await keduanya(
      "/confirm",
      konfirmasi({ payment_methods: { id: 1 } })
    );
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Payment method required"]);
  });

  it("menolak payment_methods dengan anggota kosong", async () => {
    // notEmpty() lama dijalankan per anggota array, jadi "" di dalam daftar
    // sudah ditolak sejak dulu. wajibAda pada anggota menirunya.
    const h = await keduanya("/confirm", konfirmasi({ payment_methods: [""] }));
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Payment method required"]);
  });

  it("menolak payment_methods dengan anggota null", async () => {
    const h = await keduanya(
      "/confirm",
      konfirmasi({ payment_methods: [null] })
    );
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
  });

  it("menerima payment_methods dengan anggota angka 0", async () => {
    // toString(0) menghasilkan "0" yang tidak kosong, jadi lolos notEmpty().
    const h = await keduanya("/confirm", konfirmasi({ payment_methods: [0] }));
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak service yang tidak dikirim", async () => {
    const { service: _abaikan, ...tanpa } = konfirmasiSah;
    const h = await keduanya("/confirm", tanpa);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Service required"]);
  });

  it("menolak service bernilai null", async () => {
    const h = await keduanya("/confirm", konfirmasi({ service: null }));
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Service required"]);
  });

  it("menolak service berupa teks kosong", async () => {
    const h = await keduanya("/confirm", konfirmasi({ service: "" }));
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Service required"]);
  });

  it("menolak delivery yang tidak dikirim", async () => {
    const { delivery: _abaikan, ...tanpa } = konfirmasiSah;
    const h = await keduanya("/confirm", tanpa);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Delivery required"]);
  });

  it("menolak discount yang tidak dikirim", async () => {
    const { discount: _abaikan, ...tanpa } = konfirmasiSah;
    const h = await keduanya("/confirm", tanpa);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Discount required"]);
  });

  it("menolak id yang tidak dikirim", async () => {
    const { id: _abaikan, ...tanpa } = konfirmasiSah;
    const h = await keduanya("/confirm", tanpa);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["ID is required"]);
  });

  it("menolak id bernilai null", async () => {
    const h = await keduanya("/confirm", konfirmasi({ id: null }));
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["ID is required"]);
  });

  it("menerima nominal berupa pecahan dan nilai negatif", async () => {
    // Rantai lama tidak membatasi nominal sama sekali; z.number() juga tidak.
    const h = await keduanya(
      "/confirm",
      konfirmasi({ service: 1500.5, delivery: -250, discount: 0.1 })
    );
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("membiarkan userId dan items dari luar skema lewat tanpa dipermasalahkan", async () => {
    const h = await keduanya(
      "/confirm",
      konfirmasi({ userId: 7, items: [{ item_id: 1 }] })
    );
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("memakai urutan pesan yang sama saat beberapa bidang gagal sekaligus", async () => {
    // Yang muncul harus pesan bidang PERTAMA pada rantai lama, bukan yang
    // terakhir: payment_methods, service, delivery, discount, lalu id.
    const h = await keduanya("/confirm", { service: null, id: null });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Payment method required"]);

    const h2 = await keduanya(
      "/confirm",
      konfirmasi({ delivery: null, discount: null, id: null })
    );
    expect(h2.baru).toEqual(h2.lama);
    expect(h2.baru.teks).toBe(ErrorList["Delivery required"]);
  });
});

describe("POST /delete — perilaku harus identik", () => {
  it("menerima id yang sah", async () => {
    const h = await keduanya("/delete", { id: 5 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak badan kosong", async () => {
    const h = await keduanya("/delete");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["ID is required"]);
  });

  it("menolak id bernilai null", async () => {
    const h = await keduanya("/delete", { id: null });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["ID is required"]);
  });

  it("menolak id berupa teks kosong", async () => {
    const h = await keduanya("/delete", { id: "" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["ID is required"]);
  });

  it("membiarkan userId dari authMiddleware lewat", async () => {
    const h = await keduanya("/delete", { id: 5, userId: 7 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });
});

describe("POST / — perilaku harus identik", () => {
  it("menerima badan yang lengkap", async () => {
    const h = await keduanya("/", buatSah);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak badan kosong dengan pesan customer_id lebih dulu", async () => {
    const h = await keduanya("/");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe("Please fill in customer ID");
  });

  const bidang: Array<[keyof typeof buatSah, string]> = [
    ["customer_id", "Please fill in customer ID"],
    ["note", "Please fill in note"],
    ["items", "Please fill in items"],
    ["service", "Please fill in the service value"],
    ["delivery", "Please fill in the delivery value"],
  ];

  for (const [nama, pesan] of bidang) {
    it(`menolak ${nama} yang tidak dikirim dengan kalimatnya sendiri`, async () => {
      const tanpa: Record<string, unknown> = { ...buatSah };
      delete tanpa[nama];
      const h = await keduanya("/", tanpa);
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(pesan);
    });
  }

  /**
   * exists() hanya memeriksa `nilai !== undefined`. Semua kasus di bawah ini
   * lolos dulu dan HARUS tetap lolos sekarang — harusAda meniru persis.
   */
  const lolos: Array<[string, Record<string, unknown>]> = [
    ["note bernilai null", buat({ note: null })],
    ["note berupa teks kosong", buat({ note: "" })],
    ["customer_id berupa teks angka", buat({ customer_id: "12" })],
    ["customer_id bernilai 0", buat({ customer_id: 0 })],
    ["items berupa array kosong", buat({ items: [] })],
    ["items berupa objek", buat({ items: { a: 1 } })],
    ["service berupa teks", buat({ service: "1500" })],
    ["delivery bernilai false", buat({ delivery: false })],
  ];

  for (const [nama, badan] of lolos) {
    it(`tetap menerima ${nama}`, async () => {
      const h = await keduanya("/", badan);
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(200);
    });
  }

  it("membiarkan otc dan userId yang tidak ada di skema lewat", async () => {
    const h = await keduanya("/", buat({ otc: "ABC123", userId: 7 }));
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });
});

/**
 * LUBANG ARRAY KOSONG PADA RANTAI LAMA.
 *
 * StandardValidation milik express-validator memperlakukan bidang berisi array
 * sebagai KUMPULAN nilai dan memeriksa tiap anggotanya. Array kosong berarti
 * nol anggota, sehingga perulangannya tidak berjalan sekali pun dan bidangnya
 * lolos tanpa diperiksa sama sekali.
 *
 * Ini lubang yang paling mudah dipicu tanpa sengaja oleh frontend yang
 * mengirim isi keranjang apa adanya.
 */
describe("Perbedaan disengaja: array kosong dulu lolos tanpa diperiksa", () => {
  const kasus: Array<[string, string, Record<string, unknown>, string]> = [
    [
      "payment_methods kosong pada /confirm",
      "/confirm",
      konfirmasi({ payment_methods: [] }),
      ErrorList["Payment method required"],
    ],
    [
      "id kosong pada /confirm",
      "/confirm",
      konfirmasi({ id: [] }),
      ErrorList["ID is required"],
    ],
    [
      "id kosong pada /delete",
      "/delete",
      { id: [] },
      ErrorList["ID is required"],
    ],
    [
      "service kosong pada /confirm",
      "/confirm",
      konfirmasi({ service: [] }),
      ErrorList["Service required"],
    ],
  ];

  for (const [nama, jalur, badan, pesan] of kasus) {
    it(`${nama}: dulu 200, sekarang 400`, async () => {
      const h = await keduanya(jalur, badan);
      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(pesan);
    });
  }

  it("array berisi satu anggota sah juga dulu lolos, sekarang ditolak", async () => {
    // Anggotanya bilangan bulat, jadi notEmpty() lama meloloskannya dan `id`
    // sampai ke Prisma sebagai array — berakhir 500, bukan 400.
    const h = await keduanya("/delete", { id: [5] });
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["ID is required"]);
  });

  it("array yang salah satu anggotanya kosong sudah ditolak sejak dulu", async () => {
    const h = await keduanya("/delete", { id: ["", 1] });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
  });
});

/**
 * KEBIJAKAN KETAT PADA req.body.
 *
 * notEmpty() milik express-validator bekerja pada bentuk TEKS nilainya,
 * sehingga "5" lolos persis seperti 5 dan {} lolos sebagai "[object Object]".
 * Skema Zod memakai z.number() yang menolak keduanya. Alasan lengkapnya ada di
 * src/schemas/common.schema.ts.
 */
describe("Perbedaan disengaja: angka sebagai teks dan nilai bertipe salah", () => {
  const kasus: Array<[string, string, Record<string, unknown>, string]> = [
    [
      "id berupa teks angka pada /delete",
      "/delete",
      { id: "5" },
      ErrorList["ID is required"],
    ],
    [
      "id berupa teks angka pada /confirm",
      "/confirm",
      konfirmasi({ id: "5" }),
      ErrorList["ID is required"],
    ],
    [
      "id berupa teks bukan angka",
      "/delete",
      { id: "abc" },
      ErrorList["ID is required"],
    ],
    [
      "id berupa objek",
      "/delete",
      { id: { a: 1 } },
      ErrorList["ID is required"],
    ],
    ["id berupa boolean", "/delete", { id: true }, ErrorList["ID is required"]],
    [
      "service berupa teks angka",
      "/confirm",
      konfirmasi({ service: "1500" }),
      ErrorList["Service required"],
    ],
    [
      "delivery berupa teks angka",
      "/confirm",
      konfirmasi({ delivery: "1500" }),
      ErrorList["Delivery required"],
    ],
    [
      "discount berupa objek",
      "/confirm",
      konfirmasi({ discount: { a: 1 } }),
      ErrorList["Discount required"],
    ],
  ];

  for (const [nama, jalur, badan, pesan] of kasus) {
    it(`${nama}: dulu 200, sekarang 400`, async () => {
      const h = await keduanya(jalur, badan);
      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(pesan);
    });
  }

  it("angka asli tetap diterima keduanya", async () => {
    const h = await keduanya("/delete", { id: 5 });
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(200);
  });
});

/**
 * Batas bawah dan keharusan bilangan bulat pada `id`.
 *
 * Rantai lama hanya memasang notEmpty(), yang tidak membatasi apa pun. Kolom id
 * memakai autoincrement mulai dari 1, jadi 0, -1, dan 3.5 tidak pernah cocok
 * dengan baris mana pun: deleteByID berakhir 500 dari Prisma, confirmByID
 * berakhir 404.
 */
describe("Perbedaan disengaja: batas bawah dan bilangan bulat pada id", () => {
  const kasus: Array<[string, unknown]> = [
    ["nol", 0],
    ["negatif", -1],
    ["pecahan", 3.5],
  ];

  for (const [nama, nilai] of kasus) {
    it(`id ${nama}: dulu 200, sekarang 400`, async () => {
      const h = await keduanya("/delete", { id: nilai });
      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(ErrorList["ID is required"]);
    });
  }
});
