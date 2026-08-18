import express from "express";
import request from "supertest";

/**
 * Perilaku MoneyReceiptController.
 *
 * Laporan penerimaan uang harian. Controller ini menarik angka dari LIMA
 * repository lalu merakitnya menjadi satu tabel per metode pembayaran. Semua
 * perakitan itu terjadi di controller — bukan di basis data — jadi seluruh
 * aturannya bisa diuji dengan repository tiruan.
 *
 * Tiga hal yang paling berpengaruh bagi pengguna:
 *
 *   1. Baris "Cash" adalah baris untuk pembayaran yang payment_method_id-nya
 *      null. Kalau penyaringannya salah, uang tunai hari itu hilang dari rekap
 *      kasir dan kas fisik tidak akan cocok.
 *   2. Kolom overpayment adalah SELISIH: kelebihan bayar yang diterima dikurangi
 *      yang dikembalikan. Salah tanda berarti pengembalian dihitung sebagai
 *      pemasukan.
 *   3. Baris "DOR" menggabungkan pembayaran giro dari dua sumber (invoice dan
 *      titipan) per nama sales. Kalau penggabungannya gagal, satu sales muncul
 *      dua kali dan totalnya dibaca ganda.
 *
 * SocketHelper ditiru walau controller ini tidak memakainya: aslinya ia
 * memanggil getIO() yang MELEMPAR selama initIO belum pernah dipanggil, dan di
 * dalam tes memang tidak pernah dipanggil.
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

import MoneyReceiptController from "../../src/controllers/money-receipt.controller";

/** Lima repository tiruan, satu per ketergantungan konstruktor. */
function repositoryTiruan() {
  return {
    paymentMethod: { fetchAll: jest.fn() },
    salesInvoicePayment: {
      fetchPaymentsByDate: jest.fn(),
      fetchDORPaymentsByDate: jest.fn(),
      fetchDORPaymentsByDateRange: jest.fn(),
      downloadReport: jest.fn(),
    },
    salesDepositPayment: {
      fetchPaymentsByDate: jest.fn(),
      fetchDORPaymentsByDate: jest.fn(),
      fetchDORPaymentsByDateRange: jest.fn(),
    },
    salesReturn: { fetchPaymentsByDate: jest.fn() },
    overpayment: {
      fetchReportByReceiveDate: jest.fn(),
      fetchReportByReturnDate: jest.fn(),
    },
    salesInvoiceRebate: { sumByDate: jest.fn() },
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

/** Semua sumber kosong; tiap tes hanya mengisi yang diperiksanya. */
function repoSiapPakai(): Repo {
  const repo = repositoryTiruan();
  repo.paymentMethod.fetchAll.mockResolvedValue([]);
  repo.salesInvoicePayment.fetchPaymentsByDate.mockResolvedValue([]);
  repo.salesInvoicePayment.fetchDORPaymentsByDate.mockResolvedValue([]);
  repo.salesInvoicePayment.fetchDORPaymentsByDateRange.mockResolvedValue([]);
  repo.salesInvoicePayment.downloadReport.mockResolvedValue([]);
  repo.salesDepositPayment.fetchPaymentsByDate.mockResolvedValue([]);
  repo.salesDepositPayment.fetchDORPaymentsByDate.mockResolvedValue([]);
  repo.salesDepositPayment.fetchDORPaymentsByDateRange.mockResolvedValue([]);
  repo.salesReturn.fetchPaymentsByDate.mockResolvedValue([]);
  repo.overpayment.fetchReportByReceiveDate.mockResolvedValue([]);
  repo.overpayment.fetchReportByReturnDate.mockResolvedValue([]);
  repo.salesInvoiceRebate.sumByDate.mockResolvedValue([]);
  return repo;
}

function controller(repo: Repo) {
  return new MoneyReceiptController(
    repo.paymentMethod as never,
    repo.salesInvoicePayment as never,
    repo.salesDepositPayment as never,
    repo.salesReturn as never,
    repo.overpayment as never,
    repo.salesInvoiceRebate as never
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
  a.post("/money-receipt", c.fetchMoneyReceipt);
  a.post("/money-receipt/download", c.downloadMoneyReceipt);
  a.post("/money-receipt/dor", c.fetchDorMoneyReceipt);
  return a;
}

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST /money-receipt — rekap penerimaan harian", () => {
  it("selalu membuka daftar dengan baris Cash lalu baris DOR", async () => {
    const repo = repoSiapPakai();

    const res = await request(app(repo))
      .post("/money-receipt")
      .send({ date: "2024-03-15" });

    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual({
      id: null,
      name: "Cash",
      salesInvoice: 0,
      salesDeposit: 0,
      salesReturn: 0,
      overpayment: 0,
      rebate: 0,
    });
    expect(res.body[1]).toEqual({ id: 0, name: "DOR", data: [] });
  });

  it("meneruskan tanggal yang sama ke ketujuh sumber", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/money-receipt")
      .send({ date: "2024-03-15T00:00:00.000Z" });

    const tanggal = new Date("2024-03-15T00:00:00.000Z");
    expect(repo.salesInvoicePayment.fetchPaymentsByDate).toHaveBeenCalledWith(
      tanggal
    );
    expect(
      repo.salesInvoicePayment.fetchDORPaymentsByDate
    ).toHaveBeenCalledWith(tanggal);
    expect(repo.salesDepositPayment.fetchPaymentsByDate).toHaveBeenCalledWith(
      tanggal
    );
    expect(
      repo.salesDepositPayment.fetchDORPaymentsByDate
    ).toHaveBeenCalledWith(tanggal);
    expect(repo.salesReturn.fetchPaymentsByDate).toHaveBeenCalledWith(tanggal);
    expect(repo.overpayment.fetchReportByReceiveDate).toHaveBeenCalledWith(
      tanggal
    );
    expect(repo.overpayment.fetchReportByReturnDate).toHaveBeenCalledWith(
      tanggal
    );
  });

  /**
   * Baris "Cash" bukan metode pembayaran tersendiri di basis data: ia adalah
   * kumpulan pembayaran yang payment_method_id-nya null. Kalau baris ini salah
   * mengambil angka, uang tunai yang sungguh diterima kasir tidak muncul di
   * rekap dan penghitungan laci kas tidak akan cocok pada tutup hari.
   */
  it("baris Cash mengambil pembayaran yang tanpa metode pembayaran", async () => {
    const repo = repoSiapPakai();
    repo.salesInvoicePayment.fetchPaymentsByDate.mockResolvedValue([
      { payment_method_id: 2, value: 700 },
      { payment_method_id: null, value: 300 },
    ]);
    repo.salesDepositPayment.fetchPaymentsByDate.mockResolvedValue([
      { payment_method_id: null, value: 150 },
    ]);
    repo.salesReturn.fetchPaymentsByDate.mockResolvedValue([
      { payment_method_id: null, value: 50 },
    ]);

    const res = await request(app(repo))
      .post("/money-receipt")
      .send({ date: "2024-03-15" });

    expect(res.body[0]).toEqual(
      expect.objectContaining({
        name: "Cash",
        salesInvoice: 300,
        salesDeposit: 150,
        salesReturn: 50,
      })
    );
  });

  it("baris Cash bernilai nol bila semua pembayaran punya metode", async () => {
    const repo = repoSiapPakai();
    repo.salesInvoicePayment.fetchPaymentsByDate.mockResolvedValue([
      { payment_method_id: 2, value: 700 },
    ]);

    const res = await request(app(repo))
      .post("/money-receipt")
      .send({ date: "2024-03-15" });

    expect(res.body[0]).toEqual(
      expect.objectContaining({ name: "Cash", salesInvoice: 0 })
    );
  });

  /**
   * Kelebihan bayar dilaporkan sebagai SELISIH bersih: yang diterima dikurangi
   * yang dikembalikan. Kalau tandanya terbalik, pengembalian uang ke pelanggan
   * akan terbaca sebagai penerimaan dan kas hari itu tampak lebih besar dari
   * yang sebenarnya.
   */
  /*
    Pengembalian diskon faktur adalah uang KELUAR lewat metodenya sendiri:
    bayar tunai 5.000 dengan diskon 1.000 yang dikembalikan via transfer
    berarti +5.000 di baris Cash dan rebate 1.000 di baris transfernya.
  */
  it("kolom rebate memecah pengembalian diskon per metode", async () => {
    const repo = repoSiapPakai();
    repo.paymentMethod.fetchAll.mockResolvedValue([
      { id: 2, name: "Transfer BCA" },
    ]);
    repo.salesInvoicePayment.fetchPaymentsByDate.mockResolvedValue([
      { payment_method_id: null, value: 5000 },
    ]);
    repo.salesInvoiceRebate.sumByDate.mockResolvedValue([
      { payment_method_id: 2, value: 1000 },
      { payment_method_id: null, value: 250 },
    ]);

    const res = await request(app(repo))
      .post("/money-receipt")
      .send({ date: "2024-03-15" });

    const cash = res.body[0];
    expect(cash.salesInvoice).toBe(5000);
    expect(cash.rebate).toBe(250);

    const transfer = res.body.find((x: any) => x.id === 2);
    expect(transfer.rebate).toBe(1000);
  });

  it("kolom overpayment adalah penerimaan dikurangi pengembalian", async () => {
    const repo = repoSiapPakai();
    repo.overpayment.fetchReportByReceiveDate.mockResolvedValue([
      { payment_method_id: null, value: 500 },
    ]);
    repo.overpayment.fetchReportByReturnDate.mockResolvedValue([
      { payment_method_id: null, value: 200 },
    ]);

    const res = await request(app(repo))
      .post("/money-receipt")
      .send({ date: "2024-03-15" });

    expect(res.body[0].overpayment).toBe(300);
  });

  it("overpayment bisa negatif bila pengembalian melebihi penerimaan", async () => {
    const repo = repoSiapPakai();
    repo.overpayment.fetchReportByReturnDate.mockResolvedValue([
      { payment_method_id: null, value: 200 },
    ]);

    const res = await request(app(repo))
      .post("/money-receipt")
      .send({ date: "2024-03-15" });

    expect(res.body[0].overpayment).toBe(-200);
  });

  it("menambahkan satu baris per metode pembayaran yang terdaftar", async () => {
    const repo = repoSiapPakai();
    repo.paymentMethod.fetchAll.mockResolvedValue([
      { id: 1, name: "Transfer BCA" },
      { id: 2, name: "Transfer Mandiri" },
    ]);
    repo.salesInvoicePayment.fetchPaymentsByDate.mockResolvedValue([
      { payment_method_id: 1, value: 1000 },
    ]);
    repo.salesDepositPayment.fetchPaymentsByDate.mockResolvedValue([
      { payment_method_id: 2, value: 400 },
    ]);
    repo.salesReturn.fetchPaymentsByDate.mockResolvedValue([
      { payment_method_id: 1, value: 25 },
    ]);
    repo.overpayment.fetchReportByReceiveDate.mockResolvedValue([
      { payment_method_id: 1, value: 90 },
    ]);
    repo.overpayment.fetchReportByReturnDate.mockResolvedValue([
      { payment_method_id: 1, value: 40 },
    ]);

    const res = await request(app(repo))
      .post("/money-receipt")
      .send({ date: "2024-03-15" });

    expect(res.body).toHaveLength(4); // Cash + DOR + dua metode
    expect(res.body[2]).toEqual({
      id: 1,
      name: "Transfer BCA",
      salesInvoice: 1000,
      salesDeposit: 0,
      salesReturn: 25,
      overpayment: 50,
      rebate: 0,
    });
    expect(res.body[3]).toEqual({
      id: 2,
      name: "Transfer Mandiri",
      salesInvoice: 0,
      salesDeposit: 400,
      salesReturn: 0,
      overpayment: 0,
      rebate: 0,
    });
  });

  describe("baris DOR", () => {
    /**
     * DOR (giro) datang dari dua sumber terpisah: pembayaran invoice dan
     * pembayaran titipan. Keduanya harus digabung per nama sales supaya satu
     * sales muncul satu kali. Kalau tidak, penagihan ke sales yang sama dibaca
     * dua kali dan setorannya tampak lebih besar dari kenyataan.
     */
    it("menggabungkan giro invoice dan giro titipan dari sales yang sama", async () => {
      const repo = repoSiapPakai();
      repo.salesDepositPayment.fetchDORPaymentsByDate.mockResolvedValue([
        { sales: "BUDI", value: 100 },
      ]);
      repo.salesInvoicePayment.fetchDORPaymentsByDate.mockResolvedValue([
        { sales: "BUDI", value: 250 },
      ]);

      const res = await request(app(repo))
        .post("/money-receipt")
        .send({ date: "2024-03-15" });

      expect(res.body[1]).toEqual({
        id: 0,
        name: "DOR",
        data: [{ sales: "BUDI", salesInvoice: 250, salesDeposit: 100 }],
      });
    });

    it("menjumlahkan beberapa baris giro milik satu sales", async () => {
      const repo = repoSiapPakai();
      repo.salesDepositPayment.fetchDORPaymentsByDate.mockResolvedValue([
        { sales: "BUDI", value: 100 },
        { sales: "BUDI", value: 40 },
      ]);
      repo.salesInvoicePayment.fetchDORPaymentsByDate.mockResolvedValue([
        { sales: "BUDI", value: 250 },
        { sales: "BUDI", value: 10 },
      ]);

      const res = await request(app(repo))
        .post("/money-receipt")
        .send({ date: "2024-03-15" });

      expect(res.body[1].data).toEqual([
        { sales: "BUDI", salesInvoice: 260, salesDeposit: 140 },
      ]);
    });

    it("memisahkan sales yang berbeda menjadi baris sendiri-sendiri", async () => {
      const repo = repoSiapPakai();
      repo.salesDepositPayment.fetchDORPaymentsByDate.mockResolvedValue([
        { sales: "BUDI", value: 100 },
      ]);
      repo.salesInvoicePayment.fetchDORPaymentsByDate.mockResolvedValue([
        { sales: "ANI", value: 250 },
      ]);

      const res = await request(app(repo))
        .post("/money-receipt")
        .send({ date: "2024-03-15" });

      // Titipan diproses lebih dulu, jadi BUDI muncul sebelum ANI.
      expect(res.body[1].data).toEqual([
        { sales: "BUDI", salesInvoice: 0, salesDeposit: 100 },
        { sales: "ANI", salesInvoice: 250, salesDeposit: 0 },
      ]);
    });

    /**
     * Giro tanpa nama sales (null) tetap dikumpulkan menjadi satu baris
     * tersendiri, bukan dibuang. Penting supaya uang yang masuk tidak menghilang
     * dari rekap hanya karena nama salesnya belum diisi.
     */
    it("giro tanpa nama sales tetap muncul sebagai satu baris null", async () => {
      const repo = repoSiapPakai();
      repo.salesDepositPayment.fetchDORPaymentsByDate.mockResolvedValue([
        { sales: null, value: 100 },
      ]);
      repo.salesInvoicePayment.fetchDORPaymentsByDate.mockResolvedValue([
        { sales: null, value: 250 },
      ]);

      const res = await request(app(repo))
        .post("/money-receipt")
        .send({ date: "2024-03-15" });

      expect(res.body[1].data).toEqual([
        { sales: null, salesInvoice: 250, salesDeposit: 100 },
      ]);
    });
  });

  it("membalas 500 bila salah satu sumber gagal", async () => {
    const repo = repoSiapPakai();
    repo.overpayment.fetchReportByReceiveDate.mockRejectedValue(
      new Error("kueri kelebihan bayar gagal")
    );

    const res = await request(app(repo))
      .post("/money-receipt")
      .send({ date: "2024-03-15" });

    expect(res.status).toBe(500);
  });

  /**
   * CACAT: badan balasan galat dikirim sebagai objek Error mentah.
   *
   * `res.status(500).send(error)` pada objek Error menghasilkan JSON "{}",
   * karena message dan stack bukan properti yang bisa dihitung. Pemanggil
   * menerima badan KOSONG alih-alih key i18n seperti
   * ErrorList["Internal server error"] yang dipakai controller lain, jadi
   * frontend tidak punya apa pun untuk ditampilkan.
   */
  it("CACAT: badan galat berupa objek kosong, bukan key i18n", async () => {
    const repo = repoSiapPakai();
    repo.paymentMethod.fetchAll.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo))
      .post("/money-receipt")
      .send({ date: "2024-03-15" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({});
  });

  /**
   * CACAT: tanggal yang tidak masuk akal diteruskan sebagai Invalid Date.
   *
   * Skema rute untuk endpoint ini (dateSchema) hanya memastikan bidang `date`
   * ADA — bentuknya tidak diperiksa sama sekali. Controller langsung memanggil
   * `new Date(req.body.date)`, dan teks yang bukan tanggal menghasilkan
   * Invalid Date yang diteruskan diam-diam ke ketujuh kueri.
   *
   * Akibatnya laporan penerimaan uang untuk tanggal ngawur tidak ditolak
   * dengan pesan yang jelas; ia dijawab 200 berisi rekap kosong, dan pengguna
   * menyimpulkan bahwa hari itu memang tidak ada uang masuk.
   */
  it("CACAT: tanggal ngawur diteruskan sebagai Invalid Date, bukan ditolak", async () => {
    const repo = repoSiapPakai();

    const res = await request(app(repo))
      .post("/money-receipt")
      .send({ date: "bukan-tanggal" });

    expect(res.status).toBe(200);
    const [tanggal] = repo.salesInvoicePayment.fetchPaymentsByDate.mock
      .calls[0] as [Date];
    expect(Number.isNaN(tanggal.getTime())).toBe(true);
  });
});

