import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../src/utils/error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  getSalesPriceSchema,
  updateUnitPriceSchema,
} from "../src/schemas/product-price.schema";

/**
 * Perbandingan perilaku untuk harga beli dan harga jual per satuan produk.
 *
 * product-price-purchase.route.ts dan product-price-sales.route.ts memasang
 * rantai PUT yang identik baris demi baris, jadi satu app pembanding cukup
 * untuk keduanya; berkas ini menguji skema yang dipakai bersama.
 *
 * Tiga sifat rantai lama yang mudah salah ditiru dan diuji khusus di sini:
 *
 *   URUTAN PESAN ADALAH PER-BIDANG, BUKAN PER-BARIS. Tujuh rantai terpisah
 *   masing-masing menyapu seluruh larik sebelum rantai berikutnya jalan, jadi
 *   pesan milik baris kedua bisa muncul mendahului pesan baris pertama.
 *
 *   JOKER `data.*.x` HANYA MEKAR PADA LARIK DAN OBJEK. Untuk teks dan angka
 *   ia mekar menjadi nol bidang, sehingga yang bersuara hanya custom().
 *
 *   NILAI BERUPA LARIK MELEWATI VALIDATOR BAWAAN TANPA DIPERIKSA. Itulah
 *   sebabnya `product_id: []` dulu dijawab 200.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai lama, disalin apa adanya dari kedua berkas route sebelumnya. */
