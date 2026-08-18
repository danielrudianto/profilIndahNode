import express from "express";
import request from "supertest";

/**
 * Perilaku DashboardController.
 *
 * Mengikuti acuan company.controller.test.ts: repository disuntikkan lewat
 * konstruktor sebagai objek berisi jest.fn(). GET / (dashboard 9c) hanya
 * menyusun pasangan tanggal lalu meneruskan hasil ringkasan() apa adanya —
 * maka yang diuji adalah TANGGAL yang diteruskan dan kejujuran penerusannya.
 * Dua handler peran lama (sales, purchasing) tetap diuji seperti semula.
 *
 * SocketHelper tetap ditiru mengikuti pola berkas acuan, supaya getIO() yang
 * belum diinisialisasi tidak melempar bila kelak dashboard ikut berkirim
 * peristiwa.
 */

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

function dashboardTiruan() {
  return { ringkasan: jest.fn() };
}
function fakturTiruan() {
  return { fetchByDateRange: jest.fn() };
}
function penerimaanTiruan() {
  return { fetchByDateRange: jest.fn() };
}
function promosiTiruan() {
  return { countActive: jest.fn().mockResolvedValue(0) };
}

type Dashboard = ReturnType<typeof dashboardTiruan>;
type Faktur = ReturnType<typeof fakturTiruan>;
type Penerimaan = ReturnType<typeof penerimaanTiruan>;
type Promosi = ReturnType<typeof promosiTiruan>;

function app(
  faktur: Faktur,
  penerimaan: Penerimaan,
  promosi: Promosi = promosiTiruan(),
  dashboard: Dashboard = dashboardTiruan()
) {
  const c = new DashboardController(
    dashboard as never,
    faktur as never,
    penerimaan as never,
    promosi as never
  );
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.get("/", c.fetch);
  a.post("/sales", c.fetchSalesDashboard);
  a.post("/purchasing", c.fetchPurchaseDashboard);
  return a;
}

/** Ringkasan penjualan sebagaimana bentuk kembalian repository. */
function penjualan(nilai: number) {
  return {
    value: nilai,
    discount: 100,
    delivery: 50,
    service: 25,
    salesInvoiceCount: 3,
    customerCount: 2,
  };
}

/** Sebaris penerimaan barang; repository mengembalikan larik seperti ini. */
function penerimaanBarang(nilai: number, potongan: number) {
  return {
    value: nilai,
    discount: potongan,
    goodReceiptCount: 1,
    company_id: 1,
  };
}

const hariIni = new Date();
const kemarin = new Date();
kemarin.setDate(kemarin.getDate() - 1);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET / — dashboard administrator 9c", () => {
  const isi = {
    sales: { value: 1_000, count: 2, unpaid: 1 },
    purchase: { value: 500, count: 1 },
    deposit: { value: 0, count: 0 },
    promotion: { count: 3, endingSoon: 1, rows: [] },
    week: [],
    invoices: [],
  };

  it("meneruskan hasil ringkasan() apa adanya", async () => {
    const dashboard = dashboardTiruan();
    dashboard.ringkasan.mockResolvedValue(isi);

    const res = await request(
      app(fakturTiruan(), penerimaanTiruan(), promosiTiruan(), dashboard)
    ).get("/");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(isi);
    expect(dashboard.ringkasan).toHaveBeenCalledTimes(1);
  });

  it("memakai ?date sebagai hari ini, dan mundur enam hari untuk awal minggu", async () => {
    const dashboard = dashboardTiruan();
    dashboard.ringkasan.mockResolvedValue(isi);

    await request(
      app(fakturTiruan(), penerimaanTiruan(), promosiTiruan(), dashboard)
    ).get("/?date=2025-06-14");

    const [ini, lalu] = dashboard.ringkasan.mock.calls[0] as Date[];
    expect(ini.toISOString().slice(0, 10)).toBe("2025-06-14");
    expect(lalu.toISOString().slice(0, 10)).toBe("2025-06-08");
  });

  it("tanpa ?date jatuh ke tanggal server, tetap berjarak enam hari", async () => {
    const dashboard = dashboardTiruan();
    dashboard.ringkasan.mockResolvedValue(isi);

    await request(
      app(fakturTiruan(), penerimaanTiruan(), promosiTiruan(), dashboard)
    ).get("/");

    const [ini, lalu] = dashboard.ringkasan.mock.calls[0] as Date[];
    expect(ini.toDateString()).toBe(hariIni.toDateString());
    const selisihHari = Math.round(
      (ini.getTime() - lalu.getTime()) / 86_400_000
    );
    expect(selisihHari).toBe(6);
  });

  it("membalas 500 bila ringkasan() gagal", async () => {
    const dashboard = dashboardTiruan();
    dashboard.ringkasan.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(
      app(fakturTiruan(), penerimaanTiruan(), promosiTiruan(), dashboard)
    ).get("/");

    expect(res.status).toBe(500);
  });

  it("tidak menyentuh repository penjualan, pembelian, maupun promosi", async () => {
    const faktur = fakturTiruan();
    const penerimaan = penerimaanTiruan();
    const promosi = promosiTiruan();
    const dashboard = dashboardTiruan();
    dashboard.ringkasan.mockResolvedValue(isi);

    await request(app(faktur, penerimaan, promosi, dashboard)).get("/");

    expect(faktur.fetchByDateRange).not.toHaveBeenCalled();
    expect(penerimaan.fetchByDateRange).not.toHaveBeenCalled();
    expect(promosi.countActive).not.toHaveBeenCalled();
  });
});

