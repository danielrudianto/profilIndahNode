import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku SalesInvoiceController.
 *
 * Ini controller terberat di bagian penjualan: satu permintaan membuat faktur,
 * menaikkan piutang, mengeluarkan barang dari gudang, menurunkan stok, dan
 * menulis kartu stok — TUJUH repository sekaligus, tanpa satu transaksi yang
 * membungkusnya. Karena itu yang diperiksa di sini bukan hanya status HTTP,
 * melainkan:
 *
 *   nilai uang apa yang sampai ke tiap repository (nominal, diskon, ongkos
 *   kirim, biaya layanan), dan
 *   URUTAN pemanggilannya — karena kalau salah satu gagal di tengah, yang
 *   sudah tertulis sebelumnya tidak dibatalkan.
 *
 * SocketHelper ditiru mengikuti bentuk acuan. Antrean bullmq ikut ditiru
 * karena modul aslinya membuka koneksi Redis begitu diimpor; tanpa tiruan,
 * tesnya tidak akan pernah selesai.
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

const tambahAntrean = jest.fn().mockResolvedValue({ id: "job" });
jest.mock("../../src/utils/queue.helper", () => ({
  __esModule: true,
  queue: {
    add: (...args: unknown[]) => tambahAntrean(...args),
  },
}));

import SalesInvoiceController from "../../src/controllers/sales-invoice.controller";

function repositoriTiruan() {
  return {
    salesInvoice: {
      create: jest.fn(),
      generateName: jest.fn().mockReturnValue("INV-2024-11112222"),
      deleteByID: jest.fn(),
      fetchByID: jest.fn(),
      fetchAnnualArchives: jest.fn(),
      fetchArchives: jest.fn(),
      searchByReturns: jest.fn(),
      validateSalesReturn: jest.fn(),
    },
    receivable: {
      addReceivableValue: jest.fn(),
      create: jest.fn(),
    },
    salesReturn: {
      fetchBySalesInvoiceCodeID: jest.fn().mockResolvedValue(null),
    },
    stockOut: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      decreaseMany: jest.fn(),
    },
    productStock: {
      updateMany: jest.fn(),
    },
    salesInvoicePayment: {
      fetchPaymentsBySalesInvoiceCodeID: jest.fn(),
    },
    stockCard: {
      createMany: jest.fn().mockResolvedValue([]),
    },
  };
}

type Repos = ReturnType<typeof repositoriTiruan>;

function controller(r: Repos) {
  return new SalesInvoiceController(
    r.salesInvoice as never,
    r.receivable as never,
    r.salesReturn as never,
    r.stockOut as never,
    r.productStock as never,
    r.salesInvoicePayment as never,
    r.stockCard as never
  );
}

function app(r: Repos) {
  const c = controller(r);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
    next();
  });
  a.get("/archives", c.fetchAnnualArchives);
  a.post("/archives", c.fetchArchives);
  a.post("/sales-return", c.searchSalesReturn);
  a.post("/", c.create);
  a.get("/payment/:id", c.fetchPayments);
  a.get("/:id", c.fetchByID);
  a.delete("/:id", c.delete);
  return a;
}

/**
 * Faktur hasil simpan. Satu baris berisi 2 dus @ 12 pcs:
 *   nilai baris = 2 x (120.000 - 20.000) = 200.000
 *   + ongkos kirim 15.000 + layanan 10.000 - diskon faktur 5.000 = 220.000
 *   - pembayaran dimuka 50.000 = 170.000 piutang.
 */
function fakturTersimpan(ubah: Record<string, unknown> = {}) {
  return {
    id: 77,
    name: "INV-2024-11112222",
    customerID: 5,
    date: new Date("2024-05-01T00:00:00.000Z"),
    delivery: 15000,
    service: 10000,
    discount: 5000,
    isDelete: false,
    sales_invoice: [
      {
        id: 501,
        product_id: 10,
        product_unit_id: 3,
        quantity: 2,
        price: 120000,
        discount: 20000,
        product_unit: { conversion: 12 },
      },
    ],
    sales_invoice_payment: [{ value: 50000 }],
    ...ubah,
  };
}

