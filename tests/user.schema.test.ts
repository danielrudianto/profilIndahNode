import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "../src/utils/error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  buatPenggunaSchema,
  paramPenggunaSchema,
  ubahPenggunaSchema,
  ubahSandiPenggunaSchema,
} from "../src/schemas/user.schema";

/**
 * Perbandingan perilaku: rantai express-validator lama versus skema Zod baru.
 *
 * Tujuannya bukan membuktikan skema barunya "benar", melainkan membuktikan ia
 * berperilaku SAMA dengan yang digantikan. Frontend menampilkan badan balasan
 * galat apa adanya kepada pengguna, jadi status maupun kalimatnya harus
 * identik — bukan sekadar setara.
 *
 * Perbedaan yang memang disengaja dikumpulkan di bagian bawah dan SELALU diuji
 * berpasangan: rantai lama dijalankan juga, supaya yang tercatat bukan sekadar
 * "sekarang ditolak" melainkan "dulu diterima, sekarang ditolak".
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/**
 * Rantai validator lama, disalin VERBATIM dari user.route.ts sebelum migrasi —
 * termasuk `.withMessage()` yang hanya menempel pada validator kedua sehingga
 * `notEmpty()` di atasnya memakai pesan bawaan "Invalid value".
 */
function appLama() {
  const app = express();
  app.use(express.json());

  const validateId = [
    param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ];

  const validateUserFields = [
    body("role")
      .notEmpty()
      .isNumeric()
      .withMessage(ErrorList["User role required"]),
    body("name").notEmpty().withMessage(ErrorList["Name required"]),
    body("username").notEmpty().withMessage(ErrorList["Username is required"]),
    body("nik").notEmpty().withMessage(ErrorList["Parameter error"]),
  ];

  app.get("/u/:id", [...validateId, ErrorHelper.intercept], balas);

  app.post(
    "/changePassword",
    body("password").notEmpty().withMessage(ErrorList["Password is required"]),
    ErrorHelper.intercept,
    balas
  );

  app.post("/u", [...validateUserFields, ErrorHelper.intercept], balas);

  app.put(
    "/u",
    [
      body("id")
        .notEmpty()
        .isNumeric()
        .withMessage(ErrorList["ID is required"]),
      ...validateUserFields,
      ErrorHelper.intercept,
    ],
    balas
  );

  app.delete("/u/:id", [...validateId, ErrorHelper.intercept], balas);

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.get("/u/:id", validate(paramPenggunaSchema, "params"), balas);
  app.post("/changePassword", validate(ubahSandiPenggunaSchema), balas);
  app.post("/u", validate(buatPenggunaSchema), balas);
  app.put("/u", validate(ubahPenggunaSchema), balas);
  app.delete("/u/:id", validate(paramPenggunaSchema, "params"), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

/** Jalankan permintaan yang persis sama ke kedua aplikasi. */
async function keduanya(
  metode: "get" | "post" | "put" | "delete",
  jalur: string,
  badan?: any
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

const lengkap = { role: 1, name: "Budi", username: "budi", nik: "123" };

describe("POST /user — perilaku harus identik", () => {
  const kasus: Array<[string, any]> = [
    ["data lengkap", lengkap],
    ["role bukan angka", { ...lengkap, role: "abc" }],
    ["role berupa boolean", { ...lengkap, role: true }],
    ["role nol diterima", { ...lengkap, role: 0 }],
    // isNumeric() lama meloloskan pecahan dan bilangan negatif. Skema baru
    // sengaja tidak mengetatkannya; kalau kelak .int() ditambahkan, kedua
    // kasus di bawah akan gagal dan pilihannya harus disadari.
    ["role pecahan tetap diterima", { ...lengkap, role: 1.5 }],
    ["role negatif tetap diterima", { ...lengkap, role: -1 }],
    ["tanpa name", { role: 1, username: "budi", nik: "123" }],
    ["name kosong", { ...lengkap, name: "" }],
    ["tanpa username", { role: 1, name: "Budi", nik: "123" }],
    ["username kosong", { ...lengkap, username: "" }],
    ["tanpa nik", { role: 1, name: "Budi", username: "budi" }],
    ["nik kosong", { ...lengkap, nik: "" }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await keduanya("post", "/u", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("PUT /user — perilaku harus identik", () => {
  const kasus: Array<[string, any]> = [
    ["data lengkap", { id: 7, ...lengkap }],
    ["id bukan angka", { id: "abc", ...lengkap }],
    ["id berupa boolean", { id: true, ...lengkap }],
    ["id nol", { id: 0, ...lengkap }],
    ["name kosong", { id: 7, ...lengkap, name: "" }],
    ["nik kosong", { id: 7, ...lengkap, nik: "" }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await keduanya("put", "/u", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("POST /user/changePassword — perilaku harus identik", () => {
  const kasus: Array<[string, any]> = [
    ["sandi terisi", { password: "rahasia" }],
    ["tanpa sandi", {}],
    ["sandi kosong", { password: "" }],
    ["userId dari authMiddleware ikut lewat", { userId: 9, password: "abc" }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await keduanya("post", "/changePassword", badan);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Parameter :id — perilaku harus identik", () => {
  const kasus: Array<[string, string]> = [
    ["id angka", "/u/5"],
    ["id nol diterima", "/u/0"],
    ["id berangka nol di depan", "/u/007"],
    ["id negatif", "/u/-1"],
    ["id pecahan", "/u/1.5"],
    ["id berupa huruf", "/u/abc"],
  ];

  for (const [nama, jalur] of kasus) {
    it(`GET ${nama}`, async () => {
      const h = await keduanya("get", jalur);
      expect(h.baru).toEqual(h.lama);
    });

    it(`DELETE ${nama}`, async () => {
      const h = await keduanya("delete", jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }
});

describe("Urutan bidang menentukan pesan yang muncul", () => {
  /*
    Penjaga terhadap .extend(), yang menempatkan kunci baru di BELAKANG kunci
    yang sudah ada. Kalau ubahPenggunaSchema dirakit dengan .extend(), `id`
    pindah ke urutan terakhir dan pesan pada badan kosong berubah.
  */
  it("badan kosong pada PUT mengeluh soal id lebih dulu", async () => {
    const res = await request(baru).put("/u").send({});
    expect(res.text).toBe(ErrorList["ID is required"]);
  });

  it("badan kosong pada POST mengeluh soal role lebih dulu", async () => {
    const res = await request(baru).post("/u").send({});
    expect(res.text).toBe(ErrorList["User role required"]);
  });

  it("name mendahului username, username mendahului nik", async () => {
    const res = await request(baru).post("/u").send({ role: 1 });
    expect(res.text).toBe(ErrorList["Name required"]);

    const res2 = await request(baru).post("/u").send({ role: 1, name: "Budi" });
    expect(res2.text).toBe(ErrorList["Username is required"]);

    const res3 = await request(baru)
      .post("/u")
      .send({ role: 1, name: "Budi", username: "budi" });
    expect(res3.text).toBe(ErrorList["Parameter error"]);
  });
});

/**
 * PERBEDAAN YANG DISENGAJA #1 — pesan bawaan express-validator.
 *
 * `.withMessage()` hanya berlaku untuk validator tepat sebelumnya, sehingga
 * `notEmpty()` pada `role` dan `id` tidak punya pesan dan memakai bawaannya:
 * "Invalid value". Rantai tidak berhenti pada kegagalan pertama, jadi bidang
 * yang tidak dikirim menghasilkan dua galat dan yang terkirim adalah yang
 * pertama — kalimat berbahasa Inggris yang tidak ada di ErrorList dan tidak
 * bisa diterjemahkan frontend. Statusnya tetap 400; hanya isinya yang berubah.
 */
describe("Perbedaan disengaja: pesan bawaan diganti key i18n", () => {
  const kasus: Array<[string, "post" | "put", any, string]> = [
    [
      "POST tanpa role",
      "post",
      { name: "Budi", username: "budi", nik: "1" },
      ErrorList["User role required"],
    ],
    [
      "POST role kosong",
      "post",
      { ...lengkap, role: "" },
      ErrorList["User role required"],
    ],
    ["POST badan kosong", "post", {}, ErrorList["User role required"]],
    ["PUT tanpa id", "put", lengkap, ErrorList["ID is required"]],
    [
      "PUT id kosong",
      "put",
      { id: "", ...lengkap },
      ErrorList["ID is required"],
    ],
    ["PUT badan kosong", "put", {}, ErrorList["ID is required"]],
  ];

  for (const [nama, metode, badan, pesan] of kasus) {
    it(`${nama}: lama membalas "Invalid value", baru membalas key i18n`, async () => {
      const h = await keduanya(metode, "/u", badan);

      expect(h.lama.status).toBe(400);
      expect(h.lama.teks).toBe("Invalid value");
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(pesan);
    });
  }
});

/**
 * PERBEDAAN YANG DISENGAJA #2 — kebijakan ketat req.body.
 *
 * Alasan lengkapnya ada di src/schemas/common.schema.ts. Tiap kasus di bawah
 * membuktikan selisihnya: rantai lama membalas 200, skema baru membalas 400.
 */
describe("Perbedaan disengaja: angka berupa teks ditolak pada req.body", () => {
  const kasus: Array<[string, "post" | "put", any, string]> = [
    [
      "POST role berupa teks",
      "post",
      { ...lengkap, role: "1" },
      ErrorList["User role required"],
    ],
    [
      "PUT id berupa teks",
      "put",
      { id: "7", ...lengkap },
      ErrorList["ID is required"],
    ],
    [
      "PUT role berupa teks",
      "put",
      { id: 7, ...lengkap, role: "1" },
      ErrorList["User role required"],
    ],
  ];

  for (const [nama, metode, badan, pesan] of kasus) {
    it(`${nama}: dulu diterima, sekarang ditolak`, async () => {
      const h = await keduanya(metode, "/u", badan);

      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(pesan);
    });
  }
});

describe("Perbedaan disengaja: nilai bukan teks ditolak pada bidang teks", () => {
  const kasus: Array<[string, any, string]> = [
    [
      "name berupa angka",
      { ...lengkap, name: 123 },
      ErrorList["Name required"],
    ],
    [
      "name berupa objek",
      { ...lengkap, name: { nama: "Budi" } },
      ErrorList["Name required"],
    ],
    [
      "name berupa boolean",
      { ...lengkap, name: true },
      ErrorList["Name required"],
    ],
    [
      "username berupa angka",
      { ...lengkap, username: 123 },
      ErrorList["Username is required"],
    ],
    // nik bertipe String di prisma/schema.prisma. Nilai berupa angka lolos
    // validasi lama lalu ditolak Prisma sebagai galat 500.
    [
      "nik berupa angka",
      { ...lengkap, nik: 12345 },
      ErrorList["Parameter error"],
    ],
  ];

  for (const [nama, badan, pesan] of kasus) {
    it(`${nama}: dulu diterima, sekarang ditolak`, async () => {
      const h = await keduanya("post", "/u", badan);

      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(pesan);
    });
  }

  it("password berupa angka: dulu diterima, sekarang ditolak", async () => {
    const h = await keduanya("post", "/changePassword", { password: 12345 });

    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Password is required"]);
  });
});

/**
 * PERBEDAAN YANG DISENGAJA #3 — teks yang hanya berisi spasi.
 *
 * notEmpty() hanya memeriksa panjang, sehingga "   " lolos dan tersimpan
 * sebagai nama atau nik yang tampak kosong di layar. teksWajib memangkas spasi
 * lebih dulu. Perilaku ini sama dengan yang sudah berlaku pada domain auth.
 */
describe("Perbedaan disengaja: teks berisi spasi saja ditolak", () => {
  const kasus: Array<[string, any, string]> = [
    ["name", { ...lengkap, name: "   " }, ErrorList["Name required"]],
    [
      "username",
      { ...lengkap, username: "   " },
      ErrorList["Username is required"],
    ],
    ["nik", { ...lengkap, nik: "  " }, ErrorList["Parameter error"]],
  ];

  for (const [nama, badan, pesan] of kasus) {
    it(`${nama} berisi spasi saja: dulu diterima, sekarang ditolak`, async () => {
      const h = await keduanya("post", "/u", badan);

      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(pesan);
    });
  }

  it("sandi berisi spasi saja: dulu diterima, sekarang ditolak", async () => {
    const h = await keduanya("post", "/changePassword", { password: "   " });

    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
  });
});

/**
 * PERBEDAAN YANG DISENGAJA #4 — bentuk angka eksotis pada req.params.
 *
 * isInt() lama menuntut hanya digit dengan tanda opsional, sedangkan
 * intDariTeks memakai z.coerce.number() yang menerima apa pun yang bisa
 * dijadikan angka oleh JavaScript. Akibatnya beberapa bentuk yang dulu ditolak
 * kini lolos.
 *
 * Kelonggaran ini DITERIMA dengan sadar, bukan luput: intDariTeks adalah helper
 * bersama yang sudah dipakai sepuluh domain lain, dan membuat satu berkas ini
 * memakai aturan sendiri justru menciptakan ketidakseragaman yang lebih mahal
 * daripada bentuk masukan yang tak pernah dikirim klien mana pun. Nilai yang
 * lolos tetap bilangan bulat >= 0, jadi tidak ada bentuk baru yang sampai ke
 * kueri basis data.
 *
 * Tes ini mengunci selisihnya. Kalau kelak salah satu sisi berubah, tes gagal
 * dan keputusannya harus diambil ulang secara sadar.
 */
describe("Perbedaan disengaja: bentuk angka eksotis pada :id", () => {
  const kasus: Array<[string, string]> = [
    ["notasi eksponen", "/u/1e2"],
    ["notasi heksadesimal", "/u/0x10"],
    ["pecahan yang bernilai bulat", "/u/1.0"],
    ["berspasi di depan", "/u/%201"],
  ];

  for (const [nama, jalur] of kasus) {
    it(`${nama}: dulu ditolak, sekarang diterima`, async () => {
      const h = await keduanya("get", jalur);

      expect(h.lama.status).toBe(400);
      expect(h.lama.teks).toBe(ErrorList["Parameter error"]);
      expect(h.baru.status).toBe(200);
    });
  }
});
