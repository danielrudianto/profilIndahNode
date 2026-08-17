import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ReceivableController.
 *
 * Ini adalah handler PELUNASAN PIUTANG: pelanggan membayar faktur yang belum
 * lunas, dan controller memutuskan berapa yang boleh tercatat serta apakah
 * fakturnya menjadi lunas. Semua keputusan itu soal uang, jadi yang paling
 * banyak diperiksa di berkas ini adalah NILAI yang sampai ke repository —
 * nominal, dan bendera is_paid — bukan sekadar status HTTP.
 *
 * Batas pembayarannya dihitung sendiri oleh controller:
 *
 *   nilai faktur  = jumlah (kuantitas x (harga - diskon baris))
 *                   + ongkos kirim + biaya layanan - diskon faktur
 *   sisa tagihan  = nilai faktur - jumlah pembayaran yang sudah tercatat
 *
 * Controller menerima dua repository lewat konstruktor, jadi keduanya ditiru.
 * SocketHelper ikut ditiru mengikuti bentuk acuan.
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

import ReceivableController from "../../src/controllers/receivable.controller";

function receivableRepositoryTiruan() {
  return {
    fetch: jest.fn(),
    fetchByCustomerID: jest.fn(),
    create: jest.fn(),
    addReceivableValue: jest.fn(),
    getReceivableValue: jest.fn(),
  };
}

function salesInvoiceRepositoryTiruan() {
  return {
    fetchByID: jest.fn(),
  };
}

type RecvRepo = ReturnType<typeof receivableRepositoryTiruan>;
type InvRepo = ReturnType<typeof salesInvoiceRepositoryTiruan>;

function app(recv: RecvRepo, inv: InvRepo) {
  const c = new ReceivableController(recv as never, inv as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
    next();
  });
  a.post("/payment", c.createPayment);
  a.get("/customer/:id", c.fetchByCustomerID);
  a.get("/", c.fetch);
  return a;
}

/**
 * Faktur dengan nilai 100.000:
 *   2 x (40.000 - 5.000) = 70.000
 *   + ongkos kirim 15.000 + layanan 20.000 - diskon faktur 5.000 = 100.000
 * Belum ada pembayaran, jadi sisa tagihannya juga 100.000.
 */
function faktur(ubah: Record<string, unknown> = {}) {
  return {
    id: 5,
    isDelete: false,
    delivery: 15000,
    service: 20000,
    discount: 5000,
    sales_invoice: [{ quantity: 2, price: 40000, discount: 5000 }],
    sales_invoice_payment: [],
    ...ubah,
  };
}

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST /payment — perhitungan sisa tagihan", () => {
  it("menghitung sisa tagihan dari baris, ongkos kirim, layanan, dan diskon", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());
    recv.create.mockResolvedValue({ id: 1, value: 100000 });

    const res = await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      full_payment: true,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(res.status).toBe(201);
    // 70.000 + 15.000 + 20.000 - 5.000 = 100.000
    expect(recv.create).toHaveBeenCalledWith({
      date: new Date("2024-05-01"),
      payment_method_id: 2,
      sales_invoice_code_id: 5,
      amount: 100000,
      is_paid: true,
    });
  });

  it("mengurangi pembayaran yang sudah tercatat dari sisa tagihan", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(
      faktur({ sales_invoice_payment: [{ value: 30000 }, { value: 20000 }] })
    );
    recv.create.mockResolvedValue({ id: 1 });

    await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      full_payment: true,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    // 100.000 - (30.000 + 20.000) = 50.000
    expect(recv.create.mock.calls[0][0].amount).toBe(50000);
  });

  it("pembayaran sebagian dicatat apa adanya dan faktur belum lunas", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());
    recv.create.mockResolvedValue({ id: 1 });

    const res = await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      amount: 40000,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(res.status).toBe(201);
    expect(recv.create.mock.calls[0][0].amount).toBe(40000);
    expect(recv.create.mock.calls[0][0].is_paid).toBe(false);
  });

  it("pembayaran sebagian yang pas menutup sisa tagihan menandai faktur lunas", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());
    recv.create.mockResolvedValue({ id: 1 });

    await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      amount: 100000,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(recv.create.mock.calls[0][0].is_paid).toBe(true);
  });

  it("menolak pembayaran yang melebihi sisa tagihan dengan 400", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());

    const res = await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      amount: 100001,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Receivable exceed sales invoice"]);
    // Tidak ada baris pembayaran yang tercipta — ini yang melindungi kas.
    expect(recv.create).not.toHaveBeenCalled();
  });

  it("meneruskan payment_method_id null untuk pembayaran tunai tanpa metode", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());
    recv.create.mockResolvedValue({ id: 1 });

    await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      amount: 1000,
      payment_method_id: null,
      sales_invoice_id: 5,
    });

    expect(recv.create.mock.calls[0][0].payment_method_id).toBeNull();
  });
});