const badanBuat = {
  customer_id: 5,
  discount: 5000,
  delivery: 15000,
  service: 10000,
  date: "2024-05-01",
  is_paid: false,
  sales: "budi santoso",
  uuid: "uuid-1",
  payment_term: 30,
  sales_invoice: [
    {
      product_id: 10,
      product_unit_id: 3,
      quantity: 2,
      price: 120000,
      discount: 20000,
    },
  ],
  sales_invoice_payment: [
    { date: "2024-05-01", payment_method_id: 2, value: 50000 },
  ],
};

beforeEach(() => {
  kirimSocket.mockClear();
  tambahAntrean.mockClear();
  process.env.LIMIT = "10";
});

describe("POST / — membuat faktur", () => {
  it("membalas 201 dan mengirim faktur hasil simpan", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    const res = await request(app(r)).post("/").send(badanBuat);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(77);
  });

  it("meneruskan nominal uang sebagai angka, utuh apa adanya", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    await request(app(r))
      .post("/")
      // Nominal dikirim sebagai teks: controller wajib mengangkakannya lebih
      // dulu supaya penjumlahan di hilir tidak berubah menjadi sambungan teks.
      .send({
        ...badanBuat,
        discount: "5000",
        delivery: "15000",
        service: "10000",
      });

    const arg = r.salesInvoice.create.mock.calls[0][0];
    expect(arg.discount).toBe(5000);
    expect(arg.delivery).toBe(15000);
    expect(arg.service).toBe(10000);
    expect(typeof arg.discount).toBe("number");
    expect(typeof arg.delivery).toBe("number");
    expect(typeof arg.service).toBe("number");
  });

  it("meneruskan baris barang apa adanya dan menormalkan pembayaran", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    await request(app(r))
      .post("/")
      .send({
        ...badanBuat,
        sales_invoice_payment: [
          { date: "2024-05-01", payment_method_id: 2, value: "50000" },
        ],
      });

    const arg = r.salesInvoice.create.mock.calls[0][0];
    // Baris barang tidak disentuh sama sekali oleh controller.
    expect(arg.sales_invoice).toEqual(badanBuat.sales_invoice);
    // Pembayaran dibungkus model: nominalnya diangkakan, tanggalnya menjadi
    // Date, dan sales_invoice_code_id sengaja 0 karena fakturnya belum ada.
    expect(arg.sales_invoice_payment).toHaveLength(1);
    expect(arg.sales_invoice_payment[0].value).toBe(50000);
    expect(typeof arg.sales_invoice_payment[0].value).toBe("number");
    expect(arg.sales_invoice_payment[0].payment_method_id).toBe(2);
    expect(arg.sales_invoice_payment[0].sales_invoice_code_id).toBe(0);
    expect(arg.sales_invoice_payment[0].date).toBeInstanceOf(Date);
  });

  it("menandai faktur langsung terkonfirmasi atas nama pengguna yang membuat", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    await request(app(r))
      .post("/")
      .send({ ...badanBuat, userId: 42 });

    const arg = r.salesInvoice.create.mock.calls[0][0];
    expect(arg.createdBy).toBe(42);
    expect(arg.confirmedBy).toBe(42);
    expect(arg.isConfirm).toBe(true);
    expect(arg.isDelete).toBe(false);
    expect(arg.name).toBe("INV-2024-11112222");
    expect(arg.uuid).toBe("uuid-1");
    // Nama sales dibakukan menjadi huruf besar sebelum disimpan.
    expect(arg.sales).toBe("BUDI SANTOSO");
    expect(arg.date.toISOString()).toBe("2024-05-01T00:00:00.000Z");
  });

  it("memakai tanggal hari ini bila tanggalnya tidak masuk akal", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    await request(app(r))
      .post("/")
      .send({ ...badanBuat, date: "bukan tanggal" });

    const arg = r.salesInvoice.create.mock.calls[0][0];
    expect(Number.isNaN(arg.date.getTime())).toBe(false);
  });
});

