import express from "express";
import request from "supertest";

/**
 * Perilaku PurchaseReportController.
 *
 * Controller ini hanya menerima SATU repository (GoodReceiptRepository), tetapi
 * memanggilnya lima kali dengan bentuk parameter yang BERBEDA-BEDA:
 *
 *   fetchByDateRange menerima dua objek Date,
 *   fetchChart / fetchBestBrand / fetchBestType / fetchBestSupplier menerima
 *   pasangan (month, year) berupa angka.
 *
 * Karena itu yang paling penting diuji di sini bukan bentuk balasannya,
 * melainkan NILAI yang diteruskan. Salah satu bulan menggeser seluruh laporan
 * pembelian satu bulan penuh, dan angkanya tetap terlihat "masuk akal" di layar
 * sehingga tidak ada yang curiga.
 *
 * SocketHelper tetap ditiru walau controller ini tidak memakainya, supaya
 * berkas tes ini tidak ikut tumbang bila kelak ada handler yang mengirim
 * peristiwa: aslinya SocketHelper memanggil getIO() yang MELEMPAR selama initIO
 * belum pernah dipanggil, dan di dalam tes memang tidak pernah dipanggil.
 */

const kirimSocket = jest.fn();
jest.mock("../../src/utils/socket.helper", () => ({
  __esModule: true,
  default: class {
    constructor(public nama: string, public data: unknown) {}
    create() {
      kirimSocket(this.nama, this.data);
    }
  },
}));