describe("POST /money-receipt/download — unduhan rincian penerimaan", () => {
  it("membungkus hasil repository di dalam properti data", async () => {
    const repo = repoSiapPakai();
    repo.salesInvoicePayment.downloadReport.mockResolvedValue([
      { name: "INV-001", value: 1000 },
    ]);

    const res = await request(app(repo))
      .post("/money-receipt/download")
      .send({ date: "2024-03-15" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ name: "INV-001", value: 1000 }] });
  });

  it("meneruskan tanggal permintaan ke repository", async () => {
    const repo = repoSiapPakai();

    await request(app(repo))
      .post("/money-receipt/download")
      .send({ date: "2024-03-15T00:00:00.000Z" });

    expect(repo.salesInvoicePayment.downloadReport).toHaveBeenCalledWith(
      new Date("2024-03-15T00:00:00.000Z")
    );
  });

  /**
   * Meski namanya "download", handler ini TIDAK menyetel Content-Disposition
   * maupun tipe berkas: ia mengirim JSON biasa dan berkasnya dirakit di sisi
   * frontend. Diuji supaya jelas bahwa peramban tidak memunculkan dialog simpan
   * berkas dari endpoint ini.
   */
  it("tidak menyetel header unduhan berkas, hanya mengirim JSON", async () => {
    const repo = repoSiapPakai();

    const res = await request(app(repo))
      .post("/money-receipt/download")
      .send({ date: "2024-03-15" });

    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.headers["content-disposition"]).toBeUndefined();
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repoSiapPakai();
    repo.salesInvoicePayment.downloadReport.mockRejectedValue(
      new Error("kueri unduhan gagal")
    );

    const res = await request(app(repo))
      .post("/money-receipt/download")
      .send({ date: "2024-03-15" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({});
  });
});

