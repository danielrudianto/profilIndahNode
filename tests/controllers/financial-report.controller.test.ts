import express from "express";
import request from "supertest";

/**
 * Perilaku FinancialReportController.
 *
 * Controller ini merakit laporan laba rugi dari LIMA repository sekaligus
 * (penjualan, pembelian, perusahaan, biaya, dan harga pokok). Semuanya
 * disuntikkan lewat konstruktor, jadi seluruh keputusan controller bisa diuji
 * dengan repository tiruan.
 *
 * Yang paling menentukan di sini adalah PERIODE. Laporan laba rugi punya dua
 * mode:
 *
 *   month 1..12 — satu bulan,
 *   month 0     — setahun penuh.
 *
 * Dua repository menerima periode itu sebagai pasangan objek Date, dua lainnya
 * menerima (month, year) mentah. Kalau salah satu bergeser, laba rugi dihitung
 * dari penjualan bulan A dikurangi biaya bulan B — angkanya tetap terlihat
 * wajar dan salahnya baru ketahuan saat tutup buku.
 *
 * SocketHelper ditiru walau controller ini tidak memakainya: aslinya ia
 * memanggil getIO() yang MELEMPAR selama initIO belum pernah dipanggil, dan di
 * dalam tes memang tidak pernah dipanggil.
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

import FinancialReportController from "../../src/controllers/financial-report.controller";

/** Lima repository tiruan, satu per ketergantungan konstruktor. */
function repositoryTiruan() {
  return {
    salesInvoice: { fetchByDateRange: jest.fn() },
    goodReceipt: { fetchByDateRange: jest.fn() },
    company: { fetchAll: jest.fn() },
    expense: { fetchReport: jest.fn() },
    stockOut: { calculate: jest.fn(), fetchDailySalesReport: jest.fn() },
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

/** Nilai bawaan supaya tiap tes hanya perlu mengatur yang diperiksanya. */
function repoSiapPakai(): Repo {
  const repo = repositoryTiruan();
  repo.salesInvoice.fetchByDateRange.mockResolvedValue([]);
  repo.goodReceipt.fetchByDateRange.mockResolvedValue([]);
  repo.company.fetchAll.mockResolvedValue([]);
  repo.expense.fetchReport.mockResolvedValue([]);
  repo.stockOut.calculate.mockResolvedValue({ hpp: 0, sales: 0 });
  repo.stockOut.fetchDailySalesReport.mockResolvedValue([]);
  return repo;
}

function controller(repo: Repo) {
  return new FinancialReportController(
    repo.salesInvoice as never,
    repo.goodReceipt as never,
    repo.company as never,
    repo.expense as never,
    repo.stockOut as never
  );
}

function app(repo: Repo) {
  const c = controller(repo);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.post("/profit-loss", c.fetchProfitLoss);
  a.post("/daily-sales", c.fetchDailySalesReport);
  return a;
}

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST /profit-loss — laba rugi", () => {
  it("membalas 200 berisi kelima bagian laporan", async () => {
    const repo = repoSiapPakai();
    repo.salesInvoice.fetchByDateRange.mockResolvedValue([{ value: 5000 }]);
    repo.goodReceipt.fetchByDateRange.mockResolvedValue([{ value: 3000 }]);
    repo.company.fetchAll.mockResolvedValue([{ id: 1, name: "PT Indah" }]);
    repo.expense.fetchReport.mockResolvedValue([{ value: 250 }]);
    repo.stockOut.calculate.mockResolvedValue({ hpp: 2000, sales: 5000 });

    const res = await request(app(repo))
      .post("/profit-loss")
      .send({ month: 3, year: 2024 });

    expect(res.status).toBe(200);
    // Controller TIDAK menghitung labanya sendiri: ia hanya mengumpulkan bahan
    // mentah. Penjumlahan laba rugi terjadi di frontend.
    expect(res.body).toEqual({
      sales: [{ value: 5000 }],
      purchase: [{ value: 3000 }],
      company: [{ id: 1, name: "PT Indah" }],
      expense: [{ value: 250 }],
      stockOut: { hpp: 2000, sales: 5000 },
    });
  });

  /**
   * Mode satu bulan. Bulan dikirim 1..12 oleh frontend sementara konstruktor
   * Date memakai 0..11, karena itu ada `- 1`. Batas akhirnya `new Date(year,
   * month, 0)` yaitu "hari ke-0 bulan berikutnya" = hari terakhir bulan ini.
   */
  it("bulan 1..12 menjadi rentang satu bulan penuh untuk penjualan dan pembelian", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/profit-loss")
      .send({ month: 3, year: 2024 });

    expect(repo.salesInvoice.fetchByDateRange).toHaveBeenCalledWith(
      new Date(2024, 2, 1),
      new Date(2024, 2, 31)
    );
    expect(repo.goodReceipt.fetchByDateRange).toHaveBeenCalledWith(
      new Date(2024, 2, 1),
      new Date(2024, 2, 31)
    );
  });

  it.each([
    ["Februari kabisat sampai tanggal 29", 2, 2024, 29],
    ["Februari biasa sampai tanggal 28", 2, 2023, 28],
    ["April sampai tanggal 30", 4, 2024, 30],
    ["Desember sampai tanggal 31", 12, 2024, 31],
  ])("%s", async (_nama, month, year, tanggalAkhir) => {
    const repo = repoSiapPakai();

    await request(app(repo)).post("/profit-loss").send({ month, year });

    expect(repo.salesInvoice.fetchByDateRange).toHaveBeenCalledWith(
      new Date(year, month - 1, 1),
      new Date(year, month - 1, tanggalAkhir)
    );
  });

  /**
   * Mode setahun penuh: month 0. Batas akhirnya `new Date(year + 1, 0, 0)`,
   * yaitu hari ke-0 Januari tahun berikutnya = 31 Desember tahun yang diminta.
   * Bentuk yang mudah salah baca; diuji supaya laporan tahunan tidak diam-diam
   * berhenti di 30 Desember atau justru menyerempet 1 Januari tahun depan.
   */
  it("bulan 0 berarti setahun penuh, 1 Januari sampai 31 Desember", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/profit-loss")
      .send({ month: 0, year: 2024 });

    expect(repo.salesInvoice.fetchByDateRange).toHaveBeenCalledWith(
      new Date(2024, 0, 1),
      new Date(2024, 11, 31)
    );
    expect(repo.goodReceipt.fetchByDateRange).toHaveBeenCalledWith(
      new Date(2024, 0, 1),
      new Date(2024, 11, 31)
    );
  });

  /**
   * Dua repository sisanya menerima bulan APA ADANYA, termasuk nilai 0 sebagai
   * penanda setahun penuh — penerjemahan periodenya dikerjakan di dalam
   * repository, bukan di controller. Perbedaan bentuk parameter ini mudah
   * tertukar saat menyunting.
   */
  it.each([
    ["mode satu bulan", 3],
    ["mode setahun penuh", 0],
  ])("meneruskan bulan mentah ke biaya dan HPP pada %s", async (_n, month) => {
    const repo = repoSiapPakai();

    await request(app(repo)).post("/profit-loss").send({ month, year: 2024 });

    expect(repo.expense.fetchReport).toHaveBeenCalledWith(month, 2024);
    expect(repo.stockOut.calculate).toHaveBeenCalledWith(month, 2024);
  });

  it("fetchAll perusahaan dipanggil tanpa parameter periode", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/profit-loss")
      .send({ month: 3, year: 2024 });

    expect(repo.company.fetchAll).toHaveBeenCalledWith();
  });

  it("menerima bulan dan tahun berupa teks", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/profit-loss")
      .send({ month: "7", year: "2023" });

    expect(repo.expense.fetchReport).toHaveBeenCalledWith(7, 2023);
    expect(repo.salesInvoice.fetchByDateRange).toHaveBeenCalledWith(
      new Date(2023, 6, 1),
      new Date(2023, 6, 31)
    );
  });

  it("membalas 500 bila salah satu repository gagal", async () => {
    const repo = repoSiapPakai();
    repo.stockOut.calculate.mockRejectedValue(new Error("kueri HPP gagal"));

    const res = await request(app(repo))
      .post("/profit-loss")
      .send({ month: 3, year: 2024 });

    expect(res.status).toBe(500);
  });

  /**
   * CACAT: badan balasan galat dikirim sebagai objek Error mentah.
   *
   * `res.status(500).send(error)` pada objek Error menghasilkan JSON "{}" —
   * message dan stack bukan properti yang bisa dihitung. Pemanggil menerima
   * badan KOSONG, bukan key i18n seperti ErrorList["Internal server error"]
   * yang dipakai controller lain. Frontend tidak punya apa pun untuk
   * ditampilkan selain pesan galat umum, dan tim dukungan tidak bisa
   * membedakan gangguan basis data dari kesalahan parameter.
   */
  it("CACAT: badan galat laba rugi berupa objek kosong, bukan key i18n", async () => {
    const repo = repoSiapPakai();
    repo.expense.fetchReport.mockRejectedValue(new Error("kueri biaya gagal"));

    const res = await request(app(repo))
      .post("/profit-loss")
      .send({ month: 3, year: 2024 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({});
    expect(res.text).not.toContain("kueri biaya gagal");
  });

  /**
   * Kelima kueri dijalankan lewat Promise.all, jadi satu kegagalan membatalkan
   * seluruh laporan — tidak ada laporan setengah jadi yang terkirim.
   */
  it("tidak mengirim laporan sebagian saat satu bagian gagal", async () => {
    const repo = repoSiapPakai();
    repo.company.fetchAll.mockRejectedValue(new Error("gagal"));
    repo.salesInvoice.fetchByDateRange.mockResolvedValue([{ value: 5000 }]);

    const res = await request(app(repo))
      .post("/profit-loss")
      .send({ month: 3, year: 2024 });

    expect(res.status).toBe(500);
    expect(res.body).not.toHaveProperty("sales");
  });
});

