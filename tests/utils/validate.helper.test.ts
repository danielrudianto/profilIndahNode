import express from "express";
import request from "supertest";
import { z } from "zod";
import { validate } from "../../src/utils/validate.helper";

/**
 * Perilaku middleware validate() itu sendiri.
 *
 * Sejauh ini ia hanya teruji secara tidak langsung lewat dua puluh empat berkas
 * tes skema. Itu membuktikan skemanya benar, bukan jembatannya: sifat-sifat
 * yang dijaga di sini — bentuk balasan, sumber yang dibaca, dan keputusan untuk
 * TIDAK menimpa permintaan — tidak akan gagal walau salah satunya rusak, karena
 * tes skema hanya memeriksa status dan kalimat galat.
 *
 * Ketiganya bukan detail: bentuk balasan menentukan apa yang tampil di layar,
 * dan penimpaan req.body akan menghapus identitas pemanggil tanpa galat apa pun.
 */

const skema = z.object({
  name: z.string({ error: "name.required" }),
  age: z.number({ error: "age.required" }).min(1, "age.tooSmall"),
});

function app(sumber?: "body" | "query" | "params") {
  const a = express();
  a.use(express.json());
  const mw = sumber ? validate(skema, sumber) : validate(skema);
  a.post("/uji", mw, (req, res) => res.status(200).json(req.body));
  a.get("/uji", mw, (req, res) => res.status(200).json(req.query));
  a.get("/uji/:name/:age", mw, (req, res) => res.status(200).json(req.params));
  return a;
}

describe("Bentuk balasan galat", () => {
  it("membalas 400 dengan string mentah, bukan JSON", async () => {
    const res = await request(app()).post("/uji").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("name.required");
    // Badan berupa teks biasa. Kalau ini berubah menjadi JSON, frontend akan
    // menampilkan seluruh objeknya kepada pengguna.
    expect(res.headers["content-type"]).toMatch(/text\/html/);
  });

  it("mengirim pesan bidang PERTAMA yang gagal, bukan seluruhnya", async () => {
    const res = await request(app()).post("/uji").send({});
    expect(res.text).toBe("name.required");
    expect(res.text).not.toContain("age");
  });

  it("urutan bidang di skema menentukan pesan yang muncul", async () => {
    const terbalik = z.object({
      age: z.number({ error: "age.required" }),
      name: z.string({ error: "name.required" }),
    });
    const a = express();
    a.use(express.json());
    a.post("/uji", validate(terbalik), (_q, s) => s.status(200).send("OK"));
    const res = await request(a).post("/uji").send({});
    expect(res.text).toBe("age.required");
  });

  it("meneruskan permintaan yang sah ke handler berikutnya", async () => {
    const res = await request(app())
      .post("/uji")
      .send({ name: "Budi", age: 30 });
    expect(res.status).toBe(200);
  });
});

describe("Sumber yang dibaca", () => {
  it("membaca req.body secara bawaan", async () => {
    const res = await request(app()).post("/uji").send({ name: "B", age: 5 });
    expect(res.status).toBe(200);
  });

  it("membaca req.query bila diminta", async () => {
    const a = express();
    const skemaKueri = z.object({ q: z.string({ error: "q.required" }) });
    a.get("/uji", validate(skemaKueri, "query"), (_q, s) =>
      s.status(200).send("OK")
    );
    expect((await request(a).get("/uji?q=baja")).status).toBe(200);
    expect((await request(a).get("/uji")).text).toBe("q.required");
  });

  it("membaca req.params bila diminta", async () => {
    const a = express();
    const skemaParam = z.object({
      id: z.string().regex(/^\d+$/, "id.numeric"),
    });
    a.get("/uji/:id", validate(skemaParam, "params"), (_q, s) =>
      s.status(200).send("OK")
    );
    expect((await request(a).get("/uji/12")).status).toBe(200);
    expect((await request(a).get("/uji/abc")).text).toBe("id.numeric");
  });
});

/**
 * Sifat yang paling mudah rusak tanpa disadari.
 *
 * Bentuk paling lazim menulis middleware ini adalah menimpa `req.body` dengan
 * hasil parse supaya controller menerima nilai yang sudah bertipe. Di repo ini
 * itu justru berbahaya: middleware autentikasi menulis `userId` dan `role` ke
 * `req.body`, dan keduanya BUKAN bagian dari skema mana pun. Skema Zod
 * membuang kunci yang tidak dikenalnya, jadi menimpa badan permintaan akan
 * menghapus identitas pemanggil — diam-diam, tanpa galat, dan controller
 * mengira permintaannya anonim.
 */
describe("Permintaan tidak boleh ditimpa hasil parse", () => {
  it("membiarkan kunci di luar skema tetap ada di req.body", async () => {
    const res = await request(app())
      .post("/uji")
      .send({ name: "Budi", age: 30, userId: 7, role: 4 });

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(7);
    expect(res.body.role).toBe(4);
  });

  it("tidak mengubah tipe nilai yang lolos", async () => {
    const skemaUbah = z.object({
      n: z.coerce.number(),
    });
    const a = express();
    a.use(express.json());
    a.post("/uji", validate(skemaUbah), (req, res) =>
      res.status(200).json(req.body)
    );

    const res = await request(a).post("/uji").send({ n: "5" });
    // Skema memaksa ke angka, tetapi req.body harus tetap membawa teks aslinya.
    expect(res.body.n).toBe("5");
  });
});
