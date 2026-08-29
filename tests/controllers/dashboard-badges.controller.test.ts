import express from "express";
import request from "supertest";

/**
 * Lencana menu — berapa pekerjaan yang masih menunggu orang.
 *
 * Yang diuji di sini bukan angkanya, melainkan BENTUK dan ONGKOSNYA: keempat
 * kunci selalu ada, dan hitungan yang mahal tidak diulang hanya karena
 * hitungan yang murah kedaluwarsa.
 */

/* Redis ditiru supaya uji tidak bergantung ada-tidaknya Redis di mesin ini. */
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

/** Dashboard tiruan dengan kedua metode lencana; keduanya bisa diatur. */
function dashboardTiruan(pending: unknown = {}, stok = 0) {
  return {
    fetchPendingCounts: jest.fn().mockResolvedValue(pending),
    fetchProblematicStockCount: jest.fn().mockResolvedValue(stok),
  };
}

function app(dashboard: unknown) {
  const c = new DashboardController(
    dashboard as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never
  );
  const a = express();
  a.use(express.json());
  a.get("/badges", c.fetchBadges);
  return a;
}

beforeEach(() => {
  cacheAmbil.mockReset().mockResolvedValue(null);
  cacheSimpan.mockReset().mockResolvedValue("OK");
});

describe("GET /dashboard/badges", () => {
  it("membalas keempat hitungan", async () => {
    const dashboard = dashboardTiruan(
      { overpayment: 1, goodReceipt: 7, adjustment: 0 },
      42
    );

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
    const dashboard = dashboardTiruan(
      { overpayment: 0, goodReceipt: 0, adjustment: 0 },
      0
    );

    const res = await request(app(dashboard)).get("/badges");

    expect(Object.keys(res.body).sort()).toEqual([
      "adjustment",
      "goodReceipt",
      "overpayment",
      "stock",
    ]);
  });

  it("membalas 500 ketika repository gagal", async () => {
    const dashboard = dashboardTiruan();
    dashboard.fetchPendingCounts.mockRejectedValue(new Error("gagal"));

    const res = await request(app(dashboard)).get("/badges");

    expect(res.status).toBe(500);
  });
});

/**
 * DUA simpanan dengan umur berbeda, bukan satu.
 *
 * Tiga hitungan dokumen murah dan harus segera menyusul kenyataan: penerimaan
 * yang baru di-acc mesti hilang dari lencana dalam hitungan detik, kalau tidak
 * orang mengira klik-nya tidak jadi.
 *
 * Hitungan stok memindai seluruh tabel barang — ambangnya membandingkan dua
 * kolom pada tabel berbeda, dan tidak ada indeks yang bisa menolong. Ia juga
 * tidak berubah dari menit ke menit.
 *
 * Satu umur untuk keduanya pasti merugikan salah satunya.
 */
describe("Cache lencana", () => {
  it("memakai simpanan tanpa menyentuh basis data", async () => {
    const dashboard = dashboardTiruan();
    cacheAmbil.mockImplementation((kunci: string) =>
      Promise.resolve(
        kunci === "lencana:menu"
          ? JSON.stringify({ overpayment: 5, goodReceipt: 0, adjustment: 0 })
          : JSON.stringify({ stock: 3 })
      )
    );

    const res = await request(app(dashboard)).get("/badges");

    expect(res.body.overpayment).toBe(5);
    expect(res.body.stock).toBe(3);
    expect(dashboard.fetchPendingCounts).not.toHaveBeenCalled();
    expect(dashboard.fetchProblematicStockCount).not.toHaveBeenCalled();
  });

  it("menyimpan dua kunci terpisah, dan stok berumur lebih panjang", async () => {
    const dashboard = dashboardTiruan(
      { overpayment: 1, goodReceipt: 2, adjustment: 3 },
      4
    );

    await request(app(dashboard)).get("/badges");

    const umur = Object.fromEntries(
      cacheSimpan.mock.calls.map((c: any[]) => [c[0], c[1]])
    );
    expect(Object.keys(umur).sort()).toEqual(["lencana:menu", "lencana:stok"]);
    expect(umur["lencana:stok"]).toBeGreaterThan(umur["lencana:menu"]);
  });

  /*
    Inilah gunanya dipisah: lencana dokumen yang kedaluwarsa tiap setengah
    menit TIDAK boleh menyeret hitungan stok ikut dihitung ulang.
  */
  it("tidak menghitung ulang stok ketika simpanannya masih ada", async () => {
    const dashboard = dashboardTiruan({
      overpayment: 1,
      goodReceipt: 2,
      adjustment: 3,
    });
    cacheAmbil.mockImplementation((kunci: string) =>
      Promise.resolve(
        kunci === "lencana:stok" ? JSON.stringify({ stock: 9 }) : null
      )
    );

    const res = await request(app(dashboard)).get("/badges");

    expect(res.body.stock).toBe(9);
    expect(dashboard.fetchPendingCounts).toHaveBeenCalled();
    expect(dashboard.fetchProblematicStockCount).not.toHaveBeenCalled();
  });
});