describe("POST /daily-sales — mutasi barang harian", () => {
  it("membalas 200 berisi hasil repository apa adanya", async () => {
    const repo = repoSiapPakai();
    repo.stockOut.fetchDailySalesReport.mockResolvedValue([
      { id: 1, reference: "PRD-1", salesInvoice: -5 },
    ]);

    const res = await request(app(repo))
      .post("/daily-sales")
      .send({ day: 15, month: 3, year: 2024, type: [1, 2] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, reference: "PRD-1", salesInvoice: -5 }]);
  });

  it("menyusun tanggal dari hari, bulan, dan tahun", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/daily-sales")
      .send({ day: 15, month: 3, year: 2024, type: [1, 2] });

    expect(repo.stockOut.fetchDailySalesReport).toHaveBeenCalledWith({
      date: new Date(2024, 2, 15),
      type: [1, 2],
    });
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repoSiapPakai();
    repo.stockOut.fetchDailySalesReport.mockRejectedValue(
      new Error("kueri harian gagal")
    );

    const res = await request(app(repo))
      .post("/daily-sales")
      .send({ day: 15, month: 3, year: 2024, type: [1] });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({});
  });

  /**
   * CACAT BERAT: hari 0 diartikan sebagai hari terakhir BULAN SEBELUMNYA.
   *
   * Skema validasi rute (src/schemas/report.schema.ts, dailySalesSchema)
   * membolehkan day 0-31 dan menuliskan sendiri bahwa "nilai 0 dipakai sebagai
   * penanda seluruh bulan". Controller tidak pernah menangani penanda itu: ia
   * langsung menyusun `new Date(year, month - 1, day)`, dan tanggal 0 pada
   * konstruktor Date berarti sehari SEBELUM tanggal 1.
   *
   * Jadi permintaan "seluruh bulan Maret 2024" menghasilkan laporan untuk
   * tanggal 29 Februari 2024 saja. Pengguna melihat laporan mutasi yang
   * tampak sah — berisi angka, berjudul Maret — padahal isinya satu hari dari
   * bulan yang salah.
   */
  it("CACAT: hari 0 menghasilkan tanggal akhir bulan sebelumnya, bukan seluruh bulan", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/daily-sales")
      .send({ day: 0, month: 3, year: 2024, type: [1] });

    expect(repo.stockOut.fetchDailySalesReport).toHaveBeenCalledWith(
      expect.objectContaining({ date: new Date(2024, 1, 29) })
    );
  });

  /**
   * CACAT: bulan 0 melompat ke Desember tahun sebelumnya.
   *
   * Skema yang sama membolehkan month 0-12 untuk endpoint ini. `new Date(year,
   * 0 - 1, day)` = bulan indeks -1 = Desember tahun sebelumnya. Laporan yang
   * diminta untuk 2024 dijawab dengan data Desember 2023.
   */
  it("CACAT: bulan 0 menghasilkan Desember tahun sebelumnya", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/daily-sales")
      .send({ day: 15, month: 0, year: 2024, type: [1] });

    expect(repo.stockOut.fetchDailySalesReport).toHaveBeenCalledWith(
      expect.objectContaining({ date: new Date(2023, 11, 15) })
    );
  });

  /**
   * CACAT BERAT: `type` diteruskan mentah ke kueri yang dirangkai sebagai teks.
   *
   * Skema rute memvalidasi bidang bernama `group`, sedangkan controller membaca
   * `req.body.type` dan hanya MENGAKUINYA sebagai number[] lewat `as number[]`
   * — sebuah penegasan tipe yang tidak memeriksa apa pun saat program berjalan.
   * Di repository, nilai itu dirangkai menjadi teks kueri lewat
   * `data.type.join(",")` di dalam $queryRawUnsafe.
   *
   * Artinya isi `type` sampai ke SQL tanpa pernah divalidasi maupun
   * diparameterkan. Tes ini mengunci kenyataannya: apa pun yang dikirim
   * pemanggil diteruskan apa adanya.
   */
  it("CACAT: type diteruskan apa adanya tanpa validasi angka", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/daily-sales")
      .send({
        day: 15,
        month: 3,
        year: 2024,
        type: ["1) OR 1=1 -- "],
      });

    expect(repo.stockOut.fetchDailySalesReport).toHaveBeenCalledWith(
      expect.objectContaining({ type: ["1) OR 1=1 -- "] })
    );
  });

  /**
   * CACAT: `type` tidak wajib menurut skema, tetapi repository memanggil
   * `.join()` padanya. Controller meneruskan undefined tanpa pemeriksaan, dan
   * repository sungguhan akan melempar TypeError — pengguna menerima 500 tanpa
   * penjelasan alih-alih pesan "parameter kurang lengkap".
   */
  it("CACAT: type yang tidak dikirim diteruskan sebagai undefined", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/daily-sales")
      .send({ day: 15, month: 3, year: 2024 });

    expect(repo.stockOut.fetchDailySalesReport).toHaveBeenCalledWith({
      date: new Date(2024, 2, 15),
      type: undefined,
    });
  });
});
