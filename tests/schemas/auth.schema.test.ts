import express from "express";
import request from "supertest";
import { body } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import {
  loginSchema,
  updatePasswordSchema,
} from "../../src/schemas/auth.schema";

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

  // Perhatikan: tanpa .withMessage(), persis seperti route aslinya.
  app.put(
    "/password",
    body("password").not().isEmpty(),
    ErrorHelper.intercept,
    balas
  );

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/login", validate(loginSchema), balas);
  app.put("/password", validate(updatePasswordSchema), balas);
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

describe("PUT /password", () => {
  it("menerima sandi yang terisi", async () => {
    const h = await keduanya("put", "/password", { password: "sandibaru" });
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("membiarkan userId dari authMiddleware lewat tanpa dipermasalahkan", async () => {
    const h = await keduanya("put", "/password", {
      userId: 7,
      password: "sandibaru",
    });
    expect(h.baru.status).toBe(200);
  });
});

/**
 * PERUBAHAN PERILAKU YANG DISENGAJA.
 *
 * Rantai lama pada PUT /password tidak memasang .withMessage(), sehingga
 * express-validator memakai pesan bawaannya: teks "Invalid value" yang tidak
 * berasal dari ErrorList. Setelah ErrorList berisi key i18n, pesan itu menjadi
 * satu-satunya balasan galat yang tidak bisa diterjemahkan frontend.
 *
 * Statusnya tetap 400; hanya isi badannya yang berubah.
 */
describe("Perbedaan yang disengaja: pesan bawaan diganti key i18n", () => {
  it("lama membalas teks bawaan express-validator", async () => {
    const res = await request(lama).put("/password").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("Invalid value");
  });

  it("baru membalas key i18n dengan status yang sama", async () => {
    const res = await request(baru).put("/password").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Password is required"]);
  });
});