describe("POST / — piutang yang terbentuk", () => {
  it("menaikkan piutang sebesar tagihan dikurangi pembayaran dimuka", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    await request(app(r)).post("/").send(badanBuat);

    // 2 x (120.000 - 20.000) = 200.000
    // + 15.000 + 10.000 - 5.000 = 220.000
    // - 50.000 pembayaran dimuka = 170.000
    expect(r.receivable.addReceivableValue).toHaveBeenCalledWith(170000);
  });

  it("tidak menyentuh piutang bila faktur ditandai lunas", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    await request(app(r))
      .post("/")
      .send({ ...badanBuat, is_paid: true });

    expect(r.receivable.addReceivableValue).not.toHaveBeenCalled();
  });

  it("menghitung piutang dari faktur hasil simpan, bukan dari badan permintaan", async () => {
    const r = repositoriTiruan();
    // Repository membulatkan diskon menjadi 0; piutang harus mengikuti angka
    // yang benar-benar tersimpan.
    r.salesInvoice.create.mockResolvedValue(
      fakturTersimpan({ discount: 0, sales_invoice_payment: [] })
    );

    await request(app(r)).post("/").send(badanBuat);

    // 200.000 + 15.000 + 10.000 - 0 - 0 = 225.000
    expect(r.receivable.addReceivableValue).toHaveBeenCalledWith(225000);
  });
});

describe("POST / — barang keluar, stok, dan kartu stok", () => {
  it("mengalikan kuantitas dan membagi harga dengan konversi satuan", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    await request(app(r)).post("/").send(badanBuat);

    // 2 dus x 12 pcs = 24 pcs keluar; harga per pcs 120.000 / 12 = 10.000.
    expect(r.stockOut.create).toHaveBeenCalledWith([
      {
        stock_in_id: null,
        product_id: 10,
        adjustment_case_code_id: null,
        adjustment_case_id: null,
        date: new Date("2024-05-01T00:00:00.000Z"),
        quantity: 24,
        price: 10000,
        sales_invoice_id: 501,
        sales_invoice_code_id: 77,
      },
    ]);
  });

  it("memakai konversi 1 bila baris tidak punya satuan", async () => {
    const r = repositoriTiruan();
    const faktur = fakturTersimpan();
    faktur.sales_invoice[0].product_unit = null as never;
    r.salesInvoice.create.mockResolvedValue(faktur);

    await request(app(r)).post("/").send(badanBuat);

    expect(r.stockOut.create.mock.calls[0][0][0].quantity).toBe(2);
    expect(r.stockOut.create.mock.calls[0][0][0].price).toBe(120000);
  });

  it("mengurangi stok sebanyak kuantitas terkonversi", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    await request(app(r)).post("/").send(badanBuat);

    expect(r.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 10, quantity: -24 },
    ]);
  });

  it("menulis kartu stok dengan kuantitas gudang dan kuantitas tampilan", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    await request(app(r)).post("/").send(badanBuat);

    const kartu = r.stockCard.createMany.mock.calls[0][0][0];
    // quantity dalam satuan terkecil, display_quantity dalam satuan jual.
    expect(kartu.quantity).toBe(-24);
    expect(kartu.display_quantity).toBe(-2);
    expect(kartu.product_id).toBe(10);
    expect(kartu.product_unit_id).toBe(3);
    expect(kartu.document_name).toBe("INV-2024-11112222");
    expect(kartu.customer_id).toBe(5);
    expect(kartu.sales_invoice_id).toBe(501);
    expect(kartu.sales_invoice_code_id).toBe(77);
    expect(kartu.supplier_id).toBeNull();
  });

  it("mengantre satu pekerjaan per kartu stok yang tertulis", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());
    r.stockCard.createMany.mockResolvedValue([{ id: 901 }, { id: 902 }]);

    await request(app(r)).post("/").send(badanBuat);

    expect(tambahAntrean).toHaveBeenCalledWith("stock-card-inserted", {
      id: 901,
    });
    expect(tambahAntrean).toHaveBeenCalledWith("stock-card-inserted", {
      id: 902,
    });
  });

  it("menulis faktur dan piutang lebih dulu, baru gudang", async () => {
    const r = repositoriTiruan();
    const urutan: string[] = [];
    r.salesInvoice.create.mockImplementation(async () => {
      urutan.push("faktur");
      return fakturTersimpan();
    });
    r.receivable.addReceivableValue.mockImplementation(async () => {
      urutan.push("piutang");
    });
    r.stockOut.create.mockImplementation(async () => {
      urutan.push("barang-keluar");
    });
    r.productStock.updateMany.mockImplementation(async () => {
      urutan.push("stok");
    });
    r.stockCard.createMany.mockImplementation(async () => {
      urutan.push("kartu-stok");
      return [];
    });

    await request(app(r)).post("/").send(badanBuat);

    expect(urutan).toEqual([
      "faktur",
      "piutang",
      "barang-keluar",
      "stok",
      "kartu-stok",
    ]);
  });
});

