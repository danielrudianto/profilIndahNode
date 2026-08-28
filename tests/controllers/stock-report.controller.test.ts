import express from "express";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import {
  companyPeriodQuerySchema,
  inventoryQuerySchema,
} from "../../src/schemas/report.schema";
import request from "supertest";

/**
 * Perilaku StockReportController.
 *
 * Mengikuti acuan company.controller.test.ts: keenam repository disuntikkan
 * lewat konstruktor sebagai objek berisi jest.fn(). Controller ini menyusun
 * hasil beberapa repository menjadi satu balasan, jadi yang diuji adalah nilai
 * yang diteruskan ke tiap repository dan cara hasilnya digabungkan.
 *
 * SocketHelper tetap ditiru mengikuti pola berkas acuan supaya getIO() yang
 * belum diinisialisasi tidak melempar.
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

import StockReportController from "../../src/controllers/stock-report.controller";

function stockInTiruan() {
  return { calculateAsOf: jest.fn() };
}
function produkTiruan() {
  return { fetchOutputReport: jest.fn() };
}
function stokProdukTiruan() {
  return { fetchOutputReport: jest.fn() };
}
function stockOutTiruan() {
  return {
    fetchCompanyOutputSummary: jest.fn(),
    fetchCompanyOutputDetail: jest.fn(),
    fetchCompanyRevenue: jest.fn().mockResolvedValue({ sales: 0, hpp: 0 }),
  };
}
function penerimaanTiruan() {
  return {
    fetchCompanySummary: jest.fn(),
    fetchCompanyDetail: jest.fn(),
    fetchCompanyPurchaseValue: jest
      .fn()
      .mockResolvedValue({ value: 0, documents: 0 }),
  };
}
function penyesuaianTiruan() {
  return {
    fetchCompanySummary: jest.fn(),
    fetchCompanyDetail: jest.fn(),
  };
}
function perusahaanTiruan() {
  return { fetchByID: jest.fn() };
}
function bebanTiruan() {
  return { fetchCompanyExpenses: jest.fn().mockResolvedValue([]) };
}

type Semua = {
  stockIn: ReturnType<typeof stockInTiruan>;
  produk: ReturnType<typeof produkTiruan>;
  stokProduk: ReturnType<typeof stokProdukTiruan>;
  stockOut: ReturnType<typeof stockOutTiruan>;
  penerimaan: ReturnType<typeof penerimaanTiruan>;
  penyesuaian: ReturnType<typeof penyesuaianTiruan>;
  perusahaan: ReturnType<typeof perusahaanTiruan>;
  beban: ReturnType<typeof bebanTiruan>;
};

function repositoryTiruan(): Semua {
  return {
    stockIn: stockInTiruan(),
    produk: produkTiruan(),
    stokProduk: stokProdukTiruan(),
    stockOut: stockOutTiruan(),
    penerimaan: penerimaanTiruan(),
    penyesuaian: penyesuaianTiruan(),
    perusahaan: perusahaanTiruan(),
    beban: bebanTiruan(),
  };
}

function buatController(r: Semua) {
  return new StockReportController(
    r.stockIn as never,
    r.produk as never,
    r.stokProduk as never,
    r.stockOut as never,
    r.penerimaan as never,
    r.penyesuaian as never,
    r.perusahaan as never,
    r.beban as never
  );
}

function app(r: Semua) {
  const c = buatController(r);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  // validate ikut dipasang persis seperti route aslinya — penolakan
  // tanggal rusak memang tanggung jawab lapisan skema, bukan controller.
  a.get(
    "/inventory",
    validate(inventoryQuerySchema, "query"),
    c.fetchInventoryReport
  );
  a.post("/output", c.fetchOutputReport);
  a.get(
    "/company",
    validate(companyPeriodQuerySchema, "query"),
    c.fetchCompanyReport
  );
  return a;
}

/** Sebaris produk sebagaimana bentuk kembalian ProductRepository. */
function produk(id: number, referensi: string) {
  return {
    id: id,
    reference: referensi,
    description: `Produk ${id}`,
    unit: "PCS",
    report: {
      good_receipt: 10,
      adjustment_case_found: 0,
      adjustment_case_lost: 0,
      sales_return: 0,
      sales_invoice: 4,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /inventory — nilai persediaan per perusahaan", () => {
  const hasil = {
    companies: [{ id: 1, company: "PT Indah", value: 5_000_000 }],
    unassigned: { count: 2, value: 150_000 },
  };

  it("membalas 200 dan meneruskan hasil repository apa adanya", async () => {
    const r = repositoryTiruan();
    r.stockIn.calculateAsOf.mockResolvedValue(hasil);

    const res = await request(app(r)).get("/inventory");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(hasil);
    // Tanpa parameter, tanggalnya hari ini.
    const tanggal = r.stockIn.calculateAsOf.mock.calls[0][0] as Date;
    expect(tanggal).toBeInstanceOf(Date);
    expect(Math.abs(tanggal.getTime() - Date.now())).toBeLessThan(60_000);
  });

  it("meneruskan tanggal dari query string apa adanya", async () => {
    const r = repositoryTiruan();
    r.stockIn.calculateAsOf.mockResolvedValue(hasil);

    const res = await request(app(r)).get("/inventory?date=2026-03-31");

    expect(res.status).toBe(200);
    expect(r.stockIn.calculateAsOf).toHaveBeenCalledWith(
      new Date("2026-03-31")
    );
  });

  it("menolak tanggal yang tidak terbaca dengan 400", async () => {
    const r = repositoryTiruan();

    const res = await request(app(r)).get("/inventory?date=kemarin-sore");

    expect(res.status).toBe(400);
    expect(r.stockIn.calculateAsOf).not.toHaveBeenCalled();
  });

  /**
   * Dulu CACAT: handler di berkas ini menutup dengan
   * `res.status(500).send(error)` — `message` yang non-enumerable hilang,
   * sementara properti galat Prisma (`code`, `meta`) justru bocor ke
   * peramban. Kini kegagalan dibalas key i18n tanpa rincian internal.
   */
  it("membalas key i18n saat kueri gagal, tanpa membocorkan galatnya", async () => {
    const r = repositoryTiruan();
    r.stockIn.calculateAsOf.mockRejectedValue(
      Object.assign(new Error("kueri gagal"), {
        code: "P2010",
        meta: { table: "stock_in" },
      })
    );

    const res = await request(app(r)).get("/inventory");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(res.text).not.toContain("P2010");
  });
});

describe("POST /output — laporan keluar-masuk barang", () => {
  function siapkan(r: Semua) {
    r.produk.fetchOutputReport.mockResolvedValue({
      brands: [{ id: 1, name: "MEREK A" }],
      types: [{ id: 2, name: "TIPE B" }],
      data: [produk(11, "REF-11"), produk(12, "REF-12")],
    });
    r.stokProduk.fetchOutputReport.mockResolvedValue([
      { product_id: 11, stock: 25 },
      { product_id: 12, stock: 0 },
    ]);
  }

  it("membalas 200 berisi merek, tipe, dan data produk beserta stoknya", async () => {
    const r = repositoryTiruan();
    siapkan(r);

    const res = await request(app(r))
      .post("/output")
      .send({ brand: [1], type: [2], month: 3, year: 2026, group: "brand" });

    expect(res.status).toBe(200);
    expect(res.body.brands).toEqual([{ id: 1, name: "MEREK A" }]);
    expect(res.body.types).toEqual([{ id: 2, name: "TIPE B" }]);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual({ ...produk(11, "REF-11"), stock: 25 });
  });

  it("meneruskan penyaring dari badan permintaan apa adanya", async () => {
    const r = repositoryTiruan();
    siapkan(r);

    await request(app(r))
      .post("/output")
      .send({ brand: [1, 5], type: [2], month: 3, year: 2026, group: "type" });

    expect(r.produk.fetchOutputReport).toHaveBeenCalledWith({
      month: 3,
      year: 2026,
      brand: [1, 5],
      type: [2],
      group: "type",
    });
  });

  it("mencari stok hanya untuk produk yang muncul di laporan", async () => {
    const r = repositoryTiruan();
    siapkan(r);

    await request(app(r))
      .post("/output")
      .send({ brand: [1], type: [2], month: 3, year: 2026, group: "brand" });

    expect(r.stokProduk.fetchOutputReport).toHaveBeenCalledWith({
      product_id: [11, 12],
      month: 3,
      year: 2026,
    });
  });

  it("memberi stok 0 pada produk yang tidak punya baris kartu stok", async () => {
    const r = repositoryTiruan();
    r.produk.fetchOutputReport.mockResolvedValue({
      brands: [],
      types: [],
      data: [produk(11, "REF-11"), produk(99, "REF-99")],
    });
    r.stokProduk.fetchOutputReport.mockResolvedValue([
      { product_id: 11, stock: 7 },
    ]);

    const res = await request(app(r))
      .post("/output")
      .send({ brand: [], type: [], month: 3, year: 2026, group: "brand" });

    expect(res.body.data[0].stock).toBe(7);
    expect(res.body.data[1].stock).toBe(0);
  });

  it("laporan kosong tetap membalas 200 dengan daftar kosong", async () => {
    const r = repositoryTiruan();
    r.produk.fetchOutputReport.mockResolvedValue({
      brands: [],
      types: [],
      data: [],
    });
    r.stokProduk.fetchOutputReport.mockResolvedValue([]);

    const res = await request(app(r))
      .post("/output")
      .send({ brand: [], type: [], month: 3, year: 2026, group: "brand" });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(r.stokProduk.fetchOutputReport).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: [] })
    );
  });

  it("membalas 500 bila pencarian stok gagal", async () => {
    const r = repositoryTiruan();
    r.produk.fetchOutputReport.mockResolvedValue({
      brands: [],
      types: [],
      data: [produk(11, "REF-11")],
    });
    r.stokProduk.fetchOutputReport.mockRejectedValue(new Error("kueri gagal"));

    const res = await request(app(r))
      .post("/output")
      .send({ brand: [], type: [], month: 3, year: 2026, group: "brand" });

    expect(res.status).toBe(500);
  });

  /**
   * Bulan dan tahun diteruskan APA ADANYA, tanpa dibungkus Number() seperti
   * yang dilakukan SalesReportController. Nilai berupa teks tidak dinormalkan
   * di sini; penjagaannya sepenuhnya bersandar pada validate(outputSchema) di
   * route, yang menolak nilai bukan angka sebelum sampai ke controller.
   *
   * Kalau toh teks lolos — misalnya controller ini dipakai ulang di rute lain
   * tanpa skema — repository masih selamat: `new Date("2026", "3" - 1, 0)`
   * memaksa kedua nilai menjadi angka, jadi tanggalnya tetap sah. Fakta itu
   * ikut dikunci di sini supaya tidak keliru dianggap cacat.
   */
  it("meneruskan bulan dan tahun apa adanya, tanpa diubah menjadi angka", async () => {
    const r = repositoryTiruan();
    siapkan(r);

    await request(app(r)).post("/output").send({
      brand: [],
      type: [],
      month: "3",
      year: "2026",
      group: "brand",
    });

    expect(r.produk.fetchOutputReport).toHaveBeenCalledWith(
      expect.objectContaining({ month: "3", year: "2026" })
    );
    expect(r.stokProduk.fetchOutputReport).toHaveBeenCalledWith(
      expect.objectContaining({ month: "3", year: "2026" })
    );
    // Tanggal yang akan dibentuk repository dari nilai teks itu tetap sah.
    expect(
      new Date("2026" as never, ("3" as never as number) - 1, 0).toString()
    ).not.toBe("Invalid Date");
  });

  /**
   * Kedua kueri memang harus berurutan: daftar id produk baru diketahui
   * setelah kueri pertama selesai. Yang dikunci di sini adalah bahwa
   * controller menyerahkan SELURUH id sekaligus dalam satu pemanggilan —
   * berapa pun banyaknya, tanpa pemotongan menjadi beberapa gelombang.
   *
   * Perlu diketahui saat membaca ini: ProductStockRepository.fetchOutputReport
   * menerjemahkan daftar itu menjadi satu kueri PER PRODUK di dalam satu
   * transaksi. Untuk laporan berisi ratusan produk, satu klik pengguna berarti
   * ratusan kueri. Perbaikannya ada di repository, bukan di controller.
   */
  it("menyerahkan seluruh id produk dalam satu pemanggilan", async () => {
    const r = repositoryTiruan();
    const banyak = Array.from({ length: 200 }, (_x, i) =>
      produk(i + 1, `REF-${i + 1}`)
    );
    r.produk.fetchOutputReport.mockResolvedValue({
      brands: [],
      types: [],
      data: banyak,
    });
    r.stokProduk.fetchOutputReport.mockResolvedValue([]);

    await request(app(r))
      .post("/output")
      .send({ brand: [], type: [], month: 3, year: 2026, group: "brand" });

    const dikirim = r.stokProduk.fetchOutputReport.mock.calls[0][0] as {
      product_id: number[];
    };
    expect(dikirim.product_id).toHaveLength(200);
  });
});

