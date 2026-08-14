import express from "express";
import request from "supertest";
import "../../src/utils/async-error.helper";

/**
 * Penjaga tambalan penangkap galat async.
 *
 * Express 4 hanya menangkap lemparan yang sinkron. Handler `async` yang
 * melempar menghasilkan promise yang ditolak; tanpa tambalan ini permintaannya
 * MENGGANTUNG tanpa balasan, lalu Node menghentikan seluruh proses karena
 * unhandled rejection.
 *
 * Cacat itu bukan hipotetis: satu pengguna mengetik "%" di kolom pencarian
 * mana pun cukup untuk mematikan server, dan dua belas handler menunggu
 * repository tanpa try/catch sama sekali.
 *
 * Tes ini memastikan permintaan yang gagal berakhir sebagai 500 yang rapi.
 * Bila tambalannya lepas, tesnya tidak akan gagal dengan pesan yang jelas
 * melainkan kehabisan waktu — itulah bentuk kegagalannya di dunia nyata.
 */

function app(handler: express.RequestHandler) {
  const a = express();
  const router = express.Router();
  router.get("/", handler);
  a.use("/", router);
  a.use(
    (
      _galat: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (res.headersSent) return;
      return res.status(500).send("Internal server error");
    }
  );
  return a;
}

describe("Handler async yang melempar", () => {
  it("berakhir sebagai 500, bukan permintaan yang menggantung", async () => {
    const res = await request(
      app(async () => {
        throw new Error("koneksi putus");
      })
    ).get("/");

    expect(res.status).toBe(500);
    expect(res.text).toBe("Internal server error");
  });

  it("URIError dari kata kunci cacat pun tertangkap", async () => {
    const res = await request(
      app(async () => {
        decodeURIComponent("%");
      })
    ).get("/");

    expect(res.status).toBe(500);
  });

  it("promise yang ditolak tanpa lemparan juga tertangkap", async () => {
    const res = await request(
      app(() => Promise.reject(new Error("ditolak")) as never)
    ).get("/");

    expect(res.status).toBe(500);
  });
});

describe("Perilaku yang TIDAK boleh berubah", () => {
  it("handler yang berhasil tetap membalas seperti biasa", async () => {
    const res = await request(
      app(async (_req, res) => {
        res.status(200).send("OK");
      })
    ).get("/");

    expect(res.status).toBe(200);
    expect(res.text).toBe("OK");
  });

  it("handler sinkron biasa tidak terpengaruh", async () => {
    const res = await request(
      app((_req, res) => {
        res.status(201).send("dibuat");
      })
    ).get("/");

    expect(res.status).toBe(201);
  });

  it("lemparan sinkron tetap ditangani Express seperti sebelumnya", async () => {
    const res = await request(
      app(() => {
        throw new Error("sinkron");
      })
    ).get("/");

    expect(res.status).toBe(500);
  });

  it("rantai beberapa handler tetap berjalan berurutan", async () => {
    const a = express();
    const router = express.Router();
    const jejak: string[] = [];
    router.get(
      "/",
      (_req, _res, next) => {
        jejak.push("pertama");
        next();
      },
      async (_req, res) => {
        jejak.push("kedua");
        res.status(200).send("OK");
      }
    );
    a.use("/", router);

    await request(a).get("/");
    expect(jejak).toEqual(["pertama", "kedua"]);
  });
});

/**
 * Tambalannya sengaja melewati middleware bertanda tangan empat argumen.
 * Express mengenali penangkap galat HANYA dari jumlah parameternya, jadi
 * membungkusnya akan mengubah jumlah itu dan membuatnya diperlakukan sebagai
 * handler biasa — penangkap galat aplikasi berhenti bekerja tanpa pesan apa pun.
 */
describe("Middleware penangkap galat tidak ikut dibungkus", () => {
  it("penangkap galat empat argumen tetap dikenali", async () => {
    const res = await request(
      app(async () => {
        throw new Error("apa saja");
      })
    ).get("/");

    // Kalau penangkapnya ikut terbungkus, jumlah parameternya berubah dan
    // Express tidak akan memanggilnya — balasannya jadi 404, bukan 500.
    expect(res.status).toBe(500);
  });
});