describe("POST /money-receipt/dor — giro sepanjang rentang tanggal", () => {
  it("membalas 200 berisi satu baris DOR", async () => {
    const repo = repoSiapPakai();
    repo.salesDepositPayment.fetchDORPaymentsByDateRange.mockResolvedValue([
      { sales: "BUDI", value: 100 },
    ]);
    repo.salesInvoicePayment.fetchDORPaymentsByDateRange.mockResolvedValue([
      { sales: "BUDI", value: 250 },
      { sales: "ANI", value: 75 },
    ]);

    const res = await request(app(repo))
      .post("/money-receipt/dor")
      .send({ startDate: "2024-03-01", endDate: "2024-03-31" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 0,
      name: "DOR",
      data: [
        { sales: "BUDI", salesInvoice: 250, salesDeposit: 100 },
        { sales: "ANI", salesInvoice: 75, salesDeposit: 0 },
      ],
    });
  });

  it("meneruskan rentang tanggal ke kedua sumber giro", async () => {
    const repo = repoSiapPakai();

    await request(app(repo)).post("/money-receipt/dor").send({
      startDate: "2024-03-01T00:00:00.000Z",
      endDate: "2024-03-31T00:00:00.000Z",
    });

    const mulai = new Date("2024-03-01T00:00:00.000Z");
    const selesai = new Date("2024-03-31T00:00:00.000Z");
    expect(
      repo.salesInvoicePayment.fetchDORPaymentsByDateRange
    ).toHaveBeenCalledWith(mulai, selesai);
    expect(
      repo.salesDepositPayment.fetchDORPaymentsByDateRange
    ).toHaveBeenCalledWith(mulai, selesai);
  });

  it("membalas daftar kosong bila tidak ada giro pada rentang itu", async () => {
    const repo = repoSiapPakai();

    const res = await request(app(repo))
      .post("/money-receipt/dor")
      .send({ startDate: "2024-03-01", endDate: "2024-03-31" });

    expect(res.body).toEqual({ id: 0, name: "DOR", data: [] });
  });

  /**
   * CACAT BERAT: fetchDorMoneyReceipt tidak punya penanganan galat sama sekali.
   *
   * Dua handler di atasnya dibungkus try/catch dan membalas 500. Handler ini
   * tidak. Karena `async`, penolakan dari repository menjadi promise yang
   * ditolak; Express 4 tidak menangani penolakan promise, dan Node 15 ke atas
   * menghentikan proses pada unhandled rejection.
   *
   * Jadi satu gangguan basis data sesaat saat membuka rekap giro tidak berujung
   * 500 bagi satu pemanggil, melainkan MEMATIKAN SELURUH SERVER — semua
   * pengguna lain ikut terputus di tengah pekerjaan.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu, persis yang dialami
   * pemanggil sungguhan sebelum prosesnya tumbang.
   */
  it("CACAT: fetchDorMoneyReceipt menolak tanpa membalas apa pun saat repository gagal", async () => {
    const repo = repoSiapPakai();
    repo.salesInvoicePayment.fetchDORPaymentsByDateRange.mockRejectedValue(
      new Error("koneksi putus")
    );
    const c = controller(repo);

    const req = {
      body: { startDate: "2024-03-01", endDate: "2024-03-31" },
      query: {},
    } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.fetchDorMoneyReceipt(req, res)).rejects.toThrow(
      "koneksi putus"
    );
    // Tidak ada balasan yang pernah dikirim — itulah sebabnya permintaannya
    // menggantung alih-alih menerima 500.
    expect((res as any).status).not.toHaveBeenCalled();
  });

  /**
   * CACAT: rentang tanggal tidak diperiksa sama sekali.
   *
   * Skema rute (dateRangeSchema) hanya memastikan kedua bidang ADA. Controller
   * tidak memeriksa bahwa startDate lebih awal dari endDate, dan tidak menolak
   * teks yang bukan tanggal. Rentang terbalik diteruskan apa adanya sehingga
   * kueri mengembalikan kosong, dan pengguna membaca "tidak ada giro" padahal
   * yang salah adalah tanggal yang diketiknya.
   */
  it("CACAT: rentang tanggal terbalik diteruskan tanpa penolakan", async () => {
    const repo = repoSiapPakai();

    const res = await request(app(repo)).post("/money-receipt/dor").send({
      startDate: "2024-03-31T00:00:00.000Z",
      endDate: "2024-03-01T00:00:00.000Z",
    });

    expect(res.status).toBe(200);
    expect(
      repo.salesInvoicePayment.fetchDORPaymentsByDateRange
    ).toHaveBeenCalledWith(
      new Date("2024-03-31T00:00:00.000Z"),
      new Date("2024-03-01T00:00:00.000Z")
    );
  });
});
