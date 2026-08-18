import express from "express";
import request from "supertest";

/**
 * Perilaku SalesReportController.
 *
 * Mengikuti acuan company.controller.test.ts: repository faktur penjualan
 * disuntikkan lewat konstruktor sebagai objek berisi jest.fn(). Controller ini
 * tidak menulis apa pun — ia menerjemahkan bulan dan tahun dari permintaan,
 * memanggil repository, lalu merangkum hasilnya. Maka yang diuji adalah nilai
 * yang diteruskan ke repository dan aritmetika rangkumannya.
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

import SalesReportController from "../../src/controllers/sales-report.controller";

function repositoryTiruan() {
  return {
    fetchByDateRange: jest.fn(),
    fetchChart: jest.fn(),
    fetchBestBrand: jest.fn(),
    fetchBestType: jest.fn(),
    fetchBestSales: jest.fn(),
    fetchBrandSales: jest.fn(),
    fetchTypeSales: jest.fn(),
    fetchSalesSales: jest.fn(),
    fetchDownload: jest.fn(),
    fetchCustomerCount: jest.fn(),
  };
}

function repositoryReturTiruan() {
  return {
    fetchMonthlyReturn: jest.fn().mockResolvedValue({ value: 0, count: 0 }),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo, retur = repositoryReturTiruan()) {
  const c = new SalesReportController(repo as never, retur as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.post("/sales", c.fetchSalesReport);
  a.post("/sales/download", c.downloadSalesReport);
  a.get("/sales/brand", c.fetchBrandSalesReport);
  a.get("/sales/type", c.fetchTypeSalesreport);
  a.get("/sales/sales", c.fetchSalesSalesReport);
  return a;
}

const ringkasan = {
  value: 1_000_000,
  discount: 100_000,
  delivery: 50_000,
  service: 25_000,
  salesInvoiceCount: 12,
  customerCount: 5,
};

function siapkanRingkasan(repo: Repo) {
  repo.fetchByDateRange.mockResolvedValue(ringkasan);
  repo.fetchChart.mockResolvedValue([{ day: 1, value: 100 }]);
  repo.fetchBestBrand.mockResolvedValue("MEREK A");
  repo.fetchBestType.mockResolvedValue("TIPE B");
  repo.fetchBestSales.mockResolvedValue("AGUS");
  repo.fetchCustomerCount.mockResolvedValue(5);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /sales — laporan penjualan bulanan", () => {
  it("membalas 200 berisi rangkuman, grafik, dan peringkat terbaik", async () => {
    const repo = repositoryTiruan();
    siapkanRingkasan(repo);

    const res = await request(app(repo))
      .post("/sales")
      .send({ month: 3, year: 2026 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      salesInvoiceCount: 12,
      delivery: 50_000,
      discount: 100_000,
      service: 25_000,
      // 1.000.000 + 50.000 + 25.000 - 100.000
      total: 975_000,
      chart: [{ day: 1, value: 100 }],
      brand: "MEREK A",
      sales: "AGUS",
      type: "TIPE B",
      /* Kartu retur dan pelanggan pada berkas desain 9a. */
      returned_value: 0,
      returns: 0,
      customerCount: 5,
    });
  });

  it("menerjemahkan bulan dan tahun menjadi rentang satu bulan penuh", async () => {
    const repo = repositoryTiruan();
    siapkanRingkasan(repo);

    await request(app(repo)).post("/sales").send({ month: 3, year: 2026 });

    const [awal, akhir] = repo.fetchByDateRange.mock.calls[0] as Date[];
    // Maret 2026: 1 Maret sampai 31 Maret.
    expect(awal.getFullYear()).toBe(2026);
    expect(awal.getMonth()).toBe(2);
    expect(awal.getDate()).toBe(1);
    expect(akhir.getMonth()).toBe(2);
    expect(akhir.getDate()).toBe(31);
  });

  it("Februari tahun kabisat berakhir tanggal 29", async () => {
    const repo = repositoryTiruan();
    siapkanRingkasan(repo);

    await request(app(repo)).post("/sales").send({ month: 2, year: 2024 });

    const [, akhir] = repo.fetchByDateRange.mock.calls[0] as Date[];
    expect(akhir.getMonth()).toBe(1);
    expect(akhir.getDate()).toBe(29);
  });

  it("meneruskan bulan dan tahun apa adanya ke keempat kueri peringkat", async () => {
    const repo = repositoryTiruan();
    siapkanRingkasan(repo);

    await request(app(repo)).post("/sales").send({ month: 3, year: 2026 });

    expect(repo.fetchChart).toHaveBeenCalledWith(3, 2026);
    expect(repo.fetchBestBrand).toHaveBeenCalledWith(3, 2026);
    expect(repo.fetchBestType).toHaveBeenCalledWith(3, 2026);
    expect(repo.fetchBestSales).toHaveBeenCalledWith(3, 2026);
  });

  it("bulan dan tahun berupa teks tetap diubah menjadi angka", async () => {
    const repo = repositoryTiruan();
    siapkanRingkasan(repo);

    await request(app(repo)).post("/sales").send({ month: "3", year: "2026" });

    expect(repo.fetchChart).toHaveBeenCalledWith(3, 2026);
  });

  /**
   * CACAT BERAT: fetchSalesReport tidak punya penanganan galat sama sekali.
   *
   * Empat handler lain di berkas ini membungkus pemanggilan repository dengan
   * try/catch dan membalas 500. Yang ini — justru laporan utama yang paling
   * sering dibuka — tidak. Karena handler-nya `async`, penolakan dari
   * repository menjadi promise yang ditolak dan tidak ada yang menangkapnya:
   * Express 4 tidak menangani penolakan promise, dan Node 15 ke atas
   * menghentikan proses pada unhandled rejection.
   *
   * Jadi satu kueri laporan yang gagal — kueri berat yang menjumlahkan seluruh
   * faktur sebulan, jadi kandidat kuat untuk timeout — tidak berujung 500 bagi
   * satu pemanggil, melainkan MEMATIKAN SELURUH SERVER bagi semua orang.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu.
   */
  it("CACAT: fetchSalesReport menolak tanpa membalas saat repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByDateRange.mockRejectedValue(new Error("kueri kehabisan waktu"));
    const c = new SalesReportController(
      repo as never,
      repositoryReturTiruan() as never
    );

    const req = { body: { month: 3, year: 2026 }, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.fetchSalesReport(req, res)).rejects.toThrow(
      "kueri kehabisan waktu"
    );
    expect((res as any).status).not.toHaveBeenCalled();
  });

  /**
   * CACAT: keempat kueri peringkat dijalankan BERURUTAN, bukan berbarengan.
   *
   * Tiap `await` menunggu yang sebelumnya selesai, padahal kelima kueri
   * (rangkuman, grafik, merek, tipe, sales) sama sekali tidak saling
   * bergantung. Bandingkan dengan DashboardController yang memakai
   * Promise.all untuk pekerjaan serupa.
   *
   * Akibat bagi pengguna: waktu tunggu halaman laporan adalah JUMLAH kelima
   * kueri, bukan yang terlama. Pada kueri agregat sebulan yang masing-masing
   * memakan waktu, selisihnya terasa langsung sebagai layar yang lama kosong.
   *
   * Dibuktikan dengan menunda kueri pertama: karena semuanya berbarengan,
   * kueri kedua sudah terpanggil saat yang pertama masih menunggu.
   */
  it("kueri laporan dijalankan berbarengan, bukan berurutan", async () => {
    const repo = repositoryTiruan();
    siapkanRingkasan(repo);
    let lepaskan: (() => void) | undefined;
    repo.fetchByDateRange.mockImplementation(
      () =>
        new Promise((resolve) => {
          lepaskan = () => resolve(ringkasan);
        })
    );

    const c = new SalesReportController(
      repo as never,
      repositoryReturTiruan() as never
    );
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    const jalan = c.fetchSalesReport(
      { body: { month: 3, year: 2026 } } as never,
      res as never
    );

    // Beri kesempatan antrean mikrotask berjalan.
    await Promise.resolve();
    // Kueri lain SUDAH berjalan walau yang pertama masih menggantung —
    // itulah berbarengan. Dulu di sini tercatat sebagai CACAT: semuanya
    // berbaris menunggu yang pertama selesai.
    expect(repo.fetchChart).toHaveBeenCalled();
    expect(repo.fetchBestBrand).toHaveBeenCalled();

    lepaskan!();
    await jalan;
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("GET /sales/brand — penjualan per merek", () => {
  it("membalas 200 dan membungkus hasil di dalam bidang data", async () => {
    const repo = repositoryTiruan();
    repo.fetchBrandSales.mockResolvedValue([{ brand: "A", value: 10 }]);

    const res = await request(app(repo)).get("/sales/brand?month=3&year=2026");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ brand: "A", value: 10 }] });
    expect(repo.fetchBrandSales).toHaveBeenCalledWith({ month: 3, year: 2026 });
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchBrandSales.mockRejectedValue(new Error("kueri gagal"));

    const res = await request(app(repo)).get("/sales/brand?month=3&year=2026");

    expect(res.status).toBe(500);
  });

  /**
   * `Number(undefined)` menghasilkan NaN, dan controller tidak memeriksanya:
   * kueri tetap dijalankan dengan bulan NaN, yang pada MySQL berujung
   * pembandingan dengan NULL — laporannya kosong tanpa satu pun galat, dan
   * pengguna membaca "tidak ada penjualan" alih-alih "parameternya salah".
   *
   * Lewat rute sungguhan keadaan ini tidak tercapai: validate(queryPeriodSchema)
   * mewajibkan month dan year lebih dulu. Dikunci supaya jelas bahwa controller
   * ini TIDAK boleh dipasang di rute tanpa skema.
   */
  it("meneruskan bulan yang tak terkirim sebagai NaN, bukan menolaknya", async () => {
    const repo = repositoryTiruan();
    repo.fetchBrandSales.mockResolvedValue([]);

    const res = await request(app(repo)).get("/sales/brand");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
    const dikirim = repo.fetchBrandSales.mock.calls[0][0] as {
      month: number;
      year: number;
    };
    expect(Number.isNaN(dikirim.month)).toBe(true);
    expect(Number.isNaN(dikirim.year)).toBe(true);
  });
});

