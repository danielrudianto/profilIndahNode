import express from "express";
import request from "supertest";

/**
 * Peran PEMANGGIL dan peran TUJUAN tidak boleh berbagi satu kunci.
 *
 * authMiddleware dan requireRole menuliskan identitas pemanggil ke badan
 * permintaan supaya controller tidak perlu mempercayai kiriman client. Dulu
 * keduanya memakai kunci `role` — kunci yang SAMA dengan yang dipakai
 * formulir untuk mengirim peran pengguna baru.
 *
 * Akibatnya POST /user menyimpan setiap pengguna baru dengan peran
 * pembuatnya: administrator yang membuat akun Penjualan menghasilkan akun
 * Administrator. Tidak ada galat sama sekali — nilainya sah, tipenya benar,
 * validasinya lolos, dan yang tersimpan hanya diam-diam berbeda. PUT /user
 * terkena hal yang sama, di sana lebih berbahaya karena bisa MENAIKKAN peran
 * orang lain tanpa disengaja.
 *
 * Tes ini meniru perilaku middleware-nya, bukan memuat helper aslinya:
 * helper itu memverifikasi JWT dan menyentuh Prisma, dua hal yang tidak ada
 * hubungannya dengan aturan yang sedang dijaga di sini. Yang ditiru adalah
 * aturannya persis — tulis callerRole, dan jangan sentuh `role` bila badan
 * permintaan sudah membawanya.
 */
describe("peran pemanggil terpisah dari peran kiriman", () => {
  const PERAN_PEMANGGIL = 5;

  /** Salinan aturan penulisan di auth.helper.ts. */
  const middlewareTiruan = (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.body.userId = 1;
    req.body.callerRole = PERAN_PEMANGGIL;
    if (req.body.role === undefined) {
      req.body.role = PERAN_PEMANGGIL;
    }
    next();
  };

  const app = () => {
    const a = express();
    a.use(express.json());
    a.post("/user", middlewareTiruan, (req, res) => {
      res.status(200).send({
        role: req.body.role,
        callerRole: req.body.callerRole,
      });
    });
    return a;
  };

  it("tidak menimpa peran yang dikirim formulir", async () => {
    const res = await request(app())
      .post("/user")
      .send({ name: "Winda", role: 2 });

    /* 2 = Penjualan. Dulu nilai ini menjadi 5 tanpa satu pun galat. */
    expect(res.body.role).toBe(2);
  });

  it("tetap menyediakan peran pemanggil di kunci tersendiri", async () => {
    const res = await request(app())
      .post("/user")
      .send({ name: "Winda", role: 2 });

    expect(res.body.callerRole).toBe(PERAN_PEMANGGIL);
  });

  it("peran kiriman dan peran pemanggil tidak saling mengubah", async () => {
    const res = await request(app())
      .post("/user")
      .send({ name: "Winda", role: 7 });

    expect(res.body.role).toBe(7);
    expect(res.body.callerRole).toBe(PERAN_PEMANGGIL);
  });

  /**
   * Pemanggil lama yang TIDAK mengirim role tetap mendapat perilaku sebelumnya.
   *
   * Beberapa controller membaca req.body.role sebagai identitas pemanggil dan
   * tidak pernah menerima kunci itu dari client. Kalau cadangan ini dilepas,
   * mereka membaca undefined dan penjagaan perannya diam-diam berhenti
   * bekerja — gagal terbuka, bukan gagal tertutup.
   */
  it("mengisi role dari pemanggil bila badan permintaan tidak membawanya", async () => {
    const res = await request(app()).post("/user").send({ name: "Winda" });

    expect(res.body.role).toBe(PERAN_PEMANGGIL);
    expect(res.body.callerRole).toBe(PERAN_PEMANGGIL);
  });

  /* Nol adalah peran yang tidak dipakai, tetapi ia juga nilai yang falsy —
     cadangan yang ditulis dengan `||` akan menggantinya diam-diam. */
  it("membedakan role bernilai nol dari role yang tidak dikirim", async () => {
    const res = await request(app())
      .post("/user")
      .send({ name: "Winda", role: 0 });

    expect(res.body.role).toBe(0);
  });
});
