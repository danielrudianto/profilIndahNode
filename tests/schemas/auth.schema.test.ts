import express from "express";
import request from "supertest";
import { body } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import { loginSchema } from "../../src/schemas/auth.schema";

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

/** Rantai validator lama, disalin apa adanya dari auth.route.ts sebelumnya. */
function appLama() {
  const app = express();
  app.use(express.json());

  app.post(
    "/login",
    body("username")
      .not()
      .isEmpty()
      .withMessage(ErrorList["Username is required"]),
    body("password")
      .not()
      .isEmpty()
      .withMessage(ErrorList["Password is required"]),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/login", validate(loginSchema), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function keduanya(
  metode: "post" | "put",
  jalur: string,
  badan?: Record<string, unknown>
) {
  const l = await request(lama)
    [metode](jalur)
    .send(badan ?? {});
  const b = await request(baru)
    [metode](jalur)
    .send(badan ?? {});
  return {
    lama: { status: l.status, teks: l.text },
    baru: { status: b.status, teks: b.text },
  };
}

describe("POST /login — perilaku harus identik", () => {
  it("menerima kredensial lengkap", async () => {
    const h = await keduanya("post", "/login", {
      username: "budi",
      password: "rahasia",
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("menolak badan kosong dengan pesan username lebih dulu", async () => {
    const h = await keduanya("post", "/login");
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Username is required"]);
  });

  it("menolak username kosong", async () => {
    const h = await keduanya("post", "/login", {
      username: "",
      password: "rahasia",
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Username is required"]);
  });

  it("menolak password kosong", async () => {
    const h = await keduanya("post", "/login", {
      username: "budi",
      password: "",
    });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.teks).toBe(ErrorList["Password is required"]);
  });

  it("menolak username yang hanya berisi spasi", async () => {
    const h = await keduanya("post", "/login", {
      username: "   ",
      password: "rahasia",
    });
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Username is required"]);
  });
});

/*
  Bagian PUT /password sudah dibuang bersama endpoint dan skemanya: jalur
  ganti sandi tanpa bukti sandi lama digantikan POST /user/changePassword
  dan reset administrator di PUT /user/:id/reset-password.
*/