describe("GET /sales/type — penjualan per tipe produk", () => {
  it("membalas 200 dan meneruskan periode dari query", async () => {
    const repo = repositoryTiruan();
    repo.fetchTypeSales.mockResolvedValue([{ type: "B", value: 20 }]);

    const res = await request(app(repo)).get("/sales/type?month=12&year=2025");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ type: "B", value: 20 }] });
    expect(repo.fetchTypeSales).toHaveBeenCalledWith({ month: 12, year: 2025 });
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchTypeSales.mockRejectedValue(new Error("kueri gagal"));

    const res = await request(app(repo)).get("/sales/type?month=12&year=2025");

    expect(res.status).toBe(500);
  });
});

describe("GET /sales/sales — penjualan per salesman", () => {
  it("membalas 200 dan meneruskan periode dari query", async () => {
    const repo = repositoryTiruan();
    repo.fetchSalesSales.mockResolvedValue([{ sales: "AGUS", value: 30 }]);

    const res = await request(app(repo)).get("/sales/sales?month=1&year=2026");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ sales: "AGUS", value: 30 }] });
    expect(repo.fetchSalesSales).toHaveBeenCalledWith({ month: 1, year: 2026 });
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchSalesSales.mockRejectedValue(new Error("kueri gagal"));

    const res = await request(app(repo)).get("/sales/sales?month=1&year=2026");

    expect(res.status).toBe(500);
  });
});

