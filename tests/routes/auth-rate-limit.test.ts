import express from "express";
import request from "supertest";
import { buatPembatasMasuk } from "../../src/utils/rate-limit.helper";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Pembatas laju rute masuk.
 *
 * Tes ini memakai pembatas yang SUNGGUHAN dari rate-limit.helper, bukan tiruan
 * — yang perlu dibuktikan justru perilaku pustakanya beserta konfigurasi kita:
 * pembilang per pasangan IP dan nama pengguna, dan hanya kegagalan yang
 * dibilang.
 *
 * Setiap pengujian membuat aplikasi baru supaya pembilangnya bersih. Pembatas
 * express-rate-limit menyimpan hitungannya di memori pada instans middleware,
 * jadi instans yang dipakai bersama akan membuat urutan tes saling
 * memengaruhi — dan tes yang lolos hanya karena dijalankan lebih dulu tidak
 * menjaga apa pun.
 */
describe("pembatas laju rute masuk", () => {
  /**
   * Aplikasi tiruan: /login membalas 400 (gagal) atau 200 (berhasil) sesuai
   * kata sandi, meniru AuthController tanpa menyentuh basis data.
   */
  const app = () => {
    const a = express();
    a.use(express.json());
    a.set("trust proxy", 1);
    a.post("/login", buatPembatasMasuk(), (req, res) => {
      if (req.body?.password === "benar") {
        return res.status(200).send("ok");
      }
      return res.status(400).send(ErrorList["Auth error"]);
    });
    return a;
  };

  const coba = (a: express.Express, username: string, password = "salah") =>
    request(a).post("/login").send({ username, password });

  it("meloloskan sepuluh percobaan gagal pertama", async () => {
    const a = app();

    for (let i = 0; i < 10; i++) {
      const res = await coba(a, "winda");
      expect(res.status).toBe(400);
    }
  });

  it("menolak percobaan kesebelas dengan 429", async () => {
    const a = app();

    for (let i = 0; i < 10; i++) {
      await coba(a, "winda");
    }

    const res = await coba(a, "winda");
    expect(res.status).toBe(429);
    expect(res.text).toBe(ErrorList["Too many attempts"]);
  });

  /**
   * Inilah alasan kuncinya menggabungkan nama pengguna, bukan IP saja.
   *
   * Seluruh kantor keluar lewat satu alamat. Kalau pembilangnya per IP,
   * seorang kasir yang lupa kata sandinya akan mengunci seluruh rekannya —
   * penjagaan yang berubah menjadi pemadaman.
   */
  it("tidak mengunci pengguna lain dari alamat yang sama", async () => {
    const a = app();

    for (let i = 0; i < 11; i++) {
      await coba(a, "winda");
    }

    const res = await coba(a, "erma");
    expect(res.status).toBe(400);
  });

  /**
   * Dan inilah alasan nama pengguna saja tidak cukup: yang dibilang harus
   * tetap terikat pada satu penyerang. Diuji dari sisi sebaliknya — nama yang
   * sama dari IP berbeda punya pembilang sendiri.
   */
  it("membilang per pasangan, bukan per nama pengguna saja", async () => {
    const a = app();

    for (let i = 0; i < 11; i++) {
      await coba(a, "winda");
    }

    const res = await request(a)
      .post("/login")
      .set("X-Forwarded-For", "203.0.113.9")
      .send({ username: "winda", password: "salah" });

    expect(res.status).toBe(400);
  });

  /**
   * skipSuccessfulRequests. Kasir yang masuk berkali-kali dalam sehari tidak
   * boleh terkunci karena berhasil bekerja.
   */
  it("tidak membilang percobaan yang berhasil", async () => {
    const a = app();

    for (let i = 0; i < 15; i++) {
      const res = await coba(a, "winda", "benar");
      expect(res.status).toBe(200);
    }
  });

  /**
   * Campuran: sembilan gagal lalu satu berhasil tidak menambah pembilang,
   * sehingga percobaan gagal berikutnya masih diloloskan.
   */
  it("keberhasilan di tengah tidak menambah pembilang", async () => {
    const a = app();

    for (let i = 0; i < 9; i++) {
      await coba(a, "winda");
    }
    await coba(a, "winda", "benar");

    const res = await coba(a, "winda");
    expect(res.status).toBe(400);
  });

  /**
   * IPv6: seluruh blok /64 berbagi satu pembilang.
   *
   * Penyedia internet membagikan blok, bukan alamat tunggal, jadi satu
   * penyerang bisa berganti alamat pada tiap percobaan tanpa berpindah
   * jaringan. Tanpa ipKeyGenerator, sebelas percobaan dari sebelas alamat di
   * blok yang sama akan lolos semuanya — pembilangnya tidak pernah penuh.
   */
  it("menyatukan alamat IPv6 dari blok yang sama", async () => {
    const a = app();

    for (let i = 0; i < 10; i++) {
      await request(a)
        .post("/login")
        .set("X-Forwarded-For", `2001:db8:1:1::${i + 1}`)
        .send({ username: "winda", password: "salah" });
    }

    const res = await request(a)
      .post("/login")
      .set("X-Forwarded-For", "2001:db8:1:1::ff")
      .send({ username: "winda", password: "salah" });

    expect(res.status).toBe(429);
  });

  /** Blok IPv6 yang berbeda tetap punya pembilang sendiri. */
  it("memisahkan blok IPv6 yang berbeda", async () => {
    const a = app();

    for (let i = 0; i < 11; i++) {
      await request(a)
        .post("/login")
        .set("X-Forwarded-For", `2001:db8:1:1::${i + 1}`)
        .send({ username: "winda", password: "salah" });
    }

    const res = await request(a)
      .post("/login")
      .set("X-Forwarded-For", "2001:db8:9:9::1")
      .send({ username: "winda", password: "salah" });

    expect(res.status).toBe(400);
  });

  it("mengirim header RateLimit standar, bukan X-RateLimit lama", async () => {
    const a = app();

    const res = await coba(a, "winda");

    expect(res.headers["ratelimit-limit"]).toBeDefined();
    expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
  });
});
