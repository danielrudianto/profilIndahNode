import express from "express";
import request from "supertest";
import { body, param, query } from "express-validator";
import ErrorHelper from "./helpers/legacy-error.helper";
import ErrorList from "../src/constants/error-list.constant";
import { validate } from "../src/utils/validate.helper";
import {
  inadequateStockSchema,
  paramStockSchema,
  problematicStockSchema,
  stockListQuerySchema,
  stockMutationSchema,
} from "../src/schemas/stock.schema";

/**
 * Perbandingan perilaku: express-validator lama versus skema Zod baru.
 *
 * Perbedaan yang disengaja diuji terpisah di bagian bawah: kebijakan ketat
 * pada req.body, dan larik kosong yang dulu melewati pemeriksaan tanpa
 * disentuh.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai penyaring merek dan tipe, disalin apa adanya dari stock.route.ts. */
const rantaiPenyaring = [
  body("brands").exists().withMessage(ErrorList["Brand is required"]),
  body("brands").isArray().withMessage(ErrorList["Brand must be an array"]),
  body("brands").custom((value) => {
    if (!value.every((item: any) => Number.isInteger(item))) {
      throw new Error(ErrorList["Brand must be an integer"]);
    }
    return true;
  }),
  body("types").exists().withMessage(ErrorList["Type is required"]),
  body("types").isArray().withMessage(ErrorList["Type must be an array"]),
  body("types").custom((value) => {
    if (!value.every((item: any) => Number.isInteger(item))) {
      throw new Error(ErrorList["Type must be an integer"]);
    }
    return true;
  }),
];