describe("POST /sales/download — unduhan laporan penjualan", () => {
  it("membalas 200 dan meneruskan hasil repository apa adanya", async () => {
    const repo = repositoryTiruan();
    repo.fetchDownload.mockResolvedValue([{ nomor: "SI-001", nilai: 500 }]);

    const res = await request(app(repo))
      .post("/sales/download")
      .send({ month: 3, year: 2026 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ nomor: "SI-001", nilai: 500 }]);
    // Di sini periodenya dibaca dari badan permintaan, bukan dari query.
    expect(repo.fetchDownload).toHaveBeenCalledWith(3, 2026);
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchDownload.mockRejectedValue(new Error("kueri gagal"));

    const res = await request(app(repo))
      .post("/sales/download")
      .send({ month: 3, year: 2026 });

    expect(res.status).toBe(500);
  });

  /**
   * CACAT: galat dikirim sebagai objek Error, bukan key i18n.
   *
   * Keempat handler ber-try/catch di berkas ini menutup dengan
   * `res.status(500).send(error)`. `message` milik Error bersifat
   * non-enumerable, jadi badan balasannya kosong dari penjelasan — sementara
   * properti galat Prisma yang enumerable (`code`, `meta`) justru ikut
   * terkirim ke peramban.
   *
   * Akibat bagi pengguna: tombol unduh yang gagal tidak memberi pesan apa pun
   * yang bisa ditampilkan, sedangkan rincian internal basis data bocor keluar.
   */
  it("CACAT: kegagalan unduhan mengirim objek galat, bukan pesan", async () => {
    const repo = repositoryTiruan();
    repo.fetchDownload.mockRejectedValue(
      Object.assign(new Error("kueri gagal"), {
        code: "P2010",
        meta: { table: "sales_invoice" },
      })
    );

    const res = await request(app(repo))
      .post("/sales/download")
      .send({ month: 3, year: 2026 });

    expect(res.status).toBe(500);
    expect(res.body.message).toBeUndefined();
    expect(res.text).not.toContain("error.internalServer");
    expect(res.body.code).toBe("P2010");
    expect(res.body.meta).toEqual({ table: "sales_invoice" });
  });
});