describe("POST / — jalur galat", () => {
  it("membalas 500 khusus bila repository tidak mengembalikan faktur", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(null);

    const res = await request(app(r)).post("/").send(badanBuat);

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Sales invoice creation failed"]);
    // Tidak ada piutang dan tidak ada mutasi gudang yang terlanjur tertulis.
    expect(r.receivable.addReceivableValue).not.toHaveBeenCalled();
    expect(r.stockOut.create).not.toHaveBeenCalled();
  });

  it("membalas 500 berisi key i18n bila penyimpanan faktur gagal", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r)).post("/").send(badanBuat);

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  it("membalas 500 bila daftar pembayaran tidak dikirim", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    const res = await request(app(r))
      .post("/")
      .send({ ...badanBuat, sales_invoice_payment: undefined });

    expect(res.status).toBe(500);
    expect(r.salesInvoice.create).not.toHaveBeenCalled();
  });

  /**
   * CACAT: nominal yang tidak dikirim menjadi NaN, bukan ditolak dan bukan nol.
   *
   * `Number(undefined)` menghasilkan NaN, dan NaN itu diteruskan mentah ke
   * repository sebagai diskon, ongkos kirim, dan biaya layanan. Handler tidak
   * punya penjagaan apa pun — satu-satunya penahan adalah skema pada rute.
   *
   * Akibatnya bagi pengguna: begitu satu saja dari ketiga nominal itu hilang,
   * SELURUH nilai faktur menjadi NaN, dan piutang yang dihitung dari nilai itu
   * ikut NaN. Angka piutang berjalan yang tersimpan di Redis pun rusak
   * permanen, karena NaN yang sudah masuk tidak bisa dikurangi kembali.
   */
  it("CACAT: nominal yang hilang diteruskan sebagai NaN", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());

    await request(app(r)).post("/").send({
      customer_id: 5,
      date: "2024-05-01",
      is_paid: true,
      sales_invoice: [],
      sales_invoice_payment: [],
    });

    const arg = r.salesInvoice.create.mock.calls[0][0];
    expect(Number.isNaN(arg.discount)).toBe(true);
    expect(Number.isNaN(arg.delivery)).toBe(true);
    expect(Number.isNaN(arg.service)).toBe(true);
  });

  /**
   * CACAT: piutang menjadi NaN bila salah satu nominal faktur rusak.
   *
   * Lanjutan dari cacat di atas, tetapi akibatnya jauh lebih parah karena
   * mengenai angka yang dipakai bersama semua faktur. `addReceivableValue`
   * menaikkan satu penghitung tunggal di Redis; sekali NaN masuk, total
   * piutang perusahaan tidak akan pernah kembali menjadi angka sampai
   * penghitungnya diperbaiki dari luar aplikasi.
   */
  it("CACAT: piutang berjalan ikut menjadi NaN", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(
      fakturTersimpan({ delivery: NaN, sales_invoice_payment: [] })
    );

    await request(app(r))
      .post("/")
      .send({ ...badanBuat, is_paid: false });

    const nilai = r.receivable.addReceivableValue.mock.calls[0][0];
    expect(Number.isNaN(nilai)).toBe(true);
  });

  /**
   * CACAT: enam tulisan berurutan tanpa satu transaksi pun.
   *
   * Faktur, piutang, barang keluar, stok, dan kartu stok ditulis satu per satu
   * dengan await berantai. Bila yang gagal adalah yang di tengah — misalnya
   * pengurangan stok — faktur DAN piutang sudah terlanjur tercatat, dan tidak
   * ada yang membatalkannya. Pengguna hanya melihat 500.
   *
   * Akibatnya bagi pengguna: pelanggan tertagih untuk barang yang menurut
   * sistem tidak pernah keluar dari gudang. Stok di layar tidak cocok dengan
   * stok di rak, dan selisihnya baru ketahuan saat stok opname.
   */
  it("CACAT: faktur dan piutang tetap tertulis walau pengurangan stok gagal", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.create.mockResolvedValue(fakturTersimpan());
    r.productStock.updateMany.mockRejectedValue(new Error("stok terkunci"));

    const res = await request(app(r)).post("/").send(badanBuat);

    expect(res.status).toBe(500);
    expect(r.salesInvoice.create).toHaveBeenCalledTimes(1);
    expect(r.receivable.addReceivableValue).toHaveBeenCalledWith(170000);
    expect(r.stockOut.create).toHaveBeenCalledTimes(1);
    // Tidak ada satu pun pembatalan yang dijalankan.
    expect(r.salesInvoice.deleteByID).not.toHaveBeenCalled();
  });
});

