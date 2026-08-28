import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";
import AuditLogController from "../../src/controllers/audit-log.controller";
import { validate } from "../../src/utils/validate.helper";
import { queryAuditLogSchema } from "../../src/schemas/audit-log.schema";

/**
 * GET /audit-logs.
 *
 * Seluruh penyaringnya opsional: halaman aktivitas dibuka polos lebih dulu,
 * baru dipersempit. Yang diuji terutama adalah bagaimana teks pada req.query
 * berubah menjadi penyaring — di sanalah kekeliruan paling mudah lewat, karena
 * nilai yang salah bentuk tidak menimbulkan galat, hanya mengubah diam-diam
 * baris mana yang ikut terbaca.
 */

function repositoriTiruan() {
  return {
    fetch: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  };
}

function app(r: ReturnType<typeof repositoriTiruan>) {
  const c = new AuditLogController(r as never);
  const a = express();
  a.use(express.json());
  a.get("/", validate(queryAuditLogSchema, "query"), c.fetch);
  return a;
}

describe("Saringan hanya-pengguna", () => {
  it("userOnly=true diteruskan sebagai true", async () => {
    const r = repositoriTiruan();
    const res = await request(app(r)).get("/?userOnly=true");

    expect(res.status).toBe(200);
    expect(r.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ userOnly: true }),
    );
  });

  it("userOnly=1 diperlakukan sama dengan true", async () => {
    const r = repositoriTiruan();
    await request(app(r)).get("/?userOnly=1");

    expect(r.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ userOnly: true }),
    );
  });

  it("tanpa userOnly berarti seluruh jejak, termasuk pekerjaan latar", async () => {
    const r = repositoriTiruan();
    await request(app(r)).get("/");

    expect(r.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ userOnly: false }),
    );
  });
});

describe("Nilai bawaan", () => {
  it("tanpa penyaring memakai halaman 1 dan 25 baris", async () => {
    const r = repositoriTiruan();
    const res = await request(app(r)).get("/");

    expect(res.status).toBe(200);
    expect(r.fetch).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      entity: null,
      entityID: null,
      userID: null,
      dateFrom: null,
      dateTo: null,
      userOnly: false,
    });
  });

  it("membalas bentuk { data, total }", async () => {
    const r = repositoriTiruan();
    r.fetch.mockResolvedValue({
      data: [{ id: 1, entity: "customer", action: "create" }],
      total: 91,
    });

    const res = await request(app(r)).get("/");

    // Halaman aktivitas membaca res.data dan res.total; bentuk lain membuatnya
    // menampilkan tabel kosong tanpa galat apa pun.
    expect(res.body.total).toBe(91);
    expect(res.body.data).toHaveLength(1);
  });
});

describe("Penyaring", () => {
  it("meneruskan entity dan halaman apa adanya", async () => {
    const r = repositoriTiruan();
    await request(app(r)).get(
      "/?page=3&page_size=10&entity=sales_invoice_code"
    );

    expect(r.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 3,
        pageSize: 10,
        entity: "sales_invoice_code",
      })
    );
  });

  it("userID tunggal menjadi larik satu anggota", async () => {
    const r = repositoriTiruan();
    await request(app(r)).get("/?userID=7");

    expect(r.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ userID: [7] })
    );
  });

  it("userID berulang menjadi larik berisi semuanya", async () => {
    const r = repositoriTiruan();
    await request(app(r)).get("/?userID=7&userID=9");

    expect(r.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ userID: [7, 9] })
    );
  });

  it("tanggal dibaca sebagai tanggal lokal, bukan UTC", async () => {
    const r = repositoriTiruan();
    await request(app(r)).get("/?dateFrom=2026-08-14");

    /*
      new Date("2026-08-14") tanpa jam diperlakukan sebagai UTC, sehingga di
      zona waktu Indonesia ia bergeser ke 14 Agustus jam 07:00 — dan seluruh
      kejadian pagi hari itu terbuang dari hasil. Menambahkan T00:00:00 membuat
      peramban maupun Node membacanya sebagai tengah malam waktu setempat.
    */
    const arg = r.fetch.mock.calls[0][0];
    expect(arg.dateFrom.getHours()).toBe(0);
    expect(arg.dateFrom.getDate()).toBe(14);
  });
});

describe("Penolakan", () => {
  it("page nol ditolak", async () => {
    const res = await request(app(repositoriTiruan())).get("/?page=0");
    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Parameter error"]);
  });

  it("page_size melebihi 100 ditolak", async () => {
    // Batasnya ditetapkan di server, bukan dipercayakan pada frontend: tanpa
    // itu satu permintaan bisa menarik seluruh isi tabel jejak.
    const res = await request(app(repositoriTiruan())).get("/?page_size=5000");
    expect(res.status).toBe(400);
  });

  it("tanggal berbentuk salah ditolak", async () => {
    const res = await request(app(repositoriTiruan())).get(
      "/?dateFrom=14-08-2026"
    );
    expect(res.status).toBe(400);
  });

  it("userID bukan angka ditolak", async () => {
    const res = await request(app(repositoriTiruan())).get("/?userID=abc");
    expect(res.status).toBe(400);
  });

  it("membalas 500 bila repository gagal", async () => {
    const r = repositoriTiruan();
    r.fetch.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r)).get("/");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});