describe("POST /payment — penjagaan faktur", () => {
  it("membalas 404 bila faktur tidak ada", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(null);

    const res = await request(app(recv, inv))
      .post("/payment")
      .send({ date: "2024-05-01", amount: 1000, sales_invoice_id: 5 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Sales invoice not found"]);
    expect(recv.create).not.toHaveBeenCalled();
  });

  it("membalas 404 bila faktur sudah dihapus", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur({ isDelete: true }));

    const res = await request(app(recv, inv))
      .post("/payment")
      .send({ date: "2024-05-01", amount: 1000, sales_invoice_id: 5 });

    expect(res.status).toBe(404);
    expect(recv.create).not.toHaveBeenCalled();
  });

  it("mencari faktur lebih dulu, baru menulis pembayaran", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    const urutan: string[] = [];
    inv.fetchByID.mockImplementation(async () => {
      urutan.push("fetchByID");
      return faktur();
    });
    recv.create.mockImplementation(async () => {
      urutan.push("create");
      return { id: 1 };
    });

    await request(app(recv, inv))
      .post("/payment")
      .send({ date: "2024-05-01", amount: 1000, sales_invoice_id: 5 });

    expect(urutan).toEqual(["fetchByID", "create"]);
  });

  it("membalas 500 bila repository gagal", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(recv, inv))
      .post("/payment")
      .send({ date: "2024-05-01", amount: 1000, sales_invoice_id: 5 });

    expect(res.status).toBe(500);
  });
});

describe("POST /payment — cacat yang menyangkut uang", () => {
  /**
   * CACAT BERAT: `full_payment` sama sekali tidak diperiksa terhadap sisa
   * tagihan.
   *
   * Jalur pelunasan penuh langsung menulis `amount: sisa tagihan` tanpa
   * memeriksa apakah sisanya masih positif. Untuk faktur yang SUDAH lunas,
   * sisanya nol, dan controller tetap membuat baris pembayaran bernilai 0.
   *
   * Akibatnya bagi pengguna: menekan tombol "Lunasi" dua kali menghasilkan
   * dua baris pembayaran di riwayat faktur, satu di antaranya Rp 0. Kasir
   * yang mencocokkan setoran akan melihat transaksi yang tidak pernah ada.
   */
  it("CACAT: pelunasan penuh pada faktur yang sudah lunas membuat pembayaran Rp 0", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(
      faktur({ sales_invoice_payment: [{ value: 100000 }] })
    );
    recv.create.mockResolvedValue({ id: 1 });

    const res = await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      full_payment: true,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(res.status).toBe(201);
    expect(recv.create.mock.calls[0][0].amount).toBe(0);
  });

  /**
   * CACAT BERAT: pelunasan penuh pada faktur yang TERLANJUR kelebihan bayar
   * menciptakan pembayaran BERNILAI NEGATIF.
   *
   * Sisa tagihan dihitung sebagai nilai faktur dikurangi pembayaran yang sudah
   * ada. Bila pembayarannya sudah melebihi nilai faktur — hal yang bisa
   * terjadi lewat jalur lain seperti konfirmasi deposit — hasilnya negatif,
   * dan negatif itu langsung ditulis sebagai nominal pembayaran.
   *
   * Akibatnya bagi pengguna: baris pembayaran minus akan MENGURANGI total yang
   * sudah dibayar pelanggan. Faktur ditandai lunas sekaligus riwayat kasnya
   * berkurang tanpa ada uang yang benar-benar keluar. Rekonsiliasi kas dan
   * pembukuan pelanggan langsung selisih sebesar kelebihan bayarnya.
   */
  it("CACAT: pelunasan penuh pada faktur kelebihan bayar membuat pembayaran negatif", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(
      faktur({ sales_invoice_payment: [{ value: 130000 }] })
    );
    recv.create.mockResolvedValue({ id: 1 });

    const res = await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      full_payment: true,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(res.status).toBe(201);
    // 100.000 - 130.000 = -30.000
    expect(recv.create.mock.calls[0][0].amount).toBe(-30000);
    expect(recv.create.mock.calls[0][0].is_paid).toBe(true);
  });

  /**
   * CACAT: nominal negatif pada pembayaran sebagian tidak ditolak.
   *
   * Satu-satunya penjagaan adalah `amount > sisa tagihan`. Nominal negatif
   * selalu lolos syarat itu dan ditulis apa adanya.
   *
   * Akibatnya bagi pengguna: siapa pun yang boleh mencatat pembayaran bisa
   * MENAIKKAN piutang seorang pelanggan dengan mengirim nominal minus. Riwayat
   * pembayaran faktur pun ikut kacau karena berisi baris yang mengurangi kas.
   */
  it("CACAT: nominal negatif diterima dan ditulis apa adanya", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());
    recv.create.mockResolvedValue({ id: 1 });

    const res = await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      amount: -50000,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(res.status).toBe(201);
    expect(recv.create.mock.calls[0][0].amount).toBe(-50000);
  });

  /**
   * SEMBUH: penandaan lunas kini memakai toleransi pembulatan, bukan
   * kesamaan persis.
   *
   * Dulu `amount === maximumPaymentValue`: teks "100000" tidak pernah
   * sama dengan angka 100000, dan sisa Rp 1-5 hasil pembulatan kasir
   * menggantungkan faktur "belum lunas" selamanya. Kini
   * `sisa - nominal <= PAYMENT_ROUNDING_TOLERANCE` — pengurangan
   * memaksa teks menjadi angka, dan selisih receh dianggap lunas.
   */
  it("SEMBUH: nominal teks yang pas melunasi kini menandai lunas", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());
    recv.create.mockResolvedValue({ id: 1 });

    await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      amount: "100000",
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(recv.create.mock.calls[0][0].amount).toBe("100000");
    expect(recv.create.mock.calls[0][0].is_paid).toBe(true);
  });

  it("sisa dalam toleransi (Rp 5) ikut ditandai lunas", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());
    recv.create.mockResolvedValue({ id: 1 });

    await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      amount: 99995,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(recv.create.mock.calls[0][0].is_paid).toBe(true);
  });

  it("sisa di atas toleransi tetap belum lunas", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());
    recv.create.mockResolvedValue({ id: 1 });

    await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      amount: 99994,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(recv.create.mock.calls[0][0].is_paid).toBe(false);
  });

  /**
   * CACAT: total piutang di Redis tidak pernah dikurangi saat pelanggan bayar.
   *
   * `ReceivableRepository.addReceivableValue` adalah pencatat total piutang
   * berjalan; SalesInvoiceController memanggilnya saat faktur kredit dibuat.
   * Tidak ada satu pun pemanggilan pengurangnya di sini.
   *
   * Akibatnya bagi pengguna: angka total piutang hanya bisa NAIK. Setelah
   * beberapa siklus tagih-bayar, ringkasan piutang di dasbor tidak lagi
   * berhubungan dengan tagihan yang sebenarnya beredar.
   */
  it("CACAT: pembayaran tidak mengurangi total piutang berjalan", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());
    recv.create.mockResolvedValue({ id: 1 });

    await request(app(recv, inv)).post("/payment").send({
      date: "2024-05-01",
      amount: 100000,
      payment_method_id: 2,
      sales_invoice_id: 5,
    });

    expect(recv.addReceivableValue).not.toHaveBeenCalled();
  });

  /**
   * CACAT: tanggal pembayaran yang tidak dikirim menjadi Invalid Date.
   *
   * Akibatnya bagi pengguna: uang yang masuk tidak muncul di laporan kas
   * tanggal mana pun, padahal barisnya ada di riwayat faktur.
   */
  it("CACAT: tanggal yang hilang diteruskan sebagai Invalid Date", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    inv.fetchByID.mockResolvedValue(faktur());
    recv.create.mockResolvedValue({ id: 1 });

    await request(app(recv, inv))
      .post("/payment")
      .send({ amount: 1000, sales_invoice_id: 5 });

    expect(Number.isNaN(recv.create.mock.calls[0][0].date.getTime())).toBe(
      true
    );
  });
});