describe("POST /sales — ringkasan untuk divisi penjualan", () => {
  function siapkan() {
    const faktur = fakturTiruan();
    const penerimaan = penerimaanTiruan();
    const promosi = promosiTiruan();
    faktur.fetchByDateRange
      .mockResolvedValueOnce(penjualan(100))
      .mockResolvedValueOnce(penjualan(200))
      .mockResolvedValueOnce(penjualan(300))
      .mockResolvedValueOnce(penjualan(400));
    promosi.countActive.mockResolvedValue(2);
    return { faktur, penerimaan, promosi };
  }

  it("membalas 200 berisi penjualan harian, bulanan, dan jumlah promosi", async () => {
    const { faktur, penerimaan, promosi } = siapkan();

    const res = await request(app(faktur, penerimaan, promosi)).post("/sales");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      sales: { current: 100, previous: 200 },
      sales_month: { current: 300, previous: 400 },
      promotion: 2,
    });
  });

  it("tidak menyentuh repository pembelian maupun ringkasan 9c", async () => {
    const { faktur, penerimaan, promosi } = siapkan();
    const dashboard = dashboardTiruan();

    await request(app(faktur, penerimaan, promosi, dashboard)).post("/sales");

    expect(penerimaan.fetchByDateRange).not.toHaveBeenCalled();
    expect(dashboard.ringkasan).not.toHaveBeenCalled();
  });

  it("rentang bulan berjalan dimulai tanggal 1 dan berakhir di hari terakhir", async () => {
    const { faktur, penerimaan, promosi } = siapkan();

    await request(app(faktur, penerimaan, promosi)).post("/sales");

    const [awalBulan, akhirBulan] = faktur.fetchByDateRange.mock
      .calls[2] as Date[];
    const acuan = new Date();
    expect(awalBulan.getDate()).toBe(1);
    expect(awalBulan.getMonth()).toBe(acuan.getMonth());
    expect(awalBulan.getFullYear()).toBe(acuan.getFullYear());
    // Hari terakhir bulan ini = tanggal 0 bulan berikutnya.
    const hariTerakhir = new Date(
      acuan.getFullYear(),
      acuan.getMonth() + 1,
      0
    ).getDate();
    expect(akhirBulan.getDate()).toBe(hariTerakhir);
    expect(akhirBulan.getMonth()).toBe(acuan.getMonth());
  });

  it("rentang bulan lalu dimulai tanggal 1 bulan sebelumnya", async () => {
    const { faktur, penerimaan, promosi } = siapkan();

    await request(app(faktur, penerimaan, promosi)).post("/sales");

    const [awalLalu] = faktur.fetchByDateRange.mock.calls[3] as Date[];
    const acuan = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 1,
      1
    );
    expect(awalLalu.getDate()).toBe(1);
    expect(awalLalu.getMonth()).toBe(acuan.getMonth());
    expect(awalLalu.getFullYear()).toBe(acuan.getFullYear());
  });

  /**
   * CACAT: rentang "bulan lalu" ikut mencakup tanggal 1 bulan ini.
   *
   * Rentangnya ditulis `(lastMonth, thisMonth)` — dari tanggal 1 bulan lalu
   * sampai tanggal 1 bulan INI. Repository membandingkan dengan
   * `date BETWEEN ... AND ...` pada ketelitian tanggal (YYYYMMDD), dan BETWEEN
   * bersifat inklusif di kedua ujungnya. Jadi seluruh penjualan tanggal 1 bulan
   * berjalan dihitung DUA KALI: sekali sebagai bagian bulan ini, sekali lagi
   * sebagai bagian bulan lalu.
   *
   * Akibat bagi pengguna: pembanding "bulan lalu" di dashboard tidak tetap —
   * angkanya berubah pada tanggal 1 setiap bulan, lalu diam sampai bulan
   * berikutnya. Persentase pertumbuhan yang dihitung dari angka itu ikut salah,
   * dan salahnya paling besar justru pada awal bulan ketika angka bulan
   * berjalan masih kecil.
   *
   * Rentang bulan berjalan sendiri sudah benar: berakhir di hari terakhir
   * bulan ini, bukan di tanggal 1 bulan berikutnya.
   */
  it("CACAT: rentang bulan lalu berakhir pada tanggal 1 bulan ini, bukan hari terakhir bulan lalu", async () => {
    const { faktur, penerimaan, promosi } = siapkan();

    await request(app(faktur, penerimaan, promosi)).post("/sales");

    const [, akhirLalu] = faktur.fetchByDateRange.mock.calls[3] as Date[];
    const acuan = new Date();
    expect(akhirLalu.getDate()).toBe(1);
    expect(akhirLalu.getMonth()).toBe(acuan.getMonth());
    // Bandingkan dengan awal rentang bulan berjalan: keduanya PERSIS sama,
    // itulah tumpang tindihnya.
    const [awalBulan] = faktur.fetchByDateRange.mock.calls[2] as Date[];
    expect(akhirLalu.getTime()).toBe(awalBulan.getTime());
  });

  it("membalas 500 bila salah satu pemanggilan gagal", async () => {
    const faktur = fakturTiruan();
    const penerimaan = penerimaanTiruan();
    faktur.fetchByDateRange.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(faktur, penerimaan)).post("/sales");

    expect(res.status).toBe(500);
  });
});

