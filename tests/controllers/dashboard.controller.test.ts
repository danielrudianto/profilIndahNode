import express from "express";
import request from "supertest";

/**
 * Perilaku DashboardController.
 *
 * Mengikuti acuan company.controller.test.ts: keempat repository disuntikkan
 * lewat konstruktor sebagai objek berisi jest.fn(). Controller ini tidak
 * menyimpan apa pun — ia hanya menyusun rentang tanggal, memanggil repository
 * secara berbarengan, lalu menjumlahkan hasilnya. Maka yang diuji adalah
 * RENTANG TANGGAL yang diteruskan dan ARITMETIKA ringkasannya.
 *
 * SocketHelper tetap ditiru mengikuti pola berkas acuan, supaya getIO() yang
 * belum diinisialisasi tidak melempar bila kelak dashboard ikut berkirim
 * peristiwa.
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

import DashboardController from "../../src/controllers/dashboard.controller";

function fakturTiruan() {
  return { fetchByDateRange: jest.fn() };
}
function penerimaanTiruan() {
  return { fetchByDateRange: jest.fn() };
}
function promosiTiruan() {
  return { countActive: jest.fn().mockResolvedValue(0) };
}
function setoranTiruan() {
  return { countPending: jest.fn().mockResolvedValue(0) };
}

type Faktur = ReturnType<typeof fakturTiruan>;
type Penerimaan = ReturnType<typeof penerimaanTiruan>;
type Promosi = ReturnType<typeof promosiTiruan>;
type Setoran = ReturnType<typeof setoranTiruan>;

function app(
  faktur: Faktur,
  penerimaan: Penerimaan,
  promosi: Promosi = promosiTiruan(),
  setoran: Setoran = setoranTiruan()
) {
  const c = new DashboardController(
    faktur as never,
    penerimaan as never,
    promosi as never,
    setoran as never
  );
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
    next();
  });
  a.post("/administrator", c.fetchAdministratorDashboard);
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

describe("POST /administrator — ringkasan untuk administrator", () => {
  function siapkan() {
    const faktur = fakturTiruan();
    const penerimaan = penerimaanTiruan();
    const promosi = promosiTiruan();
    const setoran = setoranTiruan();

    faktur.fetchByDateRange
      .mockResolvedValueOnce(penjualan(1_000_000))
      .mockResolvedValueOnce(penjualan(800_000));
    penerimaan.fetchByDateRange
      .mockResolvedValueOnce([
        penerimaanBarang(500_000, 25_000),
        penerimaanBarang(200_000, 0),
      ])
      .mockResolvedValueOnce([penerimaanBarang(300_000, 50_000)]);
    promosi.countActive.mockResolvedValue(4);
    setoran.countPending.mockResolvedValue(7);

    return { faktur, penerimaan, promosi, setoran };
  }

  it("membalas 200 berisi penjualan, pembelian, setoran, dan promosi", async () => {
    const { faktur, penerimaan, promosi, setoran } = siapkan();

    const res = await request(app(faktur, penerimaan, promosi, setoran)).post(
      "/administrator"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      sales: { current: 1_000_000, previous: 800_000 },
      // Pembelian dijumlahkan sebagai nilai dikurangi potongan tiap baris:
      // (500.000 - 25.000) + (200.000 - 0) = 675.000
      purchase: { current: 675_000, previous: 250_000 },
      deposit: 7,
      promotion: 4,
    });
  });

  it("membaca penjualan hari ini dan kemarin, masing-masing satu hari penuh", async () => {
    const { faktur, penerimaan, promosi, setoran } = siapkan();

    await request(app(faktur, penerimaan, promosi, setoran)).post(
      "/administrator"
    );

    const [awal1, akhir1] = faktur.fetchByDateRange.mock.calls[0] as Date[];
    const [awal2, akhir2] = faktur.fetchByDateRange.mock.calls[1] as Date[];
    // Rentang hari ini: tanggal awal dan akhir sama.
    expect(awal1.toDateString()).toBe(hariIni.toDateString());
    expect(akhir1.toDateString()).toBe(hariIni.toDateString());
    // Rentang kemarin: sehari sebelumnya.
    expect(awal2.toDateString()).toBe(kemarin.toDateString());
    expect(akhir2.toDateString()).toBe(kemarin.toDateString());
  });

  it("memakai rentang yang sama untuk pembelian", async () => {
    const { faktur, penerimaan, promosi, setoran } = siapkan();

    await request(app(faktur, penerimaan, promosi, setoran)).post(
      "/administrator"
    );

    const [awal1] = penerimaan.fetchByDateRange.mock.calls[0] as Date[];
    const [awal2] = penerimaan.fetchByDateRange.mock.calls[1] as Date[];
    expect(awal1.toDateString()).toBe(hariIni.toDateString());
    expect(awal2.toDateString()).toBe(kemarin.toDateString());
    expect(promosi.countActive).toHaveBeenCalledTimes(1);
    expect(setoran.countPending).toHaveBeenCalledTimes(1);
  });

  it("membalas nol untuk pembelian bila tidak ada penerimaan barang", async () => {
    const faktur = fakturTiruan();
    const penerimaan = penerimaanTiruan();
    faktur.fetchByDateRange.mockResolvedValue(penjualan(0));
    penerimaan.fetchByDateRange.mockResolvedValue([]);

    const res = await request(app(faktur, penerimaan)).post("/administrator");

    expect(res.status).toBe(200);
    expect(res.body.purchase).toEqual({ current: 0, previous: 0 });
  });

  /**
   * CACAT: kegagalan dibalas dengan objek galat, bukan key i18n.
   *
   * `res.status(500).send(error)` mengirim objek Error apa adanya. `message`
   * milik Error bersifat non-enumerable, jadi yang sampai ke peramban adalah
   * JSON tanpa pesan apa pun — dan pada galat Prisma, justru `code` dan `meta`
   * yang enumerable itulah yang ikut terkirim.
   *
   * Akibat bagi pengguna: dashboard yang gagal dimuat hanya menampilkan galat
   * kosong, sementara rincian internal basis data bocor ke klien. Ketiga
   * handler di controller ini melakukan hal yang sama.
   */
  it("CACAT: kegagalan dibalas 500 berisi objek galat tanpa pesan", async () => {
    const faktur = fakturTiruan();
    const penerimaan = penerimaanTiruan();
    faktur.fetchByDateRange.mockRejectedValue(
      Object.assign(new Error("koneksi putus"), { code: "P1001" })
    );
    penerimaan.fetchByDateRange.mockResolvedValue([]);

    const res = await request(app(faktur, penerimaan)).post("/administrator");

    expect(res.status).toBe(500);
    expect(res.body.message).toBeUndefined();
    expect(res.text).not.toContain("error.internalServer");
    expect(res.body.code).toBe("P1001");
  });

  /**
   * CACAT: angka penjualan di dashboard tidak sama dengan angka di laporan
   * penjualan untuk hari yang sama.
   *
   * Dashboard memakai `result.value` mentah. Laporan penjualan
   * (SalesReportController.fetchSalesReport) menghitung
   * `value + delivery + service - discount`. Untuk data yang sama persis,
   * kedua layar menampilkan dua angka berbeda tanpa penjelasan apa pun.
   *
   * Lebih jauh lagi, di dalam handler ini sendiri perlakuannya tidak seragam:
   * pembelian DIKURANGI potongan tiap baris, penjualan TIDAK. Jadi kolom
   * "penjualan" bruto dibandingkan berdampingan dengan kolom "pembelian" neto,
   * dan selisih keduanya yang dibaca pemilik usaha sebagai margin selalu
   * lebih besar dari yang sebenarnya.
   */
  it("CACAT: penjualan dihitung bruto, pembelian neto", async () => {
    const faktur = fakturTiruan();
    const penerimaan = penerimaanTiruan();
    faktur.fetchByDateRange.mockResolvedValue({
      value: 1_000_000,
      discount: 300_000,
      delivery: 20_000,
      service: 10_000,
      salesInvoiceCount: 1,
      customerCount: 1,
    });
    penerimaan.fetchByDateRange.mockResolvedValue([
      penerimaanBarang(1_000_000, 300_000),
    ]);

    const res = await request(app(faktur, penerimaan)).post("/administrator");

    // Penjualan: potongan 300.000, ongkos kirim 20.000, dan jasa 10.000
    // semuanya diabaikan.
    expect(res.body.sales.current).toBe(1_000_000);
    // Pembelian: potongan 300.000 dikurangkan.
    expect(res.body.purchase.current).toBe(700_000);
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

  it("tidak menyentuh repository pembelian maupun setoran", async () => {
    const { faktur, penerimaan, promosi } = siapkan();
    const setoran = setoranTiruan();

    await request(app(faktur, penerimaan, promosi, setoran)).post("/sales");

    expect(penerimaan.fetchByDateRange).not.toHaveBeenCalled();
    expect(setoran.countPending).not.toHaveBeenCalled();
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

  it("tidak menyentuh repository penjualan maupun setoran", async () => {
    const { faktur, penerimaan, promosi } = siapkan();
    const setoran = setoranTiruan();

    await request(app(faktur, penerimaan, promosi, setoran)).post(
      "/purchasing"
    );

    expect(faktur.fetchByDateRange).not.toHaveBeenCalled();
    expect(setoran.countPending).not.toHaveBeenCalled();
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