describe("GET / dan GET /customer/:id", () => {
  it("fetch meneruskan hasil repository apa adanya", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    recv.fetch.mockResolvedValue([{ id: 1, value: 100000 }]);

    const res = await request(app(recv, inv)).get("/");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, value: 100000 }]);
  });

  it("fetch membalas 500 bila repository gagal", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    recv.fetch.mockRejectedValue(new Error("koneksi putus"));

    expect((await request(app(recv, inv)).get("/")).status).toBe(500);
  });

  it("fetchByCustomerID menerjemahkan halaman dan ukuran halaman", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    recv.fetchByCustomerID.mockResolvedValue({ data: [], count: 0 });

    await request(app(recv, inv)).get("/customer/7?page=2&pageSize=25");

    expect(recv.fetchByCustomerID).toHaveBeenCalledWith({
      customerID: 7,
      page: 2,
      pageSize: 25,
    });
  });

  it("id 0 diartikan sebagai seluruh pelanggan", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    recv.fetchByCustomerID.mockResolvedValue({ data: [], count: 0 });

    await request(app(recv, inv)).get("/customer/0");

    expect(recv.fetchByCustomerID).toHaveBeenCalledWith(
      expect.objectContaining({ customerID: null, page: 1, pageSize: 10 })
    );
  });

  it("fetchByCustomerID membalas 500 bila repository gagal", async () => {
    const recv = receivableRepositoryTiruan();
    const inv = salesInvoiceRepositoryTiruan();
    recv.fetchByCustomerID.mockRejectedValue(new Error("koneksi putus"));

    expect((await request(app(recv, inv)).get("/customer/7")).status).toBe(500);
  });
});