describe("DELETE /:id — membatalkan faktur", () => {
  it("membalas 201, mengembalikan stok, dan menghapus barang keluar", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(fakturTersimpan());
    r.salesInvoice.deleteByID.mockResolvedValue({ id: 77, isDelete: true });

    const res = await request(app(r)).delete("/77");

    expect(res.status).toBe(201);
    expect(r.salesInvoice.deleteByID).toHaveBeenCalledWith(77, 99);
    // Stok dikembalikan sebanyak kuantitas terkonversi: 2 x 12 = 24.
    expect(r.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 10, quantity: 24 },
    ]);
    expect(r.stockOut.deleteMany).toHaveBeenCalledWith([
      {
        sales_invoice_id: 501,
        sales_invoice_code_id: 77,
        adjustment_case_id: null,
        adjustment_case_code_id: null,
      },
    ]);
  });

  it("mengantre penghapusan kartu stok untuk tiap baris", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(fakturTersimpan());
    r.salesInvoice.deleteByID.mockResolvedValue({ id: 77 });

    await request(app(r)).delete("/77");

    expect(tambahAntrean).toHaveBeenCalledWith("stock-card-deleted", {
      sales_invoice_code_id: 77,
      sales_invoice_id: 501,
      adjustment_case_code_id: null,
      adjustment_case_id: null,
      sales_return_code_id: null,
      sales_return_id: null,
      good_receipt_code_id: null,
      good_receipt_id: null,
    });
  });

  it("membalas 404 bila faktur tidak ada", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(null);

    const res = await request(app(r)).delete("/77");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(r.salesInvoice.deleteByID).not.toHaveBeenCalled();
  });

  it("membalas 404 bila faktur sudah dihapus", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(
      fakturTersimpan({ isDelete: true })
    );

    const res = await request(app(r)).delete("/77");

    expect(res.status).toBe(404);
    expect(r.salesInvoice.deleteByID).not.toHaveBeenCalled();
  });

  it("membalas 400 bila fakturnya sudah punya retur penjualan", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(fakturTersimpan());
    r.salesReturn.fetchBySalesInvoiceCodeID.mockResolvedValue({ id: 3 });

    const res = await request(app(r)).delete("/77");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Sales return exists"]);
    // Retur yang sudah ada harus dibatalkan lebih dulu; tanpa penjagaan ini
    // stok akan dikembalikan dua kali.
    expect(r.salesInvoice.deleteByID).not.toHaveBeenCalled();
    expect(r.productStock.updateMany).not.toHaveBeenCalled();
  });

  it("membalas 500 bila penghapusan gagal", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(fakturTersimpan());
    r.salesInvoice.deleteByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r)).delete("/77");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT BERAT: membatalkan faktur kredit TIDAK menurunkan piutang.
   *
   * Saat faktur dibuat, controller menaikkan penghitung piutang di Redis lewat
   * `addReceivableValue`. Saat faktur yang sama dibatalkan, tidak ada
   * pemanggilan sebaliknya. Stok dikembalikan, barang keluar dihapus, kartu
   * stok dibersihkan — hanya angka uangnya yang ditinggalkan.
   *
   * Akibatnya bagi pengguna: total piutang di dasbor terus menghitung tagihan
   * dari faktur yang sudah dibatalkan. Angka itu hanya bisa naik, sehingga
   * makin lama makin jauh dari piutang yang benar-benar beredar, dan keputusan
   * penagihan yang bersandar padanya menjadi salah.
   */
  it("CACAT: pembatalan faktur tidak menurunkan piutang berjalan", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(fakturTersimpan());
    r.salesInvoice.deleteByID.mockResolvedValue({ id: 77 });

    const res = await request(app(r)).delete("/77");

    expect(res.status).toBe(201);
    expect(r.receivable.addReceivableValue).not.toHaveBeenCalled();
  });

  /**
   * CACAT BERAT: dua pemanggilan repository pertama berada DI LUAR blok try.
   *
   * `fetchByID` dan `fetchBySalesInvoiceCodeID` dipanggil sebelum try dimulai.
   * Karena handler-nya async, penolakan dari salah satunya menjadi promise
   * yang ditolak dan tidak ada yang menangkapnya — Express 4 tidak menangani
   * penolakan promise, dan Node 15 ke atas menghentikan proses pada unhandled
   * rejection.
   *
   * Jadi satu galat basis data sesaat saat membatalkan faktur tidak berujung
   * 500 bagi satu pemakai, melainkan mematikan SELURUH server.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu — persis yang dialami
   * pemanggil sungguhan sebelum prosesnya tumbang.
   */
  it("CACAT: delete menolak tanpa membalas apa pun saat pencarian faktur gagal", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockRejectedValue(new Error("koneksi putus"));
    const c = controller(r);

    const req = { params: { id: "77" }, body: { userId: 99 } } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await expect(c.delete(req, res as never)).rejects.toThrow("koneksi putus");
    expect(res.status).not.toHaveBeenCalled();
  });

  /**
   * Cacat yang sama pada pencarian retur penjualan: sudah lolos pemeriksaan
   * faktur, tetapi galat di sini tetap berada di luar try.
   */
  it("CACAT: delete menolak tanpa membalas saat pencarian retur gagal", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(fakturTersimpan());
    r.salesReturn.fetchBySalesInvoiceCodeID.mockRejectedValue(
      new Error("koneksi putus")
    );
    const c = controller(r);

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await expect(
      c.delete(
        { params: { id: "77" }, body: { userId: 99 } } as never,
        res as never
      )
    ).rejects.toThrow("koneksi putus");
    expect(res.status).not.toHaveBeenCalled();
    expect(r.salesInvoice.deleteByID).not.toHaveBeenCalled();
  });
});