/** Rantai validator lama, disalin apa adanya dari stock.route.ts. */
function appLama() {
  const app = express();
  app.use(express.json());

  app.get(
    "/product/:id",
    param("id").exists().isNumeric().withMessage(ErrorList["ID is required"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/kartu/:id",
    param("id").exists().isNumeric().withMessage(ErrorList["ID is required"]),
    param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
    query("page").notEmpty().withMessage(ErrorList["Page is required"]),
    query("page")
      .isInt({
        min: 1,
      })
      .withMessage(ErrorList["Page must be numeric"]),
    query("pageSize")
      .notEmpty()
      .withMessage(ErrorList["Page size is required"]),
    query("pageSize")
      .isInt({
        min: 10,
      })
      .withMessage(ErrorList["Page size must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.get(
    "/",
    query("page").notEmpty().withMessage(ErrorList["Page is required"]),
    query("page")
      .isInt({
        min: 1,
      })
      .withMessage(ErrorList["Page must be numeric"]),
    query("pageSize")
      .notEmpty()
      .withMessage(ErrorList["Page size is required"]),
    query("pageSize")
      .isInt({
        min: 10,
      })
      .withMessage(ErrorList["Page size must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.post("/problematic", ...rantaiPenyaring, ErrorHelper.intercept, balas);
  app.post("/inadequate", ...rantaiPenyaring, ErrorHelper.intercept, balas);

  app.post(
    "/mutation",
    body("date").notEmpty().withMessage(ErrorList["Date required"]),
    body("viewBy")
      .notEmpty()
      .withMessage(ErrorList["View by mutation required"]),
    body("viewBy")
      .isIn(["date", "created"])
      .withMessage(
        ErrorList[
          "View by mutation must be either document date or creation date"
        ]
      ),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.get("/product/:id", validate(paramStockSchema, "params"), balas);
  app.get(
    "/kartu/:id",
    validate(paramStockSchema, "params"),
    validate(stockListQuerySchema, "query"),
    balas
  );
  app.get("/", validate(stockListQuerySchema, "query"), balas);
  app.post("/problematic", validate(problematicStockSchema), balas);
  app.post("/inadequate", validate(inadequateStockSchema), balas);
  app.post("/mutation", validate(stockMutationSchema), balas);
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

describe("Parameter :id stok — perilaku harus identik", () => {
  for (const jalur of [
    "/product/1",
    "/product/0",
    "/product/abc",
    "/product/-1",
    "/product/1.5",
    "/product/01",
    "/product/+2",
    "/product/1e5",
    "/product/%201",
  ]) {
    it(jalur, async () => {
      const h = await bandingGet(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Kueri daftar stok — perilaku harus identik", () => {
  for (const kueri of [
    "?page=1&pageSize=10",
    "?page=1&pageSize=100",
    "",
    "?page=1",
    "?pageSize=10",
    "?page=&pageSize=10",
    "?page=0&pageSize=10",
    "?page=abc&pageSize=10",
    "?page=1.5&pageSize=10",
    "?page=1&pageSize=",
    "?page=1&pageSize=9",
    "?page=1&pageSize=abc",
    "?page=0&pageSize=0",
  ]) {
    it(`GET /${kueri}`, async () => {
      const h = await bandingGet(`/${kueri}`);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/**
 * GET /:id memeriksa dua sumber sekaligus. Rantai lama memasang aturan
 * parameter lebih dulu, jadi galat parameter harus tetap menang atas galat
 * kueri walaupun keduanya salah.
 */
describe("Kartu stok — parameter dan kueri sekaligus", () => {
  for (const jalur of [
    "/kartu/1?page=1&pageSize=10",
    "/kartu/1",
    "/kartu/abc?page=1&pageSize=10",
    "/kartu/abc",
    "/kartu/0?page=0&pageSize=10",
    "/kartu/1?page=0&pageSize=10",
    "/kartu/1?page=1",
  ]) {
    it(jalur, async () => {
      const h = await bandingGet(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }

  it("parameter salah menang atas kueri salah", async () => {
    const h = await bandingGet("/kartu/abc?page=0&pageSize=0");
    expect(h.baru.teks).toBe(ErrorList["ID is required"]);
    expect(h.baru).toEqual(h.lama);
  });
});

const penyaringLengkap = { brands: [1, 2], types: [3] };

describe("POST /problematic dan /inadequate — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", penyaringLengkap],
    ["badan kosong", {}],
    ["brands null", { ...penyaringLengkap, brands: null }],
    ["brands teks", { ...penyaringLengkap, brands: "1,2" }],
    ["brands angka", { ...penyaringLengkap, brands: 5 }],
    ["brands objek", { ...penyaringLengkap, brands: { a: 1 } }],
    ["brands berisi teks angka", { ...penyaringLengkap, brands: [1, "2"] }],
    ["brands berisi pecahan", { ...penyaringLengkap, brands: [1.5] }],
    ["brands berisi null", { ...penyaringLengkap, brands: [null] }],
    ["tanpa types", { ...penyaringLengkap, types: undefined }],
    ["types null", { ...penyaringLengkap, types: null }],
    ["types teks", { ...penyaringLengkap, types: "3" }],
    ["types berisi teks angka", { ...penyaringLengkap, types: ["3"] }],
    ["brands dan types sama-sama salah", { brands: "x", types: "y" }],
  ];

  for (const [nama, badan] of kasus) {
    for (const jalur of ["/problematic", "/inadequate"]) {
      it(`${jalur} — ${nama}`, async () => {
        const h = await bandingPost(jalur, badan);
        expect(h.baru).toEqual(h.lama);
      });
    }
  }
});

/**
 * LARIK KOSONG. Rantai lama memeriksa isi larik dengan
 * `value.every(Number.isInteger)`, dan `[].every()` selalu bernilai true.
 * Larik kosong karena itu diterima, dan itu memang benar: begitulah klien
 * meminta daftar tanpa penyaring. Skema baru harus menerimanya juga.
 */
describe("Larik kosong pada penyaring merek dan tipe", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["brands kosong", { brands: [], types: [3] }],
    ["types kosong", { brands: [1], types: [] }],
    ["keduanya kosong", { brands: [], types: [] }],
  ];

  for (const [nama, badan] of kasus) {
    it(`${nama} tetap diterima keduanya`, async () => {
      const h = await bandingPost("/problematic", badan);
      expect(h.lama.status).toBe(200);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

const mutasiLengkap = { date: "2026-05-01", viewBy: "date" };

describe("POST /mutation — perilaku harus identik", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    ["lengkap", mutasiLengkap],
    ["viewBy created", { ...mutasiLengkap, viewBy: "created" }],
    ["badan kosong", {}],
    ["tanpa tanggal", { ...mutasiLengkap, date: undefined }],
    ["tanggal kosong", { ...mutasiLengkap, date: "" }],
    ["tanggal null", { ...mutasiLengkap, date: null }],
    ["tanpa viewBy", { ...mutasiLengkap, viewBy: undefined }],
    ["viewBy kosong", { ...mutasiLengkap, viewBy: "" }],
    ["viewBy null", { ...mutasiLengkap, viewBy: null }],
    ["viewBy tidak dikenal", { ...mutasiLengkap, viewBy: "tanggal" }],
    ["viewBy angka", { ...mutasiLengkap, viewBy: 123 }],
    ["viewBy objek", { ...mutasiLengkap, viewBy: { a: 1 } }],
    ["tanggal dan viewBy sama-sama kosong", { date: "", viewBy: "" }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost("/mutation", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — kebijakan ketat pada req.body dan
 * kebocoran larik kosong. Penjelasan lengkapnya di
 * src/schemas/common.schema.ts dan src/schemas/stock.schema.ts.
 */
describe("Perbedaan yang disengaja pada POST /mutation", () => {
  const kasus: Array<[string, Record<string, unknown>]> = [
    [
      "viewBy berupa larik berisi nilai sah",
      {
        ...mutasiLengkap,
        viewBy: ["date"],
      },
    ],
    ["viewBy berupa larik kosong", { ...mutasiLengkap, viewBy: [] }],
    ["tanggal berupa larik kosong", { ...mutasiLengkap, date: [] }],
  ];

  for (const [nama, badan] of kasus) {
    it(`${nama}: dulu diterima, sekarang ditolak`, async () => {
      const l = await request(lama).post("/mutation").send(badan);
      const b = await request(baru).post("/mutation").send(badan);
      expect(l.status).toBe(200);
      expect(b.status).toBe(400);
    });
  }
});
