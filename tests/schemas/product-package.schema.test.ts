import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import {
  createPackageSchema,
  paramPackageSchema,
  updatePackagePriceSchema,
  updatePackageSchema,
} from "../../src/schemas/product-package.schema";

/**
 * Perbandingan perilaku untuk paket produk: rantai express-validator lama
 * versus skema Zod baru.
 *
 * Tujuannya bukan membuktikan skema barunya "benar", melainkan membuktikan ia
 * berperilaku SAMA dengan yang digantikan. Frontend menampilkan badan balasan
 * galat apa adanya, jadi status maupun isinya harus identik — bukan setara.
 *
 * Dua kelompok perbedaan memang disengaja dan diuji terpisah di bagian bawah:
 * kebijakan ketat pada req.body, dan penolakan package_content yang bukan
 * larik. Keduanya diuji BERPASANGAN — tiap kasus menjalankan rantai lama juga,
 * supaya yang tercatat bukan "sekarang ditolak" melainkan "dulu 200, sekarang
 * 400" beserta buktinya.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin apa adanya dari product-package.route.ts. */
function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/",
    body("price").notEmpty().withMessage(ErrorList["Price is required"]),
    body("name").notEmpty().withMessage(ErrorList["Package name required"]),
    body("description")
      .notEmpty()
      .withMessage(ErrorList["Package description required"]),
    body("package_content")
      .notEmpty()
      .withMessage(ErrorList["Package items required"]),
    body("package_content.*.product_id")
      .notEmpty()
      .withMessage(ErrorList["Package item id required"]),
    body("package_content.*.quantity")
      .notEmpty()
      .withMessage(ErrorList["Package item quantity required"]),
    body("package_content.*.product_unit_id")
      .exists()
      .withMessage(ErrorList["Package item unit id required"]),
    body("package_content.*.price")
      .notEmpty()
      .withMessage(ErrorList["Package item price required"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/",
    body("id").isNumeric().withMessage(ErrorList["Parameter error"]),
    body("price").notEmpty().withMessage(ErrorList["Price is required"]),
    body("name").notEmpty().withMessage(ErrorList["Package name required"]),
    body("description")
      .notEmpty()
      .withMessage(ErrorList["Package description required"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/price-sales",
    body("items").isArray().withMessage(ErrorList["Parameter error"]),
    body("items.*.package_code_id")
      .notEmpty()
      .withMessage(ErrorList["Package ID is required"]),
    body("items.*.price")
      .notEmpty()
      .withMessage(ErrorList["Price is required"]),
    body("items.*.price")
      .isFloat({ min: 0 })
      .withMessage(ErrorList["Price must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/:id",
    param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  app.delete(
    "/:id",
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
  app.post("/", validate(createPackageSchema), balas);
  app.put("/", validate(updatePackageSchema), balas);
  app.put("/price-sales", validate(updatePackagePriceSchema), balas);
  app.get("/:id", validate(paramPackageSchema, "params"), balas);
  app.delete("/:id", validate(paramPackageSchema, "params"), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function banding(
  metode: "post" | "put" | "get" | "delete",
  jalur: string,
  badan?: unknown
) {
  const kirim = (app: express.Express) => {
    const r = (request(app) as any)[metode](jalur);
    return badan === undefined ? r : r.send(badan);
  };
  const [a, b] = await Promise.all([kirim(lama), kirim(baru)]);
  return {
    lama: { status: a.status, teks: a.text },
    baru: { status: b.status, teks: b.text },
  };
}

/** Satu baris isi paket yang sah, dipakai sebagai titik awal tiap kasus. */
const isi = { product_id: 1, quantity: 2, product_unit_id: 3, price: 100 };

const paketLengkap = {
  price: 25000,
  name: "Paket Hemat",
  description: "Berisi pipa dan sambungan",
  package_content: [isi],
};

/* ================================================================== */
/* POST /product-package                                               */
/* ================================================================== */

describe("POST / — perilaku harus identik", () => {
  const kasus: Array<[string, unknown]> = [
    ["lengkap", paketLengkap],
    ["badan kosong", {}],
    ["tanpa price", { ...paketLengkap, price: undefined }],
    ["price null", { ...paketLengkap, price: null }],
    ["price nol tetap diterima", { ...paketLengkap, price: 0 }],
    ["price negatif tetap diterima", { ...paketLengkap, price: -1 }],
    ["tanpa name", { ...paketLengkap, name: undefined }],
    ["name kosong", { ...paketLengkap, name: "" }],
    ["tanpa description", { ...paketLengkap, description: undefined }],
    ["description kosong", { ...paketLengkap, description: "" }],
    ["tanpa package_content", { ...paketLengkap, package_content: undefined }],
    ["package_content null", { ...paketLengkap, package_content: null }],
    // Larik kosong: rantai lama tidak memeriksa isinya sama sekali karena pola
    // joker tidak cocok dengan anggota mana pun. Skema baru pun meloloskannya —
    // z.array() menerima larik nol anggota. Kasus ini yang paling mudah
    // salah diterjemahkan menjadi "wajib berisi".
    ["package_content larik kosong", { ...paketLengkap, package_content: [] }],
    [
      "item tanpa product_id",
      {
        ...paketLengkap,
        package_content: [{ quantity: 2, product_unit_id: 3, price: 100 }],
      },
    ],
    [
      "item product_id nol tetap diterima",
      { ...paketLengkap, package_content: [{ ...isi, product_id: 0 }] },
    ],
    [
      "item tanpa quantity",
      {
        ...paketLengkap,
        package_content: [{ product_id: 1, product_unit_id: 3, price: 100 }],
      },
    ],
    [
      "item quantity nol tetap diterima",
      { ...paketLengkap, package_content: [{ ...isi, quantity: 0 }] },
    ],
    [
      "item quantity pecahan tetap diterima",
      { ...paketLengkap, package_content: [{ ...isi, quantity: 1.5 }] },
    ],
    // exists() hanya menolak undefined; kolom product_unit_id memang nullable.
    [
      "item product_unit_id null tetap diterima",
      { ...paketLengkap, package_content: [{ ...isi, product_unit_id: null }] },
    ],
    [
      "item tanpa product_unit_id",
      {
        ...paketLengkap,
        package_content: [{ product_id: 1, quantity: 2, price: 100 }],
      },
    ],
    [
      "item tanpa price",
      {
        ...paketLengkap,
        package_content: [{ product_id: 1, quantity: 2, product_unit_id: 3 }],
      },
    ],
    [
      "item price null",
      { ...paketLengkap, package_content: [{ ...isi, price: null }] },
    ],
    [
      "item price nol tetap diterima",
      { ...paketLengkap, package_content: [{ ...isi, price: 0 }] },
    ],
    [
      "item price negatif tetap diterima",
      { ...paketLengkap, package_content: [{ ...isi, price: -5 }] },
    ],
    [
      "bidang tambahan di dalam item diabaikan",
      { ...paketLengkap, package_content: [{ ...isi, catatan: "x" }] },
    ],
    ["bidang tambahan di badan diabaikan", { ...paketLengkap, userId: 7 }],
    [
      "dua item sah",
      { ...paketLengkap, package_content: [isi, { ...isi, product_id: 2 }] },
    ],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await banding("post", "/", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  it("pesan pertama mengikuti urutan bidang: price sebelum name", async () => {
    const h = await banding("post", "/", { name: "", price: "" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Price is required"]);
  });

  it("pesan item mengikuti urutan bidang: product_id sebelum quantity", async () => {
    const h = await banding("post", "/", {
      ...paketLengkap,
      package_content: [{ product_unit_id: 1, price: 1 }],
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Package item id required"]);
  });
});

/* ================================================================== */
/* PUT /product-package                                                */
/* ================================================================== */

describe("PUT / — perilaku harus identik", () => {
  const lengkap = {
    id: 3,
    price: 25000,
    name: "Paket Hemat",
    description: "Berisi pipa dan sambungan",
  };

  const kasus: Array<[string, unknown]> = [
    ["lengkap", lengkap],
    ["badan kosong", {}],
    ["tanpa id", { ...lengkap, id: undefined }],
    ["id bukan angka", { ...lengkap, id: "abc" }],
    // isNumeric() tanpa isInt(): pecahan, nol, dan negatif selama ini lolos.
    ["id pecahan tetap diterima", { ...lengkap, id: 1.5 }],
    ["id nol tetap diterima", { ...lengkap, id: 0 }],
    ["id negatif tetap diterima", { ...lengkap, id: -3 }],
    ["tanpa price", { ...lengkap, price: undefined }],
    ["name kosong", { ...lengkap, name: "" }],
    ["tanpa description", { ...lengkap, description: undefined }],
    // package_content tidak divalidasi pada PUT — controller memang tidak
    // menyentuhnya saat mengubah paket.
    ["package_content diabaikan", { ...lengkap, package_content: "apa saja" }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await banding("put", "/", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  it("pesan pertama pada badan kosong tetap dari id", async () => {
    const h = await banding("put", "/", {});
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Parameter error"]);
  });
});

/* ================================================================== */
/* PUT /product-package/price-sales                                    */
/* ================================================================== */

describe("PUT /price-sales — perilaku harus identik", () => {
  const baris = { package_code_id: 1, price: 1000 };

  const kasus: Array<[string, unknown]> = [
    ["lengkap", { items: [baris] }],
    ["tanpa items", {}],
    ["items null", { items: null }],
    ["items berupa teks", { items: "bukan larik" }],
    ["items berupa objek", { items: { a: 1 } }],
    // Nol anggota: pola joker tidak cocok apa pun pada rantai lama, dan
    // controller aman karena `for (let item of [])` tidak berputar.
    ["items larik kosong", { items: [] }],
    ["tanpa package_code_id", { items: [{ price: 1000 }] }],
    ["package_code_id null", { items: [{ ...baris, package_code_id: null }] }],
    [
      "package_code_id nol tetap diterima",
      { items: [{ ...baris, package_code_id: 0 }] },
    ],
    ["tanpa price", { items: [{ package_code_id: 1 }] }],
    ["price null", { items: [{ ...baris, price: null }] }],
    ["price nol tetap diterima", { items: [{ ...baris, price: 0 }] }],
    ["price pecahan tetap diterima", { items: [{ ...baris, price: 1.5 }] }],
    // isFloat({ min: 0 }): harga negatif sudah ditolak sejak dulu.
    ["price negatif ditolak", { items: [{ ...baris, price: -1 }] }],
    ["price boolean ditolak", { items: [{ ...baris, price: true }] }],
    ["dua baris sah", { items: [baris, { package_code_id: 2, price: 50 }] }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await banding("put", "/price-sales", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  it("pesan baris mengikuti urutan bidang: package_code_id sebelum price", async () => {
    const h = await banding("put", "/price-sales", { items: [{}] });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Package ID is required"]);
  });

  it("membedakan harga tidak dikirim dari harga salah bentuk", async () => {
    const kosong = await banding("put", "/price-sales", {
      items: [{ package_code_id: 1 }],
    });
    const salah = await banding("put", "/price-sales", {
      items: [{ package_code_id: 1, price: -1 }],
    });
    expect(kosong.baru).toEqual(kosong.lama);
    expect(salah.baru).toEqual(salah.lama);
    expect(kosong.baru.teks).toBe(ErrorList["Price is required"]);
    expect(salah.baru.teks).toBe(ErrorList["Price must be numeric"]);
  });
});

/* ================================================================== */
/* GET dan DELETE /product-package/:id                                 */
/* ================================================================== */

describe("Parameter jalur :id — perilaku harus identik", () => {
  const jalur = ["/1", "/0", "/-1", "/abc", "/1.5", "/999999", "/%20"];

  for (const j of jalur) {
    it(`GET ${j}`, async () => {
      const h = await banding("get", j);
      expect(h.baru).toEqual(h.lama);
    });

    it(`DELETE ${j}`, async () => {
      const h = await banding("delete", j);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/* ================================================================== */
/* Kebijakan ketat pada req.body — perbedaan yang disengaja            */
/* ================================================================== */

/**
 * Tiap kasus di bawah menjalankan rantai LAMA juga. Yang dikunci bukan
 * "sekarang ditolak", melainkan "dulu 200, sekarang 400" — beserta bukti bahwa
 * selisihnya memang ada. Tanpa pasangan itu, tes hanya akan mencatat perilaku
 * baru tanpa menunjukkan bahwa ada yang berubah.
 */
function pasangan(
  judul: string,
  metode: "post" | "put",
  jalur: string,
  badan: unknown,
  pesan: string
) {
  it(`${judul}: dulu 200, sekarang 400`, async () => {
    const h = await banding(metode, jalur, badan);
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(pesan);
  });
}

describe("Kebijakan ketat: angka berbentuk teks ditolak pada req.body", () => {
  pasangan(
    "price paket berupa teks",
    "post",
    "/",
    { ...paketLengkap, price: "25000" },
    ErrorList["Price is required"]
  );

  pasangan(
    "product_id item berupa teks",
    "post",
    "/",
    { ...paketLengkap, package_content: [{ ...isi, product_id: "1" }] },
    ErrorList["Package item id required"]
  );

  pasangan(
    "quantity item berupa teks",
    "post",
    "/",
    { ...paketLengkap, package_content: [{ ...isi, quantity: "2" }] },
    ErrorList["Package item quantity required"]
  );

  pasangan(
    "product_unit_id item berupa teks",
    "post",
    "/",
    { ...paketLengkap, package_content: [{ ...isi, product_unit_id: "3" }] },
    ErrorList["Package item unit id required"]
  );

  pasangan(
    "price item berupa teks",
    "post",
    "/",
    { ...paketLengkap, package_content: [{ ...isi, price: "100" }] },
    ErrorList["Package item price required"]
  );

  pasangan(
    "id pada PUT berupa teks",
    "put",
    "/",
    { id: "3", price: 1, name: "a", description: "b" },
    ErrorList["Parameter error"]
  );

  pasangan(
    "id pada PUT berupa larik kosong",
    "put",
    "/",
    { id: [], price: 1, name: "a", description: "b" },
    ErrorList["Parameter error"]
  );

  pasangan(
    "package_code_id berupa teks",
    "put",
    "/price-sales",
    { items: [{ package_code_id: "1", price: 10 }] },
    ErrorList["Package ID is required"]
  );

  pasangan(
    "package_code_id berupa objek",
    "put",
    "/price-sales",
    { items: [{ package_code_id: { a: 1 }, price: 10 }] },
    ErrorList["Package ID is required"]
  );

  pasangan(
    "price baris berupa teks",
    "put",
    "/price-sales",
    { items: [{ package_code_id: 1, price: "10" }] },
    ErrorList["Price must be numeric"]
  );

  it("angka asli tetap diterima kedua sisi", async () => {
    const h = await banding("post", "/", paketLengkap);
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(200);
  });
});

describe("Kebijakan ketat: nilai bukan teks ditolak pada bidang teks", () => {
  pasangan(
    "name berupa angka",
    "post",
    "/",
    { ...paketLengkap, name: 123 },
    ErrorList["Package name required"]
  );

  pasangan(
    "name berupa objek",
    "post",
    "/",
    { ...paketLengkap, name: { nama: "Paket" } },
    ErrorList["Package name required"]
  );

  pasangan(
    "name berupa boolean",
    "post",
    "/",
    { ...paketLengkap, name: true },
    ErrorList["Package name required"]
  );

  pasangan(
    "description berupa angka",
    "post",
    "/",
    { ...paketLengkap, description: 42 },
    ErrorList["Package description required"]
  );

  // requiredText menolak teks yang hanya berisi spasi; notEmpty() menghitung spasi
  // sebagai isi, sehingga nama "   " selama ini tersimpan apa adanya.
  pasangan(
    "name hanya berisi spasi",
    "post",
    "/",
    { ...paketLengkap, name: "   " },
    ErrorList["Package name required"]
  );

  pasangan(
    "name pada PUT berupa angka",
    "put",
    "/",
    { id: 1, price: 1, name: 123, description: "b" },
    ErrorList["Package name required"]
  );
});

/**
 * Lubang paling halus pada rantai lama: bidang yang BERISI larik diperlakukan
 * sebagai kumpulan nilai, bukan sebagai satu nilai. `{"price": []}` karena itu
 * tidak diperiksa sama sekali dan lolos dengan harga berupa larik kosong, lalu
 * sampai ke Prisma sebagai nilai yang bukan Decimal. Frontend paling mudah
 * memicunya dengan mengirim isi kontrol formulir apa adanya.
 */
describe("Kebijakan ketat: bidang berisi larik ditolak", () => {
  pasangan(
    "price paket berupa larik kosong",
    "post",
    "/",
    { ...paketLengkap, price: [] },
    ErrorList["Price is required"]
  );

  pasangan(
    "price paket berupa larik berisi",
    "post",
    "/",
    { ...paketLengkap, price: [25000] },
    ErrorList["Price is required"]
  );

  pasangan(
    "price item berupa larik kosong",
    "post",
    "/",
    { ...paketLengkap, package_content: [{ ...isi, price: [] }] },
    ErrorList["Package item price required"]
  );

  pasangan(
    "price baris berupa larik kosong",
    "put",
    "/price-sales",
    { items: [{ package_code_id: 1, price: [] }] },
    ErrorList["Price must be numeric"]
  );

  pasangan(
    "package_code_id berupa larik berisi",
    "put",
    "/price-sales",
    { items: [{ package_code_id: [1], price: 10 }] },
    ErrorList["Package ID is required"]
  );
});

/* ================================================================== */
/* package_content bukan larik — perbedaan yang disengaja              */
/* ================================================================== */

/**
 * Rantai lama memperlakukan bidang berisi larik sebagai KUMPULAN nilai. Nilai
 * yang bukan larik karenanya tidak pernah cocok dengan pola joker dan lolos
 * tanpa diperiksa — lalu jatuh di controller pada `package_content.map(...)`
 * sebagai 500. Yang berubah di sini adalah 500 menjadi 400, bukan permintaan
 * sah yang mendadak ditolak.
 */
describe("package_content yang bukan larik sekarang ditolak", () => {
  for (const [nama, nilai] of [
    ["objek kosong", {}],
    ["objek berisi", { a: 1 }],
    ["teks", "abc"],
    ["angka", 5],
    ["boolean", true],
  ] as Array<[string, unknown]>) {
    it(`${nama}`, async () => {
      const h = await banding("post", "/", {
        ...paketLengkap,
        package_content: nilai,
      });
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(ErrorList["Package items required"]);
      // Hanya { a: 1 } yang kebetulan tertangkap rantai lama, karena kunci "a"
      // ikut diperiksa sebagai anggota kumpulan.
      expect(h.lama.status).toBe(nama === "objek berisi" ? 400 : 200);
    });
  }
});

/* ================================================================== */
/* Batas panjang teks — aturan baru dari lebar kolom                   */
/* ================================================================== */

describe("Batas panjang mengikuti lebar kolom package_code", () => {
  it("name 46 karakter ditolak — kolom VarChar(45)", async () => {
    const h = await banding("post", "/", {
      ...paketLengkap,
      name: "a".repeat(46),
    });
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Package name too long"]);
  });

  it("name 45 karakter diterima", async () => {
    const h = await banding("post", "/", {
      ...paketLengkap,
      name: "a".repeat(45),
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("description 201 karakter ditolak — kolom VarChar(200)", async () => {
    const h = await banding("post", "/", {
      ...paketLengkap,
      description: "a".repeat(201),
    });
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Package description too long"]);
  });

  it("batas yang sama berlaku lewat PUT", async () => {
    const h = await banding("put", "/", {
      id: 1,
      price: 1,
      name: "a".repeat(46),
      description: "b",
    });
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
  });
});

/* ================================================================== */
/* Sisa perbedaan yang diketahui                                       */
/* ================================================================== */

/**
 * Dua perbedaan di bawah TIDAK diperbaiki, dan dicatat di sini supaya tidak
 * ditemukan lagi sebagai kejutan.
 */
describe("Sisa perbedaan yang diketahui", () => {
  /**
   * Rantai lama memeriksa tiap bidang secara berurutan LINTAS anggota larik:
   * seluruh package_code_id dulu, baru seluruh price. Zod sebaliknya memeriksa
   * anggota satu per satu, seluruh bidang anggota pertama dulu.
   *
   * Bedanya baru terlihat bila DUA anggota rusak pada bidang yang berbeda —
   * pada satu anggota, urutan kunci di dalam z.object() sudah membuat pesannya
   * sama. Statusnya tetap 400 dan kedua pesan sama-sama menunjuk kesalahan yang
   * betul-betul ada; hanya urutan kemunculannya yang berbeda.
   *
   * Menyamakannya berarti meninggalkan bentuk z.array(z.object({...})) dan
   * menulis pemeriksaan manual per bidang — harga yang tidak sepadan untuk
   * kasus "dua baris rusak sekaligus".
   */
  it("urutan pesan berbeda bila dua baris rusak pada bidang berbeda", async () => {
    const h = await banding("put", "/price-sales", {
      items: [{ package_code_id: 1, price: -5 }, { price: 10 }],
    });

    expect(h.lama.status).toBe(400);
    expect(h.baru.status).toBe(400);
    // Lama: seluruh package_code_id diperiksa lebih dulu, jadi baris kedua yang
    // dilaporkan.
    expect(h.lama.teks).toBe(ErrorList["Package ID is required"]);
    // Baru: baris pertama diperiksa sampai tuntas lebih dulu.
    expect(h.baru.teks).toBe(ErrorList["Price must be numeric"]);
  });

  it("hal yang sama berlaku pada package_content", async () => {
    const h = await banding("post", "/", {
      ...paketLengkap,
      package_content: [
        { product_id: 1, product_unit_id: 1, price: 1 },
        { quantity: 1, product_unit_id: 1, price: 1 },
      ],
    });

    expect(h.lama.teks).toBe(ErrorList["Package item id required"]);
    expect(h.baru.teks).toBe(ErrorList["Package item quantity required"]);
  });

  /**
   * Pemaksaan Number() pada parameter jalur lebih longgar daripada isInt().
   * Bentuk-bentuk ini hanya muncul bila URL disusun dengan tangan, dan nilainya
   * tetap bilangan bulat yang sah sampai ke controller.
   */
  it("bentuk angka yang dulu ditolak pada :id sekarang diterima", async () => {
    for (const j of ["/1e3", "/1.0", "/%201%20"]) {
      const h = await banding("get", j);
      expect(h.lama.status).toBe(400);
      expect(h.baru.status).toBe(200);
    }
  });
});

/* ================================================================== */
/* Penjaga                                                             */
/* ================================================================== */

describe("Penjaga: berkas route tidak lagi menyimpan aturan validasi", () => {
  it("product-package.route.ts", () => {
    const isiBerkas = readFileSync(
      join(__dirname, "..", "..", "src", "routes", "product-package.route.ts"),
      "utf8"
    );
    expect(isiBerkas).not.toMatch(/ErrorHelper\.intercept/);
    expect(isiBerkas).not.toMatch(/\bbody\(/);
    expect(isiBerkas).not.toMatch(/\bparam\(/);
    expect(isiBerkas).not.toMatch(/express-validator/);
  });
});