describe("GET /payment/:id — riwayat pembayaran faktur", () => {
  /**
   * CACAT BERAT: hasil repository tidak pernah ditunggu.
   *
   * `fetchPaymentsBySalesInvoiceCodeID` dipanggil TANPA await, jadi yang
   * dikirim ke pengguna adalah objek Promise, bukan datanya. Promise tidak
   * punya properti yang bisa diserialisasi, sehingga balasannya 200 dengan
   * badan `{}`.
   *
   * Akibatnya bagi pengguna: riwayat pembayaran sebuah faktur SELALU tampak
   * kosong. Kasir yang memeriksa apakah pelanggan sudah membayar melihat
   * halaman kosong dan menyimpulkan belum ada pembayaran sama sekali —
   * padahal uangnya sudah masuk. Karena statusnya 200, tidak ada tanda apa pun
   * bahwa sesuatu sedang salah.
   *
   * Lebih jauh lagi, `try` di sekelilingnya tidak berguna: pemanggilannya
   * tidak ditunggu, jadi penolakan repository lolos sebagai unhandled
   * rejection dan bisa menghentikan proses.
   */
  it("membalas 200 dengan daftar pembayaran yang sebenarnya", async () => {
    const r = repositoriTiruan();
    r.salesInvoicePayment.fetchPaymentsBySalesInvoiceCodeID.mockResolvedValue([
      { id: 1, value: 50000 },
      { id: 2, value: 120000 },
    ]);

    const res = await request(app(r)).get("/payment/77");

    expect(res.status).toBe(200);
    // Sebelum `await` dipasang, yang terkirim adalah objek Promise-nya dan
    // Express menyerialkannya menjadi "{}" — riwayat pembayaran selalu tampak
    // kosong meskipun repository mengembalikan dua baris seperti di atas.
    expect(res.body).toEqual([
      { id: 1, value: 50000 },
      { id: 2, value: 120000 },
    ]);
    expect(
      r.salesInvoicePayment.fetchPaymentsBySalesInvoiceCodeID
    ).toHaveBeenCalledWith(77);
  });

  it("membalas 500 ketika pengambilan pembayaran gagal", async () => {
    const r = repositoriTiruan();
    r.salesInvoicePayment.fetchPaymentsBySalesInvoiceCodeID.mockRejectedValue(
      new Error("koneksi putus")
    );

    const res = await request(app(r)).get("/payment/77");

    // Blok catch-nya dulu tidak pernah aktif: penolakan Promise terjadi setelah
    // balasan 200 telanjur terkirim, jadi kegagalan basis data pun tetap
    // terbaca sebagai "belum ada pembayaran".
    expect(res.status).toBe(500);
  });
});