describe("GET /company — laporan bulanan satu perusahaan", () => {
  function siapkan(r: Semua) {
    r.perusahaan.fetchByID.mockResolvedValue({ id: 4, name: "CV Karunia" });
    r.stockOut.fetchCompanyOutputSummary.mockResolvedValue([
      {
        reference: "A-1",
        description: "Barang A",
        unit: "PCS",
        quantity: 30,
        documents: 4,
      },
    ]);
    r.penerimaan.fetchCompanySummary.mockResolvedValue([
      {
        reference: "A-1",
        description: "Barang A",
        unit: "PCS",
        quantity: 10,
        documents: 2,
      },
    ]);
    r.penyesuaian.fetchCompanySummary.mockResolvedValue([
      {
        reference: "A-1",
        description: "Barang A",
        unit: "PCS",
        quantity: 5,
        documents: 1,
      },
      {
        reference: "B-2",
        description: "Barang B",
        unit: "SET",
        quantity: 2,
        documents: 1,
      },
    ]);
  }

  it("melebur masuk per produk dan menghitung ringkasan", async () => {
    const r = repositoryTiruan();
    siapkan(r);

    const res = await request(app(r)).get(
      "/company?company_id=4&month=3&year=2026"
    );

    expect(res.status).toBe(200);
    expect(res.body.company).toEqual({ id: 4, name: "CV Karunia" });
    // Penerimaan + penyesuaian barang yang sama menyatu jadi satu baris.
    expect(res.body.input).toEqual([
      {
        reference: "A-1",
        description: "Barang A",
        unit: "PCS",
        quantity: 15,
        documents: 3,
      },
      {
        reference: "B-2",
        description: "Barang B",
        unit: "SET",
        quantity: 2,
        documents: 1,
      },
    ]);
    expect(res.body.summary).toEqual({
      outputQuantity: 30,
      outputDocuments: 4,
      inputQuantity: 17,
      inputDocuments: 4,
    });
  });

  it("meneruskan rentang bulan yang sama ke ketiga repository", async () => {
    const r = repositoryTiruan();
    siapkan(r);

    await request(app(r)).get("/company?company_id=4&month=3&year=2026");

    const harapan = {
      companyID: 4,
      mulai: new Date(2026, 2, 1),
      sebelum: new Date(2026, 3, 1),
    };
    expect(r.stockOut.fetchCompanyOutputSummary).toHaveBeenCalledWith(harapan);
    expect(r.penerimaan.fetchCompanySummary).toHaveBeenCalledWith(harapan);
    expect(r.penyesuaian.fetchCompanySummary).toHaveBeenCalledWith(harapan);
  });

  it("membalas 404 untuk perusahaan yang tidak ada", async () => {
    const r = repositoryTiruan();
    siapkan(r);
    r.perusahaan.fetchByID.mockResolvedValue(null);

    const res = await request(app(r)).get(
      "/company?company_id=999&month=3&year=2026"
    );

    expect(res.status).toBe(404);
  });

  it("skema menolak bulan di luar 1-12 dan company_id kosong", async () => {
    const r = repositoryTiruan();
    siapkan(r);

    const salahBulan = await request(app(r)).get(
      "/company?company_id=4&month=13&year=2026"
    );
    const tanpaPerusahaan = await request(app(r)).get(
      "/company?month=3&year=2026"
    );

    expect(salahBulan.status).toBe(400);
    expect(tanpaPerusahaan.status).toBe(400);
    expect(r.stockOut.fetchCompanyOutputSummary).not.toHaveBeenCalled();
  });

  it("membalas 500 bila salah satu repository gagal", async () => {
    const r = repositoryTiruan();
    siapkan(r);
    r.penyesuaian.fetchCompanySummary.mockRejectedValue(new Error("gagal"));

    const res = await request(app(r)).get(
      "/company?company_id=4&month=3&year=2026"
    );

    expect(res.status).toBe(500);
  });
});