import PurchaseReportController from "../../src/controllers/purchase-report.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
function repositoryTiruan() {
  return {
    fetchByDateRange: jest.fn(),
    fetchChart: jest.fn(),
    fetchBestBrand: jest.fn(),
    fetchBestType: jest.fn(),
    fetchBestSupplier: jest.fn(),
    fetchDownload: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo) {
  const c = new PurchaseReportController(repo as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.post("/purchase", c.fetchPurchaseReport);
  a.post("/purchase/download", c.downloadPurchaseReport);
  return a;
}

/** Nilai bawaan supaya tiap tes hanya perlu mengatur yang diperiksanya. */
function repoSiapPakai() {
  const repo = repositoryTiruan();
  repo.fetchByDateRange.mockResolvedValue([]);
  repo.fetchChart.mockResolvedValue([]);
  repo.fetchBestBrand.mockResolvedValue(null);
  repo.fetchBestType.mockResolvedValue(null);
  repo.fetchBestSupplier.mockResolvedValue(null);
  repo.fetchDownload.mockResolvedValue([]);
  return repo;
}

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST /purchase — rekap pembelian sebulan", () => {
  it("membalas 200 berisi ringkasan, grafik, dan peringkat terbaik", async () => {
    const repo = repoSiapPakai();
    repo.fetchByDateRange.mockResolvedValue([
      { value: 1000, discount: 100, goodReceiptCount: 2, company_id: 1 },
      { value: 500, discount: 50, goodReceiptCount: 3, company_id: 2 },
    ]);
    repo.fetchChart.mockResolvedValue([
      { date: 1, value: 1500, discount: 150, goodReceiptCount: 5 },
    ]);
    repo.fetchBestBrand.mockResolvedValue("Merek A");
    repo.fetchBestType.mockResolvedValue("Tipe B");
    repo.fetchBestSupplier.mockResolvedValue("Pemasok C");

    const res = await request(app(repo))
      .post("/purchase")
      .send({ month: 3, year: 2024 });

    expect(res.status).toBe(200);
    // Nilai per perusahaan DIJUMLAHKAN menjadi satu angka nasional. Rincian
    // company_id-nya hilang di sini — yang sampai ke pengguna hanya totalnya.
    expect(res.body).toEqual({
      value: 1500,
      discount: 150,
      goodReceiptCount: 5,
      chart: [{ date: 1, value: 1500, discount: 150, goodReceiptCount: 5 }],
      brand: "Merek A",
      type: "Tipe B",
      supplier: "Pemasok C",
    });
  });

  it("membalas nol untuk semua ringkasan bila tidak ada pembelian", async () => {
    const repo = repoSiapPakai();

    const res = await request(app(repo))
      .post("/purchase")
      .send({ month: 3, year: 2024 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ value: 0, discount: 0, goodReceiptCount: 0 })
    );
  });

  /**
   * Rentang tanggal adalah inti laporan ini. Bulan dikirim sebagai 1..12 oleh
   * frontend, sedangkan konstruktor Date memakai 0..11 — karena itu ada `- 1`.
   * Kalau pengurangan itu hilang atau berlebih, seluruh laporan bergeser satu
   * bulan dan pengguna menutup buku dengan angka bulan yang salah.
   */
  it("menerjemahkan bulan 1..12 menjadi rentang tanggal awal sampai akhir bulan", async () => {
    const repo = repoSiapPakai();

    await request(app(repo)).post("/purchase").send({ month: 3, year: 2024 });

    expect(repo.fetchByDateRange).toHaveBeenCalledWith(
      new Date(2024, 2, 1), // 1 Maret 2024
      new Date(2024, 2, 31) // 31 Maret 2024
    );
  });

  /**
   * `new Date(year, month, 0)` berarti "hari ke-0 bulan berikutnya", yaitu hari
   * terakhir bulan ini. Bentuk itu otomatis benar untuk bulan 28/29/30/31 hari,
   * termasuk Februari tahun kabisat. Diuji supaya penyederhanaan menjadi angka
   * tetap (misal 30) tidak lolos diam-diam.
   */
  it.each([
    ["Februari tahun kabisat berakhir tanggal 29", 2, 2024, 29],
    ["Februari tahun biasa berakhir tanggal 28", 2, 2023, 28],
    ["April berakhir tanggal 30", 4, 2024, 30],
    ["Desember berakhir tanggal 31", 12, 2024, 31],
  ])("%s", async (_nama, month, year, tanggalAkhir) => {
    const repo = repoSiapPakai();

    await request(app(repo)).post("/purchase").send({ month, year });

    const [awal, akhir] = repo.fetchByDateRange.mock.calls[0];
    expect(awal).toEqual(new Date(year, month - 1, 1));
    expect(akhir).toEqual(new Date(year, month - 1, tanggalAkhir));
  });

  /**
   * Empat kueri sisanya justru menerima bulan APA ADANYA (1..12), bukan indeks
   * Date. Perbedaan itu mudah tertukar saat menyunting: kalau `month - 1` ikut
   * dipakai di sini, grafik dan peringkat akan menampilkan bulan sebelumnya
   * sementara ringkasan di atasnya menampilkan bulan yang benar — satu layar
   * berisi dua bulan berbeda tanpa penanda apa pun.
   */
  it("meneruskan bulan dan tahun mentah ke grafik dan peringkat", async () => {
    const repo = repoSiapPakai();

    await request(app(repo)).post("/purchase").send({ month: 3, year: 2024 });

    expect(repo.fetchChart).toHaveBeenCalledWith(3, 2024);
    expect(repo.fetchBestBrand).toHaveBeenCalledWith(3, 2024);
    expect(repo.fetchBestType).toHaveBeenCalledWith(3, 2024);
    expect(repo.fetchBestSupplier).toHaveBeenCalledWith(3, 2024);
  });

  it("menerima bulan dan tahun berupa teks dan mengubahnya jadi angka", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/purchase")
      .send({ month: "7", year: "2023" });

    expect(repo.fetchChart).toHaveBeenCalledWith(7, 2023);
    expect(repo.fetchByDateRange).toHaveBeenCalledWith(
      new Date(2023, 6, 1),
      new Date(2023, 6, 31)
    );
  });

  /**
   * CACAT BERAT: fetchPurchaseReport tidak punya penanganan galat sama sekali.
   *
   * downloadPurchaseReport tepat di bawahnya dibungkus try/catch dan membalas
   * 500. Handler ini tidak. Karena `async`, penolakan dari repository menjadi
   * promise yang ditolak; Express 4 tidak menangani penolakan promise, dan Node
   * 15 ke atas menghentikan proses pada unhandled rejection.
   *
   * Akibatnya satu galat basis data sesaat saat membuka laporan pembelian tidak
   * berujung 500 bagi satu pemanggil, melainkan MEMATIKAN SELURUH SERVER —
   * semua pengguna lain ikut terputus.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu, persis yang dialami
   * pemanggil sungguhan sebelum prosesnya tumbang.
   */
  it("CACAT: fetchPurchaseReport menolak tanpa membalas apa pun saat repository gagal", async () => {
    const repo = repoSiapPakai();
    repo.fetchByDateRange.mockRejectedValue(new Error("koneksi putus"));
    const c = new PurchaseReportController(repo as never);

    const req = { body: { month: 3, year: 2024 }, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.fetchPurchaseReport(req, res)).rejects.toThrow(
      "koneksi putus"
    );
    // Tidak ada balasan yang pernah dikirim — itulah sebabnya permintaannya
    // menggantung alih-alih menerima 500.
    expect((res as any).status).not.toHaveBeenCalled();
  });

  /** Kegagalan pada kueri belakangan pun bernasib sama. */
  it("CACAT: kegagalan fetchBestSupplier juga menjatuhkan proses", async () => {
    const repo = repoSiapPakai();
    repo.fetchBestSupplier.mockRejectedValue(
      new Error("kueri peringkat gagal")
    );
    const c = new PurchaseReportController(repo as never);

    const req = { body: { month: 3, year: 2024 }, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.fetchPurchaseReport(req, res)).rejects.toThrow(
      "kueri peringkat gagal"
    );
    expect((res as any).status).not.toHaveBeenCalled();
  });
});

