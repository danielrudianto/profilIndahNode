import express from "express";
import request from "supertest";
import { body } from "express-validator";
import ErrorHelper from "../src/utils/error.helper";
import ErrorList from "../src/constants/error_list";
import { validate } from "../src/utils/validate.helper";
import {
  daftarStokGudangKurangSchema,
  daftarStokGudangSchema,
} from "../src/schemas/warehouse.schema";

/**
 * Perbandingan perilaku: express-validator lama versus skema Zod baru.
 *
 * Tujuannya bukan membuktikan skema barunya "benar", melainkan membuktikan ia
 * berperilaku SAMA dengan yang digantikan. Frontend menampilkan badan balasan
 * galat apa adanya, jadi status maupun isinya harus identik — bukan setara.
 *
 * Satu perbedaan memang disengaja dan diuji terpisah di bagian bawah.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/**
 * Rantai validator lama, disalin apa adanya dari warehouse.route.ts sebelumnya.
 * Middleware autentikasi sengaja tidak ikut: yang diuji di sini validasinya,
 * dan authMiddleware butuh token sungguhan.
 */
function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/product-stock",
    body("keyword").exists().withMessage(ErrorList["Keyword is required"]),
    body("page").notEmpty().withMessage(ErrorList["Page is required"]),
    body("page")
      .isInt({
        min: 0,
      })
      .withMessage(ErrorList["Page must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  app.post(
    "/product-stock/inadequate",
    body("keyword").exists().withMessage(ErrorList["Keyword is required"]),
    body("page").notEmpty().withMessage(ErrorList["Page is required"]),
    body("page")
      .isInt({
        min: 0,
      })
      .withMessage(ErrorList["Page must be numeric"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/product-stock", validate(daftarStokGudangSchema), balas);
  app.post(
    "/product-stock/inadequate",
    validate(daftarStokGudangKurangSchema),
    balas
  );
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

/**
 * Kedua endpoint memakai rantai yang sama persis, jadi setiap kasus dijalankan
 * pada keduanya. Kalau salah satunya kelak menyimpang, tes ini yang akan
 * memperlihatkannya.
 */
const jalur = ["/product-stock", "/product-stock/inadequate"];

describe.each(jalur)("POST %s — perilaku harus identik", (rute) => {
  it("menerima penyaring lengkap", async () => {
    const h = await keduanya(rute, { keyword: "semen", page: 1 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak badan kosong dengan pesan keyword lebih dulu", async () => {
    const h = await keduanya(rute);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Keyword is required"]);
  });

  it("mengeluh soal keyword lebih dulu walaupun page juga salah", async () => {
    // Penjaga urutan bidang: kalau `page` berpindah ke depan di skema, pesan
    // yang dilihat pengguna ikut berubah.
    const h = await keduanya(rute, { page: -1 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Keyword is required"]);
  });

  it("menerima keyword kosong — itu cara meminta daftar tanpa penyaring", async () => {
    const h = await keduanya(rute, { keyword: "", page: 1 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menerima keyword null seperti rantai lama", async () => {
    const h = await keduanya(rute, { keyword: null, page: 1 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak page yang tidak dikirim dengan pesan 'wajib'", async () => {
    const h = await keduanya(rute, { keyword: "semen" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Page is required"]);
  });

  it("menolak page null dengan pesan 'wajib'", async () => {
    const h = await keduanya(rute, { keyword: "semen", page: null });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Page is required"]);
  });

  it("menolak page string kosong dengan pesan 'wajib'", async () => {
    const h = await keduanya(rute, { keyword: "semen", page: "" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Page is required"]);
  });

  it("menolak page bukan angka dengan pesan 'harus bilangan'", async () => {
    const h = await keduanya(rute, { keyword: "semen", page: "abc" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Page must be numeric"]);
  });

  it("menolak page pecahan", async () => {
    const h = await keduanya(rute, { keyword: "semen", page: 1.5 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Page must be numeric"]);
  });

  it("menolak page negatif", async () => {
    const h = await keduanya(rute, { keyword: "semen", page: -1 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Page must be numeric"]);
  });

  it("menolak page boolean", async () => {
    const h = await keduanya(rute, { keyword: "semen", page: true });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Page must be numeric"]);
  });

  it("menerima page 0 seperti rantai lama, karena batas bawahnya memang 0", async () => {
    // Nilai ini menghasilkan offset negatif di controller — cacat lama yang
    // sengaja dipertahankan supaya migrasi ini tidak mengubah perilaku.
    const h = await keduanya(rute, { keyword: "semen", page: 0 });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("membiarkan bidang dari middleware autentikasi lewat tanpa dipermasalahkan", async () => {
    const h = await keduanya(rute, {
      keyword: "semen",
      page: 1,
      pageSize: 20,
      userId: 7,
      role: 6,
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA.
 *
 * express-validator mengubah setiap nilai menjadi string sebelum memeriksanya,
 * sehingga `page: "5"` lolos isInt sama seperti `page: 5`. Skema Zod tidak
 * memakai pemaksaan tipe pada badan JSON — di sana tipe aslinya sudah terbawa,
 * dan menerima teks sebagai angka hanya menyembunyikan kesalahan di sisi
 * pemanggil. Controller memakai `page` untuk berhitung, jadi nilai teks yang
 * lolos akan diam-diam ikut dihitung lewat pemaksaan tipe JavaScript.
 *
 * Statusnya tetap 400 dan kalimatnya tetap "Page must be numeric"; yang berubah
 * hanya nilai mana yang diterima.
 */
describe.each(jalur)(
  "Perbedaan yang disengaja pada %s: page berupa teks",
  (rute) => {
    it("lama menerima page berupa teks angka", async () => {
      const res = await request(lama).post(rute).send({
        keyword: "semen",
        page: "5",
      });
      expect(res.status).toBe(200);
    });

    it("baru menolaknya dengan pesan yang sudah dikenal", async () => {
      const res = await request(baru).post(rute).send({
        keyword: "semen",
        page: "5",
      });
      expect(res.status).toBe(400);
      expect(res.text).toBe(ErrorList["Page must be numeric"]);
    });
  }
);