describe("GET /:id, GET /archives, POST /archives, POST /sales-return", () => {
  it("fetchByID membalas 200 untuk faktur yang ada", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(fakturTersimpan());

    const res = await request(app(r)).get("/77");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(77);
    expect(r.salesInvoice.fetchByID).toHaveBeenCalledWith(77);
  });

  it("fetchByID membalas 404 bila faktur tidak ada", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(null);

    const res = await request(app(r)).get("/77");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  /**
   * fetchByID TIDAK menyaring faktur yang sudah dihapus: penjagaannya hanya
   * "tidak ada". Faktur yang dibatalkan tetap bisa dibuka lewat tautan
   * langsung. Perilakunya dikunci apa adanya karena halaman rincian memang
   * perlu menampilkan dokumen yang dibatalkan.
   */
  it("fetchByID tetap membalas 200 untuk faktur yang sudah dihapus", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockResolvedValue(
      fakturTersimpan({ isDelete: true })
    );

    expect((await request(app(r)).get("/77")).status).toBe(200);
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    expect((await request(app(r)).get("/77")).status).toBe(500);
  });

  it("fetchAnnualArchives meneruskan hasil repository", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchAnnualArchives.mockResolvedValue([
      { year: 2024, count: 5 },
    ]);

    const res = await request(app(r)).get("/archives");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ year: 2024, count: 5 }]);
  });

  it("fetchArchives menerjemahkan halaman menjadi offset", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    await request(app(r)).post("/archives").send({
      year: 2024,
      month: 5,
      page: 3,
      pageSize: 20,
      keyword: "indah",
      isActive: true,
      isDelete: false,
      isPaid: true,
      isUnpaid: false,
      sortBy: "date",
      sortDirection: "descending",
      startDate: "2024-05-01",
      endDate: "2024-05-31",
    });

    const arg = r.salesInvoice.fetchArchives.mock.calls[0][0];
    expect(arg.limit).toBe(20);
    // Halaman 3 dengan 20 baris per halaman melewati 40 baris pertama.
    expect(arg.offset).toBe(40);
    expect(arg.keyword).toBe("indah");
    expect(arg.sortBy).toBe("date");
    expect(arg.startDate.toISOString()).toBe("2024-05-01T00:00:00.000Z");
  });

  /**
   * CACAT: pageSize dipakai mentah tanpa nilai bawaan.
   *
   * translatePage sudah menjaga halaman, tetapi pageSize diambil langsung dari
   * badan permintaan. Bila tidak dikirim, `limit` menjadi undefined dan
   * `offset` menjadi NaN — keduanya diteruskan ke kueri basis data.
   *
   * Akibatnya bagi pengguna: arsip faktur gagal dimuat atau memuat seluruh
   * tabel sekaligus, bergantung pada bagaimana kueri memperlakukan nilai itu.
   */
  it("CACAT: pageSize yang hilang menghasilkan limit undefined dan offset NaN", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    await request(app(r)).post("/archives").send({ year: 2024, month: 5 });

    const arg = r.salesInvoice.fetchArchives.mock.calls[0][0];
    expect(arg.limit).toBeUndefined();
    expect(Number.isNaN(arg.offset)).toBe(true);
  });

  it("fetchArchives membalas 500 bila repository gagal", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.fetchArchives.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r)).post("/archives").send({ pageSize: 10 });
    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("searchSalesReturn meneruskan tanggal dan daftar barang", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.searchByReturns.mockResolvedValue([]);

    const res = await request(app(r))
      .post("/sales-return")
      .send({ date: "2024-05-01", sales_invoice: [{ product_id: 10 }] });

    expect(res.status).toBe(200);
    expect(r.salesInvoice.searchByReturns).toHaveBeenCalledWith(
      new Date("2024-05-01"),
      [{ product_id: 10 }]
    );
  });

  it("searchSalesReturn membalas 500 bila repository gagal", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.searchByReturns.mockRejectedValue(
      new Error("koneksi putus")
    );

    const res = await request(app(r))
      .post("/sales-return")
      .send({ date: "2024-05-01" });
    expect(res.status).toBe(500);
  });
});