describe("POST /purchase/download — unduhan laporan pembelian", () => {
  it("membalas 200 berisi baris hasil repository apa adanya", async () => {
    const repo = repoSiapPakai();
    repo.fetchDownload.mockResolvedValue([
      { name: "GR-001", value: 1000 },
      { name: "GR-002", value: 2000 },
    ]);

    const res = await request(app(repo))
      .post("/purchase/download")
      .send({ month: 5, year: 2024 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { name: "GR-001", value: 1000 },
      { name: "GR-002", value: 2000 },
    ]);
  });

  it("meneruskan bulan dan tahun sebagai angka", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/purchase/download")
      .send({ month: "5", year: "2024" });

    expect(repo.fetchDownload).toHaveBeenCalledWith(5, 2024);
  });

  /**
   * Meski namanya "download", handler ini TIDAK menyetel Content-Disposition
   * maupun Content-Type berkas: ia hanya mengirim JSON biasa. Berkas Excel-nya
   * dirakit di sisi frontend. Diuji supaya jelas bahwa peramban tidak akan
   * memunculkan dialog simpan berkas dari endpoint ini.
   */
  it("tidak menyetel header unduhan berkas, hanya mengirim JSON", async () => {
    const repo = repoSiapPakai();
    repo.fetchDownload.mockResolvedValue([{ name: "GR-001" }]);

    const res = await request(app(repo))
      .post("/purchase/download")
      .send({ month: 5, year: 2024 });

    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.headers["content-disposition"]).toBeUndefined();
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repoSiapPakai();
    repo.fetchDownload.mockRejectedValue(new Error("kueri unduhan gagal"));

    const res = await request(app(repo))
      .post("/purchase/download")
      .send({ month: 5, year: 2024 });

    expect(res.status).toBe(500);
  });

  /**
   * CACAT: badan balasan galat dikirim sebagai objek Error mentah.
   *
   * `res.status(500).send(error)` pada objek Error menghasilkan JSON "{}" —
   * karena message dan stack bukan properti yang bisa dihitung. Jadi pemanggil
   * menerima badan KOSONG, bukan key i18n seperti pada controller lain yang
   * mengirim ErrorList["Internal server error"]. Frontend tidak punya apa pun
   * untuk ditampilkan selain pesan galat umum.
   */
  it("CACAT: badan galat berupa objek kosong, bukan key i18n", async () => {
    const repo = repoSiapPakai();
    repo.fetchDownload.mockRejectedValue(new Error("kueri unduhan gagal"));

    const res = await request(app(repo))
      .post("/purchase/download")
      .send({ month: 5, year: 2024 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({});
    expect(res.text).not.toContain("kueri unduhan gagal");
  });
});
