import express from "express";
import request from "supertest";
import { body } from "express-validator";
import ErrorHelper from "./helpers/legacy-error.helper";
import ErrorList from "../src/constants/error-list.constant";
import { validate } from "../src/utils/validate.helper";
import {
  createSalesmanSchema,
  deleteSalesmanSchema,
} from "../src/schemas/salesman.schema";

/**
 * Perbandingan perilaku: express-validator lama versus skema Zod baru.
 *
 * Tujuannya bukan membuktikan skema barunya "benar", melainkan membuktikan ia
 * berperilaku SAMA dengan yang digantikan. Frontend menampilkan badan balasan
 * galat apa adanya kepada pengguna, jadi status maupun kalimatnya harus
 * identik — bukan sekadar setara.
 *
 * Perbedaan yang memang disengaja dicatat terpisah di bagian paling bawah,
 * lengkap dengan alasannya, supaya tidak ada perubahan perilaku yang lolos
 * tanpa disadari.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin apa adanya dari salesman.route.ts sebelumnya. */
function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/",
    body("name").notEmpty().withMessage(ErrorList["Salesman name required"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/delete",
    body("name").notEmpty().withMessage(ErrorList["Salesman name required"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/", validate(createSalesmanSchema), balas);
  app.post("/delete", validate(deleteSalesmanSchema), balas);
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

describe("POST /salesman — perilaku harus identik", () => {
  it("menerima nama yang terisi", async () => {
    const h = await keduanya("/", { name: "Budi" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak badan kosong", async () => {
    const h = await keduanya("/");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Salesman name required"]);
  });

  it("menolak nama berupa teks kosong", async () => {
    const h = await keduanya("/", { name: "" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Salesman name required"]);
  });

  it("menolak nama bernilai null", async () => {
    const h = await keduanya("/", { name: null });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Salesman name required"]);
  });

  it("membiarkan bidang tambahan lewat tanpa dipermasalahkan", async () => {
    // authMiddleware menulis userId dan role ke req.body sebelum validate()
    // berjalan. Keduanya tidak ada di skema dan tidak boleh membuat
    // permintaan ditolak.
    const h = await keduanya("/", { name: "Budi", userId: 7, role: 1 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });
});

describe("POST /salesman/delete — perilaku harus identik", () => {
  it("menerima nama yang terisi", async () => {
    const h = await keduanya("/delete", { name: "Budi" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak badan kosong", async () => {
    const h = await keduanya("/delete");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Salesman name required"]);
  });

  it("aturannya sama persis dengan endpoint buat", async () => {
    const buat = await keduanya("/", { name: "" });
    const hapus = await keduanya("/delete", { name: "" });
    expect(hapus.baru).toEqual(buat.baru);
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA.
 *
 * notEmpty() memeriksa nilai SETELAH express-validator mengubahnya menjadi
 * teks. Dua golongan masukan yang jelas keliru karena itu lolos dan tersimpan
 * ke Redis set sebagai nama salesman. Tes di bawah mengunci kedua sisinya:
 * ia akan gagal bila rantai lama ternyata tidak selonggar dugaan, DAN bila
 * seseorang kelak melonggarkan kembali skema barunya. Perbedaan ini harus
 * tetap disengaja, bukan berubah diam-diam.
 *
 * Statusnya tetap 400 dan kalimatnya tetap key yang sama; yang berubah hanya
 * masukan mana saja yang dianggap sah.
 */
describe("Perbedaan yang disengaja", () => {
  it("nama berisi spasi saja: yang lama menerima, yang baru menolak", async () => {
    // "   " tersimpan sebagai anggota Redis set yang tampil sebagai baris
    // kosong di daftar — tidak bisa dicari maupun dihapus lewat antarmuka.
    const h = await keduanya("/", { name: "   " });

    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Salesman name required"]);
  });

  it("nama berupa angka: yang lama menerima, yang baru menolak", async () => {
    const h = await keduanya("/", { name: 123 });

    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Salesman name required"]);
  });

  it("nama berupa objek: yang lama menerima dan menyimpannya sebagai teks", async () => {
    // Objek diubah menjadi "[object Object]" yang bukan teks kosong, sehingga
    // notEmpty() meloloskannya dan nama itulah yang masuk ke daftar salesman.
    const h = await keduanya("/", { name: { nama: "Budi" } });

    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Salesman name required"]);
  });

  it("perbedaan yang sama berlaku pada endpoint hapus", async () => {
    const h = await keduanya("/delete", { name: "   " });

    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Salesman name required"]);
  });
});
