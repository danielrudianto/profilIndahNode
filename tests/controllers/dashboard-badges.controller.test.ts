import express from "express";
import request from "supertest";

/**
 * Lencana menu — berapa pekerjaan yang masih menunggu orang.
 *
 * Yang diuji di sini bukan angkanya, melainkan BENTUKNYA: ketiga kunci selalu
 * ada dan selalu angka. Layar memakainya untuk memutuskan menampilkan lencana
 * atau tidak, dan kunci yang hilang membuatnya diam — persis kebalikan dari
 * gunanya.
 */

/* Cache lencana ditiru: uji ini menguji perilaku menghitung, bukan menyimpan. */
const cacheAmbil = jest.fn().mockResolvedValue(null);
const cacheSimpan = jest.fn().mockResolvedValue("OK");
jest.mock("../../src/utils/redis.helper", () => ({
  __esModule: true,
  redisClient: {
    get: (...a: unknown[]) => cacheAmbil(...a),
    setEx: (...a: unknown[]) => cacheSimpan(...a),
  },
  connectRedis: jest.fn(),
  REDIS_URL: "redis://tiruan",
}));

const kirimSocket = jest.fn();
jest.mock("../../src/utils/socket.helper", () => ({
  __esModule: true,
  default: class {
    constructor(
      public nama: string,
      public data: unknown
    ) {}
    create() {
      kirimSocket(this.nama, this.data);
    }
  },
}));

import DashboardController from "../../src/controllers/dashboard.controller";

function app(dashboard: unknown) {
  const c = new DashboardController(
    dashboard as never,
    {} as never,
    {} as never,
    {} as never
  );
  const a = express();
  a.use(express.json());
  a.get("/badges", c.fetchBadges);
  return a;
}

describe("GET /dashboard/badges", () => {
  it("membalas ketiga hitungan", async () => {
    const dashboard = {
      fetchBadgeCounts: jest
        .fn()
        .mockResolvedValue({ overpayment: 1, goodReceipt: 7, adjustment: 0, stock: 42 }),
    };

    const res = await request(app(dashboard)).get("/badges");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      overpayment: 1,
      goodReceipt: 7,
      adjustment: 0,
      stock: 42,
    });
  });

  /*
    Nol WAJIB ikut terkirim, bukan dihilangkan. Layar membedakan "tidak ada
    yang menunggu" dari "belum tahu", dan kunci yang hilang membuat keduanya
    tampak sama.
  */
  it("mengirim nol, bukan menghilangkan kuncinya", async () => {
    const dashboard = {
      fetchBadgeCounts: jest
        .fn()
        .mockResolvedValue({ overpayment: 0, goodReceipt: 0, adjustment: 0, stock: 0 }),
    };

    const res = await request(app(dashboard)).get("/badges");

    expect(Object.keys(res.body).sort()).toEqual([
      "adjustment",
      "goodReceipt",
      "overpayment",
      "stock",
    ]);
  });

  it("membalas 500 ketika repository gagal", async () => {
    const dashboard = {
      fetchBadgeCounts: jest.fn().mockRejectedValue(new Error("gagal")),
    };

    const res = await request(app(dashboard)).get("/badges");

    expect(res.status).toBe(500);
  });
});

/*
  Lencana diminta ulang oleh setiap layar yang terbuka, tiap menit. Tanpa
  cache bersama, ongkosnya berlipat mengikuti jumlah orang yang bekerja.
*/
describe("Cache lencana", () => {
  beforeEach(() => {
    cacheAmbil.mockReset().mockResolvedValue(null);
    cacheSimpan.mockReset().mockResolvedValue("OK");
  });

  it("memakai simpanan tanpa menyentuh basis data", async () => {
    const dashboard = { fetchBadgeCounts: jest.fn() };
    cacheAmbil.mockResolvedValue(
      JSON.stringify({ overpayment: 5, goodReceipt: 0, adjustment: 0, stock: 0 })
    );

    const res = await request(app(dashboard)).get("/badges");

    expect(res.body.overpayment).toBe(5);
    expect(dashboard.fetchBadgeCounts).not.toHaveBeenCalled();
  });

  it("menyimpan hasilnya sesudah dihitung", async () => {
    const dashboard = {
      fetchBadgeCounts: jest
        .fn()
        .mockResolvedValue({ overpayment: 1, goodReceipt: 2, adjustment: 3, stock: 4 }),
    };

    await request(app(dashboard)).get("/badges");

    expect(cacheSimpan).toHaveBeenCalledWith(
      "lencana:menu",
      expect.any(Number),
      expect.any(String)
    );
  });
});