function appLama() {
  const app = express();
  app.use(express.json());

  app.get(
    "/harga/:id",
    param("id").notEmpty().withMessage(ErrorList["ID is required"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.put(
    "/harga",
    body("product_id")
      .notEmpty()
      .withMessage(ErrorList["Product ID is required"]),
    body("product_id")
      .isInt({ min: 0 })
      .withMessage(ErrorList["Product ID must be numeric"]),
    body("data.*.product_unit_id")
      .exists()
      .withMessage(ErrorList["Product unit ID is required"]),
    body("data.*.price").notEmpty().withMessage(ErrorList["Price is required"]),
    body("data.*.price")
      .isFloat({
        min: 0,
      })
      .withMessage(ErrorList["Price must be numeric"]),
    body("data.*.discount")
      .exists()
      .withMessage(ErrorList["Discount required"]),
    body("data.*.discount")
      .isFloat({
        min: 0,
      })
      .withMessage(ErrorList["Discount must be numeric"]),
    body("data").custom((dataArray) => {
      if (!Array.isArray(dataArray)) {
        throw new Error("Data must be an array");
      }
      for (const item of dataArray) {
        if (
          typeof item.price !== "number" ||
          typeof item.discount !== "number"
        ) {
          throw new Error("Price and discount must be numbers");
        }
        if (item.discount > item.price) {
          throw new Error(
            `Discount (${item.discount}) must be less than price (${item.price}) for product_id ${item.product_id}`
          );
        }
      }
      return true;
    }),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.get("/harga/:id", validate(getSalesPriceSchema, "params"), balas);
  app.put("/harga", validate(updateUnitPriceSchema), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function keduanya(badan: unknown) {
  const l = await request(lama)
    .put("/harga")
    .send(badan as object);
  const b = await request(baru)
    .put("/harga")
    .send(badan as object);
  return {
    lama: { status: l.status, teks: l.text },
    baru: { status: b.status, teks: b.text },
  };
}

async function keduanyaParam(id: string) {
  const l = await request(lama).get(`/harga/${id}`);
  const b = await request(baru).get(`/harga/${id}`);
  return {
    lama: { status: l.status, teks: l.text },
    baru: { status: b.status, teks: b.text },
  };
}

/** Satu baris data yang sah, dengan bidang tertentu ditimpa. */
const baris = (ubah: Record<string, unknown> = {}) => ({
  product_unit_id: 1,
  price: 1000,
  discount: 0,
  ...ubah,
});

const sah = (ubah: Record<string, unknown> = {}) => ({
  product_id: 1,
  data: [baris(ubah)],
});

describe("PUT harga — product_id", () => {
  const kasus: Array<[string, unknown, number, string]> = [
    ["badan lengkap diterima", sah(), 200, "OK"],
    [
      "product_id tidak dikirim",
      { data: [baris()] },
      400,
      ErrorList["Product ID is required"],
    ],
    [
      "product_id null",
      { product_id: null, data: [baris()] },
      400,
      ErrorList["Product ID is required"],
    ],
    [
      "product_id teks kosong",
      { product_id: "", data: [baris()] },
      400,
      ErrorList["Product ID is required"],
    ],
    [
      "product_id objek",
      { product_id: {}, data: [baris()] },
      400,
      ErrorList["Product ID must be numeric"],
    ],
    [
      "product_id pecahan",
      { product_id: 1.5, data: [baris()] },
      400,
      ErrorList["Product ID must be numeric"],
    ],
    [
      "product_id negatif",
      { product_id: -1, data: [baris()] },
      400,
      ErrorList["Product ID must be numeric"],
    ],
    [
      "product_id boolean",
      { product_id: false, data: [baris()] },
      400,
      ErrorList["Product ID must be numeric"],
    ],
    [
      "product_id hanya spasi",
      { product_id: " ", data: [baris()] },
      400,
      ErrorList["Product ID must be numeric"],
    ],
    ["product_id nol diterima", { product_id: 0, data: [baris()] }, 200, "OK"],
  ];

  for (const [nama, badan, status, teks] of kasus) {
    it(nama, async () => {
      const h = await keduanya(badan);
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(status);
      expect(h.baru.teks).toBe(teks);
    });
  }

  it("pesan product_id muncul mendahului pesan data", async () => {
    const h = await keduanya({ product_id: "x", data: "bukan larik" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Product ID must be numeric"]);
  });
});

describe("PUT harga — bentuk data", () => {
  const kasus: Array<[string, unknown, number, string]> = [
    ["data tidak dikirim", { product_id: 1 }, 400, "Data must be an array"],
    ["data null", { product_id: 1, data: null }, 400, "Data must be an array"],
    ["data teks", { product_id: 1, data: "abc" }, 400, "Data must be an array"],
    ["data angka", { product_id: 1, data: 5 }, 400, "Data must be an array"],
    ["data larik kosong diterima", { product_id: 1, data: [] }, 200, "OK"],
    [
      "data objek berisi baris sah tetap ditolak sebagai bukan larik",
      { product_id: 1, data: { x: baris() } },
      400,
      "Data must be an array",
    ],
    [
      "data objek berisi baris cacat: joker mekar lebih dulu",
      { product_id: 1, data: { x: {} } },
      400,
      ErrorList["Product unit ID is required"],
    ],
    [
      "baris null",
      { product_id: 1, data: [null] },
      400,
      ErrorList["Product unit ID is required"],
    ],
    [
      "baris kosong",
      { product_id: 1, data: [{}] },
      400,
      ErrorList["Product unit ID is required"],
    ],
    [
      "baris berupa angka",
      { product_id: 1, data: [5] },
      400,
      ErrorList["Product unit ID is required"],
    ],
  ];

  for (const [nama, badan, status, teks] of kasus) {
    it(nama, async () => {
      const h = await keduanya(badan);
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(status);
      expect(h.baru.teks).toBe(teks);
    });
  }
});

describe("PUT harga — isi baris", () => {
  const kasus: Array<[string, unknown, number, string]> = [
    [
      "product_unit_id hilang",
      sah({ product_unit_id: undefined }),
      400,
      ErrorList["Product unit ID is required"],
    ],
    // exists() hanya menolak undefined; null dan "" lolos di rantai lama dan
    // tetap lolos di sini.
    [
      "product_unit_id null diterima",
      sah({ product_unit_id: null }),
      200,
      "OK",
    ],
    [
      "product_unit_id teks kosong diterima",
      sah({ product_unit_id: "" }),
      200,
      "OK",
    ],
    [
      "product_unit_id boolean diterima",
      sah({ product_unit_id: false }),
      200,
      "OK",
    ],
    [
      "price hilang",
      sah({ price: undefined }),
      400,
      ErrorList["Price is required"],
    ],
    ["price null", sah({ price: null }), 400, ErrorList["Price is required"]],
    [
      "price teks kosong",
      sah({ price: "" }),
      400,
      ErrorList["Price is required"],
    ],
    [
      "price bukan angka",
      sah({ price: "abc" }),
      400,
      ErrorList["Price must be numeric"],
    ],
    [
      "price hanya spasi",
      sah({ price: " " }),
      400,
      ErrorList["Price must be numeric"],
    ],
    [
      "price negatif",
      sah({ price: -1 }),
      400,
      ErrorList["Price must be numeric"],
    ],
    [
      "price boolean",
      sah({ price: true }),
      400,
      ErrorList["Price must be numeric"],
    ],
    [
      "price objek",
      sah({ price: {} }),
      400,
      ErrorList["Price must be numeric"],
    ],
    // isFloat, bukan isInt: pecahan memang sah untuk harga.
    ["price pecahan diterima", sah({ price: 1500.5 }), 200, "OK"],
    ["price nol diterima", sah({ price: 0, discount: 0 }), 200, "OK"],
    // discount memakai exists(), price memakai notEmpty(). Asimetri itu
    // membuat null menghasilkan pesan yang berbeda pada kedua bidang.
    [
      "discount hilang",
      sah({ discount: undefined }),
      400,
      ErrorList["Discount required"],
    ],
    [
      "discount null",
      sah({ discount: null }),
      400,
      ErrorList["Discount must be numeric"],
    ],
    [
      "discount teks kosong",
      sah({ discount: "" }),
      400,
      ErrorList["Discount must be numeric"],
    ],
    [
      "discount negatif",
      sah({ discount: -1 }),
      400,
      ErrorList["Discount must be numeric"],
    ],
    [
      "discount melebihi price",
      sah({ price: 100, discount: 200 }),
      400,
      "Discount (200) must be less than price (100) for product_id undefined",
    ],
    [
      "discount sama dengan price diterima",
      sah({ price: 100, discount: 100 }),
      200,
      "OK",
    ],
  ];

  for (const [nama, badan, status, teks] of kasus) {
    it(nama, async () => {
      const h = await keduanya(badan);
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(status);
      expect(h.baru.teks).toBe(teks);
    });
  }

  it("bidang tambahan dibiarkan lewat", async () => {
    const h = await keduanya({
      product_id: 1,
      data: [baris({ catatan: "abaikan" })],
      userId: 7,
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });
});

/**
 * Urutan pemeriksaan adalah per-bidang, bukan per-baris. Kasus di bawah ini
 * yang membedakan skema yang meniru rantai lama dari skema yang sekadar
 * memakai z.array(z.object(...)): baris PERTAMA kehilangan price, baris KEDUA
 * kehilangan product_unit_id, dan yang muncul adalah pesan baris kedua.
 */
describe("PUT harga — urutan pesan lintas baris", () => {
  it("pesan product_unit_id baris kedua mendahului pesan price baris pertama", async () => {
    const h = await keduanya({
      product_id: 1,
      data: [
        baris({ price: undefined }),
        baris({ product_unit_id: undefined }),
      ],
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Product unit ID is required"]);
  });

  it("pesan price baris kedua mendahului pesan discount baris pertama", async () => {
    const h = await keduanya({
      product_id: 1,
      data: [baris({ discount: undefined }), baris({ price: "abc" })],
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Price must be numeric"]);
  });
});

describe("GET harga/:id", () => {
  const kasus: Array<[string, string, number, string]> = [
    ["id sah", "1", 200, "OK"],
    [
      "id nol ditolak: isInt({ min: 1 })",
      "0",
      400,
      ErrorList["ID must be numeric"],
    ],
    ["id bukan angka", "abc", 400, ErrorList["ID must be numeric"]],
    ["id pecahan", "1.5", 400, ErrorList["ID must be numeric"]],
    ["id negatif", "-1", 400, ErrorList["ID must be numeric"]],
  ];

  for (const [nama, id, status, teks] of kasus) {
    it(nama, async () => {
      const h = await keduanyaParam(id);
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(status);
      expect(h.baru.teks).toBe(teks);
    });
  }
});

/**
 * KEBIJAKAN KETAT — lihat src/schemas/common.schema.ts.
 *
 * Nilai yang dulu DITERIMA dan sekarang DITOLAK wajib tercatat berpasangan:
 * rantai lama 200, skema baru 400. Tanpa pasangan itu yang tercatat hanya
 * "sekarang ditolak", dan selisihnya tidak terlihat saat rilis.
 *
 * Semuanya berasal dari satu sebab: express-validator mengubah nilai menjadi
 * teks sebelum memeriksanya, dan melewati begitu saja nilai berupa larik.
 */
describe("Kebijakan ketat: dulu diterima, sekarang ditolak", () => {
  const kasus: Array<[string, unknown]> = [
    ["product_id berupa teks angka", { product_id: "1", data: [baris()] }],
    ["product_id berupa larik kosong", { product_id: [], data: [baris()] }],
    ["product_id berupa larik angka", { product_id: [1], data: [baris()] }],
    [
      "product_id berupa larik teks angka",
      { product_id: ["1"], data: [baris()] },
    ],
  ];

  for (const [nama, badan] of kasus) {
    it(`${nama}: lama 200, baru 400`, async () => {
      const h = await keduanya(badan);
      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(ErrorList["Product ID must be numeric"]);
    });
  }

  it("product_id berupa angka asli tetap diterima keduanya", async () => {
    const h = await keduanya(sah());
    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(200);
  });
});

/**
 * PERUBAHAN PESAN YANG DISENGAJA.
 *
 * price dan discount berupa teks angka SUDAH ditolak rantai lama — bukan oleh
 * isFloat() yang meloloskannya, melainkan oleh custom() di ujung rantai, yang
 * membalas teks mentah "Price and discount must be numbers". Teks itu bukan
 * key ErrorList sehingga frontend tidak bisa menerjemahkannya, dan ia juga
 * tidak menyebut bidang mana yang salah.
 *
 * Skema baru menolaknya di bidang yang bersangkutan dengan key i18n yang
 * semestinya. Statusnya tetap 400; hanya isi badannya yang berubah.
 */
describe("Perbedaan yang disengaja: pesan custom() diganti key per bidang", () => {
  const kasus: Array<[string, unknown, string]> = [
    [
      "price teks angka",
      sah({ price: "1000" }),
      ErrorList["Price must be numeric"],
    ],
    [
      "price notasi eksponen",
      sah({ price: "1e3" }),
      ErrorList["Price must be numeric"],
    ],
    ["price larik kosong", sah({ price: [] }), ErrorList["Price is required"]],
    [
      "price larik angka",
      sah({ price: [1] }),
      ErrorList["Price must be numeric"],
    ],
    [
      "discount teks angka",
      sah({ discount: "0" }),
      ErrorList["Discount must be numeric"],
    ],
  ];

  for (const [nama, badan, pesanBaru] of kasus) {
    it(`${nama}: keduanya 400, kalimatnya berbeda`, async () => {
      const h = await keduanya(badan);
      expect(h.lama.status).toBe(400);
      expect(h.lama.teks).toBe("Price and discount must be numbers");
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(pesanBaru);
    });
  }

  /*
    Konsekuensi urutan dari perubahan di atas. Penolakan teks angka pindah dari
    custom() di ujung rantai ke lintasan bidang di tengah, sehingga pada badan
    yang punya DUA cacat sekaligus — satu baris dengan discount melebihi price,
    baris lain dengan price berupa teks — yang dilaporkan ikut berpindah.
    Keduanya tetap 400 dan tetap menolak badan yang sama.
  */
  it("badan dengan dua cacat: pesan yang dilaporkan berpindah", async () => {
    const badan = {
      product_id: 1,
      data: [baris({ price: 10, discount: 20 }), baris({ price: "5" })],
    };
    const h = await keduanya(badan);
    expect(h.lama.status).toBe(400);
    expect(h.lama.teks).toBe(
      "Discount (20) must be less than price (10) for product_id undefined"
    );
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Price must be numeric"]);
  });
});

describe("Penjaga: berkas route tidak lagi menyimpan aturan validasi", () => {
  const berkas = [
    "product-price-purchase.route.ts",
    "product-price-sales.route.ts",
  ];

  for (const nama of berkas) {
    it(nama, () => {
      const isi = readFileSync(
        join(__dirname, "..", "src", "routes", nama),
        "utf8"
      );
      expect(isi).not.toMatch(/ErrorHelper\.intercept/);
      expect(isi).not.toMatch(/express-validator/);
      expect(isi).not.toMatch(/\bbody\(/);
      expect(isi).not.toMatch(/\bparam\(/);
    });
  }
});
