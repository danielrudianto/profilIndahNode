import express from "express";
import request from "supertest";
import { body, param } from "express-validator";
import ErrorHelper from "./helpers/legacy-error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  getBillByOtcSchema,
  deleteBillSchema,
  confirmBillSchema,
} from "../src/schemas/cashier.schema";

/**
 * Perbandingan perilaku untuk layar kasir: express-validator lama versus skema
 * Zod baru.
 *
 * Tujuannya bukan membuktikan skema barunya "benar", melainkan membuktikan ia
 * berperilaku SAMA dengan yang digantikan. Frontend menampilkan badan balasan
 * galat apa adanya, jadi status maupun isinya harus identik — bukan setara.
 *
 * Tiga perbedaan memang disengaja dan diuji terpisah di bagian bawah.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin apa adanya dari cashier.route.ts sebelumnya. */
function appLama() {
  const app = express();
  app.use(express.json());

  app.get(
    "/bill/:otc",
    param("otc").notEmpty().withMessage(ErrorList["Parameter error"]),
    ErrorHelper.intercept,
    balas
  );

  // Dua aturan berurutan pada bidang yang sama, dengan pesan yang identik.
  app.post(
    "/bill/delete",
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    body("id").isInt().withMessage(ErrorList["ID is required"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/bill/confirm",
    body("id").notEmpty().withMessage(ErrorList["ID is required"]),
    body("id").isInt().withMessage(ErrorList["ID is required"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.get("/bill/:otc", validate(getBillByOtcSchema, "params"), balas);
  app.post("/bill/delete", validate(deleteBillSchema), balas);
  app.post("/bill/confirm", validate(confirmBillSchema), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function bandingGet(jalur: string) {
  const [a, b] = await Promise.all([
    request(lama).get(jalur),
    request(baru).get(jalur),
  ]);
  return {
    lama: { status: a.status, teks: a.text },
    baru: { status: b.status, teks: b.text },
  };
}

async function bandingPost(jalur: string, badan: any) {
  const [a, b] = await Promise.all([
    request(lama).post(jalur).send(badan),
    request(baru).post(jalur).send(badan),
  ]);
  return {
    lama: { status: a.status, teks: a.text },
    baru: { status: b.status, teks: b.text },
  };
}

describe("GET /bill/:otc — perilaku harus identik", () => {
  const kasus: Array<[string, string]> = [
    ["kode OTC biasa", "/bill/ABC123"],
    ["kode berupa angka", "/bill/123456"],
    // Penjaga: notEmpty() menghitung spasi sebagai isi. Kalau skema kelak
    // diganti requiredText (yang memangkas spasi), harapan ini gagal.
    ["kode yang hanya berisi spasi", "/bill/%20%20"],
    ["kode lebih panjang dari kolomnya", "/bill/ABCDEFGHIJ"],
    // Express tidak mencocokkan jalur tanpa segmen terakhir, jadi keduanya
    // berakhir 404 sebelum validasi sempat berjalan.
    ["kode kosong tidak mencapai validasi", "/bill/"],
  ];

  for (const [nama, jalur] of kasus) {
    it(nama, async () => {
      const h = await bandingGet(jalur);
      expect(h.baru).toEqual(h.lama);
    });
  }

  it("meneruskan kode yang sah", async () => {
    const h = await bandingGet("/bill/ABC123");
    expect(h.baru.status).toBe(200);
  });
});

/*
  Kedua endpoint memakai rantai yang sama persis, jadi setiap kasus dijalankan
  pada keduanya. Kalau salah satunya kelak berubah sendiri, tes ini yang
  memperlihatkannya.
*/
const jalurTagihan = ["/bill/delete", "/bill/confirm"];

describe.each(jalurTagihan)("POST %s — perilaku harus identik", (jalur) => {
  const kasus: Array<[string, any]> = [
    ["id bilangan bulat", { id: 12 }],
    ["badan kosong", {}],
    ["id null", { id: null }],
    ["id teks kosong", { id: "" }],
    ["id bukan angka", { id: "abc" }],
    ["id pecahan", { id: 1.5 }],
    ["id boolean", { id: true }],
    ["id objek", { id: { nilai: 1 } }],
    ["userId dari authMiddleware ikut lewat", { id: 12, userId: 7 }],
    ["bidang tambahan diabaikan", { id: 12, items: [], service: 0 }],
  ];

  for (const [nama, badan] of kasus) {
    it(nama, async () => {
      const h = await bandingPost(jalur, badan);
      expect(h.baru).toEqual(h.lama);
    });
  }

  it("menolak badan kosong dengan pesan ID", async () => {
    const h = await bandingPost(jalur, {});
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["ID is required"]);
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — PERTAMA.
 *
 * isInt() milik rantai lama mengubah nilai menjadi teks sebelum memeriksanya,
 * sehingga `{"id": "12"}` lolos validasi. Teks itu lalu diteruskan ke Prisma,
 * yang mensyaratkan angka pada `where: { id }` dan melempar galatnya sendiri —
 * pengguna menerima 500. Jadi tidak ada pemanggil yang selama ini berhasil
 * mengirim teks; yang berubah hanya galatnya menjadi 400 dengan pesan yang
 * sudah dikenal frontend.
 */
describe.each(jalurTagihan)(
  "Perbedaan disengaja pada %s: id berupa teks angka",
  (jalur) => {
    it("lama meloloskan teks angka ke controller", async () => {
      const res = await request(lama).post(jalur).send({ id: "12" });
      expect(res.status).toBe(200);
    });

    it("baru menolaknya dengan pesan ID yang sama", async () => {
      const res = await request(baru).post(jalur).send({ id: "12" });
      expect(res.status).toBe(400);
      expect(res.text).toBe(ErrorList["ID is required"]);
    });
  }
);

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — KEDUA.
 *
 * isInt() tanpa opsi menerima 0 dan bilangan negatif. Kolom id memakai
 * autoincrement mulai dari 1, sehingga nilai seperti itu tidak pernah cocok
 * dengan baris mana pun: deleteByID berakhir 500 dari Prisma, confirmByID
 * berakhir 404. Batas bawah 1 memindahkan penolakannya ke lapisan validasi.
 */
describe.each(jalurTagihan)(
  "Perbedaan disengaja pada %s: batas bawah id",
  (jalur) => {
    for (const nilai of [0, -1]) {
      it(`lama menerima id ${nilai}`, async () => {
        const res = await request(lama).post(jalur).send({ id: nilai });
        expect(res.status).toBe(200);
      });

      it(`baru menolak id ${nilai}`, async () => {
        const res = await request(baru).post(jalur).send({ id: nilai });
        expect(res.status).toBe(400);
        expect(res.text).toBe(ErrorList["ID is required"]);
      });
    }
  }
);

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA — KETIGA.
 *
 * express-validator memperlakukan bidang yang berisi array sebagai kumpulan
 * nilai dan memeriksa tiap anggotanya. `{"id": []}` karena itu tidak diperiksa
 * sama sekali — nol anggota, nol pemeriksaan — dan `{"id": [5]}` lolos karena
 * anggotanya bilangan bulat. Keduanya sampai ke Prisma sebagai array dan
 * berakhir 500. Perhatikan bahwa `{"id": ["abc"]}` justru DITOLAK rantai lama,
 * jadi lolosnya array bukan aturan yang disengaja melainkan celah bentuk.
 */
describe.each(jalurTagihan)(
  "Perbedaan disengaja pada %s: id berupa array",
  (jalur) => {
    for (const nilai of [[], [5]] as any[]) {
      it(`lama meloloskan id ${JSON.stringify(nilai)}`, async () => {
        const res = await request(lama).post(jalur).send({ id: nilai });
        expect(res.status).toBe(200);
      });

      it(`baru menolak id ${JSON.stringify(nilai)}`, async () => {
        const res = await request(baru).post(jalur).send({ id: nilai });
        expect(res.status).toBe(400);
        expect(res.text).toBe(ErrorList["ID is required"]);
      });
    }

    it("array berisi nilai salah bentuk memang sudah ditolak rantai lama", async () => {
      const h = await bandingPost(jalur, { id: ["abc"] });
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(400);
    });
  }
);