describe("POST /purchasing — ringkasan untuk divisi pembelian", () => {
  function siapkan() {
    const faktur = fakturTiruan();
    const penerimaan = penerimaanTiruan();
    const promosi = promosiTiruan();
    penerimaan.fetchByDateRange
      .mockResolvedValueOnce([penerimaanBarang(100, 10)])
      .mockResolvedValueOnce([penerimaanBarang(200, 20)])
      .mockResolvedValueOnce([
        penerimaanBarang(300, 30),
        penerimaanBarang(400, 40),
      ])
      .mockResolvedValueOnce([penerimaanBarang(500, 50)]);
    promosi.countActive.mockResolvedValue(1);
    return { faktur, penerimaan, promosi };
  }

  it("membalas 200 berisi pembelian harian, bulanan, dan jumlah promosi", async () => {
    const { faktur, penerimaan, promosi } = siapkan();

    const res = await request(app(faktur, penerimaan, promosi)).post(
      "/purchasing"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      purchase: { current: 90, previous: 180 },
      // (300 - 30) + (400 - 40) = 630
      purchase_month: { current: 630, previous: 450 },
      promotion: 1,
    });
  });

  it("tidak menyentuh repository penjualan maupun ringkasan 9c", async () => {
    const { faktur, penerimaan, promosi } = siapkan();
    const dashboard = dashboardTiruan();

    await request(app(faktur, penerimaan, promosi, dashboard)).post(
      "/purchasing"
    );

    expect(faktur.fetchByDateRange).not.toHaveBeenCalled();
    expect(dashboard.ringkasan).not.toHaveBeenCalled();
  });

  /** Tumpang tindih tanggal 1 yang sama juga terjadi di sini. */
  it("CACAT: rentang bulan lalu ikut mencakup tanggal 1 bulan ini", async () => {
    const { faktur, penerimaan, promosi } = siapkan();

    await request(app(faktur, penerimaan, promosi)).post("/purchasing");

    const [awalBulan] = penerimaan.fetchByDateRange.mock.calls[2] as Date[];
    const [, akhirLalu] = penerimaan.fetchByDateRange.mock.calls[3] as Date[];
    expect(akhirLalu.getTime()).toBe(awalBulan.getTime());
  });

  it("membalas 500 bila repository gagal", async () => {
    const faktur = fakturTiruan();
    const penerimaan = penerimaanTiruan();
    penerimaan.fetchByDateRange.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(faktur, penerimaan)).post("/purchasing");

    expect(res.status).toBe(500);
  });
});
