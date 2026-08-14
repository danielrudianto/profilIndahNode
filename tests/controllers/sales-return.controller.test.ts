import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku SalesReturnController.
 *
 * Retur penjualan adalah barang yang KEMBALI dari pelanggan: stok bertambah,
 * barang keluar dikurangi, dan kartu stok mencatat mutasi masuk. Semua itu
 * dihitung dari kuantitas dikali konversi satuan, jadi yang paling banyak
 * diperiksa di sini adalah kuantitas dan harga yang sampai ke tiap repository
 * — termasuk saat retur itu sendiri dibatalkan.
 *
 * SocketHelper ditiru mengikuti bentuk acuan. Antrean bullmq ikut ditiru
 * karena modul aslinya membuka koneksi Redis begitu diimpor.
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

import SalesReturnController from "../../src/controllers/sales-return.controller";

function repositoriTiruan() {
  return {
    salesReturn: {
      create: jest.fn(),
      delete: jest.fn(),
      fetchByID: jest.fn(),
      fetchAnnualArchives: jest.fn(),
      fetchArchives: jest.fn(),
    },
    salesInvoice: {
      validateSalesReturn: jest.fn().mockResolvedValue(true),
      fetchByID: jest.fn(),
    },
    productStock: {
      updateMany: jest.fn(),
    },
    stockOut: {
      create: jest.fn(),
      decreaseMany: jest.fn(),
    },
    stockCard: {
      createMany: jest.fn().mockResolvedValue([]),
    },
  };
}

type Repos = ReturnType<typeof repositoriTiruan>;

function controller(r: Repos) {
  return new SalesReturnController(
    r.salesReturn as never,
    r.salesInvoice as never,
    r.productStock as never,
    r.stockOut as never,
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
  a.post("/", c.create);
  a.get("/:id", c.fetchByID);
  a.delete("/:id", c.deleteByID);
  return a;
}

/**
 * Retur satu baris: 2 dus dikembalikan, satu dus 12 pcs.
 * Baris faktur asalnya berharga 120.000 dengan diskon 20.000 per dus.
 */
function returTersimpan(ubah: Record<string, unknown> = {}) {
  return {
    id: 33,
    name: "RJ-2024-12345678",
    date: new Date("2024-05-10T00:00:00.000Z"),
    is_delete: false,
    sales_invoice_code_id: 77,
    sales_invoice_code: {
      customerID: 5,
      date: new Date("2024-05-01T00:00:00.000Z"),
    },
    sales_return: [
      {
        id: 601,
        sales_invoice_id: 501,
        quantity: 2,
        sales_invoice: {
          product_id: 10,
          product_unit_id: 3,
          price: 120000,
          discount: 20000,
          product_unit: { conversion: 12 },
        },
      },
    ],
    ...ubah,
  };
}

const badanBuat = {
  date: "2024-05-10",
  payment_method_id: 2,
  sales_invoice_code_id: 77,
  sales_return: [{ sales_invoice_id: 501, quantity: 2 }],
};

beforeEach(() => {
  kirimSocket.mockClear();
  tambahAntrean.mockClear();
  process.env.LIMIT = "10";
});

describe("POST / — membuat retur penjualan", () => {
  /**
   * Handler ini membalas 200, bukan 201 seperti pembuatan dokumen lain di
   * repo ini. Dikunci apa adanya karena frontend sudah menyesuaikan diri.
   */
  it("membalas 200 dan mengirim retur hasil simpan", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());

    const res = await request(app(r)).post("/").send(badanBuat);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(33);
  });

  it("memeriksa kecukupan kuantitas lebih dulu, baru menyimpan", async () => {
    const r = repositoriTiruan();
    const urutan: string[] = [];
    r.salesInvoice.validateSalesReturn.mockImplementation(async () => {
      urutan.push("validasi");
      return true;
    });
    r.salesReturn.create.mockImplementation(async () => {
      urutan.push("simpan");
      return returTersimpan();
    });

    await request(app(r)).post("/").send(badanBuat);

    expect(urutan).toEqual(["validasi", "simpan"]);
    expect(r.salesInvoice.validateSalesReturn).toHaveBeenCalledWith(
      badanBuat.sales_return
    );
  });

  it("menolak 400 bila kuantitas retur melebihi yang pernah dibeli", async () => {
    const r = repositoriTiruan();
    r.salesInvoice.validateSalesReturn.mockResolvedValue(false);

    const res = await request(app(r)).post("/").send(badanBuat);

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Sales return insufficient"]);
    // Tanpa penjagaan ini, pelanggan bisa mengembalikan barang lebih banyak
    // daripada yang dibelinya dan stok ikut menggelembung.
    expect(r.salesReturn.create).not.toHaveBeenCalled();
    expect(r.productStock.updateMany).not.toHaveBeenCalled();
  });

  it("menolak 400 bila repository tidak mengembalikan retur", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(null);

    const res = await request(app(r)).post("/").send(badanBuat);

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Sales return creation failed"]);
    expect(r.productStock.updateMany).not.toHaveBeenCalled();
  });

  it("meneruskan tanggal, faktur asal, dan pengguna yang mengonfirmasi", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());

    await request(app(r))
      .post("/")
      .send({ ...badanBuat, userId: 42 });

    const arg = r.salesReturn.create.mock.calls[0][0];
    expect(arg.date.toISOString()).toBe("2024-05-10T00:00:00.000Z");
    expect(arg.sales_invoice_code_id).toBe(77);
    expect(arg.payment_method_id).toBe(2);
    expect(arg.created_by).toBe(42);
    expect(arg.confirmed_by).toBe(42);
    expect(arg.is_confirm).toBe(true);
    expect(arg.is_delete).toBe(false);
    // Baris retur dibersihkan menjadi tiga bidang saja; sales_return_code_id
    // sengaja 0 karena dokumennya belum ada.
    expect(arg.sales_return).toEqual([
      { sales_invoice_id: 501, quantity: 2, sales_return_code_id: 0 },
    ]);
  });

  it("memberi nama berawalan RJ- dan tahun tanggal retur", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());

    await request(app(r)).post("/").send(badanBuat);

    expect(r.salesReturn.create.mock.calls[0][0].name).toMatch(
      /^RJ-2024-\d{8}$/
    );
  });

  it("mengubah metode pembayaran 0 menjadi null", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());

    await request(app(r))
      .post("/")
      .send({ ...badanBuat, payment_method_id: 0 });

    expect(r.salesReturn.create.mock.calls[0][0].payment_method_id).toBeNull();
  });

  it("mengembalikan stok sebanyak kuantitas terkonversi", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());

    await request(app(r)).post("/").send(badanBuat);

    // 2 dus x 12 pcs = 24 pcs masuk kembali.
    expect(r.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 10, quantity: 24 },
    ]);
  });

  it("memakai konversi 1 bila baris faktur tidak punya satuan", async () => {
    const r = repositoriTiruan();
    const retur = returTersimpan();
    retur.sales_return[0].sales_invoice.product_unit = null as never;
    r.salesReturn.create.mockResolvedValue(retur);

    await request(app(r)).post("/").send(badanBuat);

    expect(r.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 10, quantity: 2 },
    ]);
  });

  it("menulis kartu stok masuk dengan kuantitas gudang dan tampilan", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());

    await request(app(r)).post("/").send(badanBuat);

    const kartu = r.stockCard.createMany.mock.calls[0][0][0];
    expect(kartu.quantity).toBe(24);
    expect(kartu.display_quantity).toBe(2);
    expect(kartu.product_id).toBe(10);
    expect(kartu.product_unit_id).toBe(3);
    expect(kartu.document_name).toBe("RJ-2024-12345678");
    expect(kartu.customer_id).toBe(5);
    expect(kartu.sales_return_id).toBe(601);
    expect(kartu.sales_return_code_id).toBe(33);
    expect(kartu.sales_invoice_code_id).toBe(77);
    expect(kartu.supplier_id).toBeNull();
  });

  it("mengurangi barang keluar sebanyak kuantitas terkonversi", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());

    await request(app(r)).post("/").send(badanBuat);

    expect(r.stockOut.decreaseMany).toHaveBeenCalledWith([
      { sales_invoice_id: 501, quantity: 24 },
    ]);
  });

  it("mengantre satu pekerjaan per kartu stok yang tertulis", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());
    r.stockCard.createMany.mockResolvedValue([{ id: 801 }]);

    await request(app(r)).post("/").send(badanBuat);

    expect(tambahAntrean).toHaveBeenCalledWith("stock-card-inserted", {
      id: 801,
    });
  });

  it("menulis retur, stok, kartu stok, lalu barang keluar dalam urutan itu", async () => {
    const r = repositoriTiruan();
    const urutan: string[] = [];
    r.salesReturn.create.mockImplementation(async () => {
      urutan.push("retur");
      return returTersimpan();
    });
    r.productStock.updateMany.mockImplementation(async () => {
      urutan.push("stok");
    });
    r.stockCard.createMany.mockImplementation(async () => {
      urutan.push("kartu-stok");
      return [];
    });
    r.stockOut.decreaseMany.mockImplementation(async () => {
      urutan.push("barang-keluar");
    });

    await request(app(r)).post("/").send(badanBuat);

    expect(urutan).toEqual(["retur", "stok", "kartu-stok", "barang-keluar"]);
  });

  it("membalas 500 berisi key i18n bila penyimpanan gagal", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r)).post("/").send(badanBuat);

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT BERAT: retur tidak menurunkan piutang pelanggan sama sekali.
   *
   * Barang kembali ke gudang, stok bertambah, kartu stok tercatat — tetapi
   * TAGIHANNYA tidak berubah. Tidak ada pemanggilan ke repository piutang, dan
   * tidak ada baris pembayaran atau nota kredit yang dibuat untuk faktur asal.
   *
   * Akibatnya bagi pengguna: pelanggan yang mengembalikan barang tetap ditagih
   * harga penuh. Faktur asal tidak pernah menyusut, sehingga penagihan
   * berikutnya menuntut uang untuk barang yang sudah ada kembali di gudang
   * penjual. Selisihnya harus dibereskan manual di luar sistem.
   */
  it("CACAT: retur tidak mengurangi tagihan faktur asal", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());

    const res = await request(app(r)).post("/").send(badanBuat);

    expect(res.status).toBe(200);
    // Nilai uang retur — 2 x (120.000 - 20.000) = 200.000 — tidak dipakai di
    // mana pun. Barang masuk gudang tanpa uang mengikutinya.
    expect(r.salesInvoice.fetchByID).not.toHaveBeenCalled();
  });

  /**
   * CACAT: retur tidak memeriksa keadaan faktur asalnya.
   *
   * `validateSalesReturn` hanya membandingkan kuantitas. Tidak ada pemeriksaan
   * apakah faktur asal masih ada, sudah dibatalkan, atau sudah punya retur
   * lain. Nomor faktur dari badan permintaan diteruskan apa adanya.
   *
   * Akibatnya bagi pengguna: barang bisa diretur terhadap faktur yang sudah
   * dibatalkan, sehingga stok bertambah untuk penjualan yang menurut sistem
   * tidak pernah terjadi.
   */
  it("CACAT: nomor faktur asal diteruskan tanpa diperiksa", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());

    await request(app(r))
      .post("/")
      .send({ ...badanBuat, sales_invoice_code_id: 999999 });

    expect(r.salesReturn.create.mock.calls[0][0].sales_invoice_code_id).toBe(
      999999
    );
    expect(r.salesInvoice.fetchByID).not.toHaveBeenCalled();
  });

  /**
   * CACAT: tanggal retur yang hilang menjadi Invalid Date.
   *
   * Akibatnya bagi pengguna: retur tersimpan tetapi tidak muncul di arsip
   * bulan mana pun, sementara stoknya sudah terlanjur bertambah.
   */
  it("CACAT: tanggal yang hilang diteruskan sebagai Invalid Date", async () => {
    const r = repositoriTiruan();
    r.salesReturn.create.mockResolvedValue(returTersimpan());

    await request(app(r))
      .post("/")
      .send({ ...badanBuat, date: undefined });

    expect(
      Number.isNaN(r.salesReturn.create.mock.calls[0][0].date.getTime())
    ).toBe(true);
  });
});

describe("DELETE /:id — membatalkan retur", () => {
  it("membalas 201 dan mengurangi kembali stok yang sempat dikembalikan", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchByID.mockResolvedValue(returTersimpan());
    r.salesReturn.delete.mockResolvedValue({ id: 33, is_delete: true });

    const res = await request(app(r)).delete("/33");

    expect(res.status).toBe(201);
    expect(r.salesReturn.delete).toHaveBeenCalledWith(33, 99);
    expect(r.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 10, quantity: -24 },
    ]);
  });

  it("mengantre penghapusan kartu stok untuk tiap baris retur", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchByID.mockResolvedValue(returTersimpan());
    r.salesReturn.delete.mockResolvedValue({ id: 33 });

    await request(app(r)).delete("/33");

    expect(tambahAntrean).toHaveBeenCalledWith("stock-card-deleted", {
      sales_invoice_code_id: 77,
      sales_invoice_id: 501,
      sales_return_code_id: 33,
      sales_return_id: 601,
      adjustment_case_code_id: null,
      adjustment_case_id: null,
      good_receipt_code_id: null,
      good_receipt_id: null,
    });
  });

  it("membalas 404 bila retur tidak ada", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchByID.mockResolvedValue(null);

    const res = await request(app(r)).delete("/33");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(r.salesReturn.delete).not.toHaveBeenCalled();
  });

  it("membalas 400 bila retur sudah dibatalkan sebelumnya", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchByID.mockResolvedValue(
      returTersimpan({ is_delete: true })
    );

    const res = await request(app(r)).delete("/33");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Sales return already deleted"]);
    // Tanpa penjagaan ini, stok akan dikurangi dua kali untuk satu pembatalan.
    expect(r.productStock.updateMany).not.toHaveBeenCalled();
  });

  it("membalas 500 bila pembatalan gagal", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchByID.mockResolvedValue(returTersimpan());
    r.salesReturn.delete.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r)).delete("/33");

    expect(res.status).toBe(500);
    expect(r.productStock.updateMany).not.toHaveBeenCalled();
  });

  /**
   * CACAT BERAT: barang keluar yang dibuat ulang memakai HARGA YANG BERBEDA
   * dari barang keluar aslinya.
   *
   * Saat faktur dibuat, SalesInvoiceController menulis barang keluar dengan
   * harga `price / conversion` — harga jual satuan, TANPA memotong diskon
   * baris. Saat pembatalan retur menulis ulang barang keluar itu, harganya
   * dihitung `(price - discount) / conversion` — dengan diskon dipotong.
   *
   * Pada contoh ini: aslinya 120.000 / 12 = 10.000 per pcs; setelah retur
   * dibatalkan menjadi (120.000 - 20.000) / 12 = 8.333,33 per pcs.
   *
   * Akibatnya bagi pengguna: nilai barang keluar untuk penjualan yang sama
   * berubah hanya karena returnya pernah dibuat lalu dibatalkan. Laporan nilai
   * penjualan dan marjin per produk ikut bergeser tanpa ada transaksi baru
   * yang menjelaskannya, dan angkanya tidak bisa direkonsiliasi dengan faktur.
   */
  it("CACAT: pembatalan retur menulis barang keluar dengan harga setelah diskon", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchByID.mockResolvedValue(returTersimpan());
    r.salesReturn.delete.mockResolvedValue({ id: 33 });

    await request(app(r)).delete("/33");

    const barangKeluar = r.stockOut.create.mock.calls[0][0][0];
    expect(barangKeluar.quantity).toBe(24);
    // (120.000 - 20.000) / 12, bukan 120.000 / 12 = 10.000 seperti aslinya.
    expect(barangKeluar.price).toBeCloseTo(8333.333333, 4);
    expect(barangKeluar.price).not.toBe(10000);
    expect(barangKeluar.sales_invoice_id).toBe(501);
    expect(barangKeluar.sales_invoice_code_id).toBe(77);
    // Tanggalnya mengikuti tanggal FAKTUR, bukan tanggal retur.
    expect(barangKeluar.date).toEqual(new Date("2024-05-01T00:00:00.000Z"));
  });

  /**
   * CACAT: pembatalan retur juga tidak menyentuh piutang.
   *
   * Pasangan dari cacat pada pembuatan retur: karena retur tidak pernah
   * mengurangi tagihan, pembatalannya pun tidak mengembalikan apa pun.
   * Uangnya memang konsisten — konsisten SALAH — sementara stoknya berubah
   * dua arah.
   */
  it("CACAT: pembatalan retur tidak menyentuh tagihan sama sekali", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchByID.mockResolvedValue(returTersimpan());
    r.salesReturn.delete.mockResolvedValue({ id: 33 });

    await request(app(r)).delete("/33");

    expect(r.salesInvoice.fetchByID).not.toHaveBeenCalled();
  });
});

describe("GET /:id, GET /archives, POST /archives", () => {
  it("fetchByID meneruskan hasil repository apa adanya", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchByID.mockResolvedValue(returTersimpan());

    const res = await request(app(r)).get("/33");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(33);
    expect(r.salesReturn.fetchByID).toHaveBeenCalledWith(33);
  });

  /**
   * CACAT: retur yang tidak ada dibalas 200 dengan badan kosong.
   *
   * Berbeda dari deleteByID yang memeriksa hasilnya, fetchByID meneruskan apa
   * pun — termasuk null. Frontend yang membedakan ada dan tidak ada lewat
   * status HTTP akan membuka halaman rincian retur yang seluruh kolomnya
   * kosong.
   */
  it("CACAT: membalas 200 badan kosong untuk id yang tidak ada", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchByID.mockResolvedValue(null);

    const res = await request(app(r)).get("/404");

    expect(res.status).toBe(200);
    expect(res.text).toBe("");
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    expect((await request(app(r)).get("/33")).status).toBe(500);
  });

  it("fetchAnnualArchives meneruskan hasil repository", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchAnnualArchives.mockResolvedValue([
      { year: 2024, count: 3 },
    ]);

    const res = await request(app(r)).get("/archives");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ year: 2024, count: 3 }]);
  });

  it("fetchAnnualArchives membalas 500 bila repository gagal", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchAnnualArchives.mockRejectedValue(new Error("gagal"));

    const res = await request(app(r)).get("/archives");
    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchArchives menerjemahkan halaman, kata kunci, dan rentang tanggal", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    await request(app(r)).post("/archives").send({
      year: "2024",
      month: "5",
      page: 2,
      keyword: "indah",
      isDelete: false,
      isActive: true,
      startDate: "2024-05-01",
      endDate: "2024-05-31",
    });

    const arg = r.salesReturn.fetchArchives.mock.calls[0][0];
    expect(arg.year).toBe(2024);
    expect(arg.month).toBe(5);
    expect(arg.page).toBe(2);
    expect(arg.keyword).toBe("indah");
    // pageSize diambil dari LIMIT di lingkungan, bukan dari permintaan.
    expect(arg.pageSize).toBe(10);
    expect(arg.startDate.toISOString()).toBe("2024-05-01T00:00:00.000Z");
  });

  /**
   * CACAT: ukuran halaman diambil dari process.env.LIMIT tanpa nilai bawaan.
   *
   * Bila LIMIT tidak terpasang di lingkungan, `Number(undefined)` menghasilkan
   * NaN dan NaN itu langsung menjadi batas jumlah baris kueri.
   *
   * Akibatnya bagi pengguna: arsip retur gagal dimuat di lingkungan yang lupa
   * memasang LIMIT, dengan galat yang tidak menyebut penyebabnya sama sekali.
   */
  it("CACAT: pageSize menjadi NaN bila LIMIT tidak terpasang", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchArchives.mockResolvedValue({ data: [], count: 0 });
    delete process.env.LIMIT;

    await request(app(r)).post("/archives").send({ year: 2024, month: 5 });

    expect(
      Number.isNaN(r.salesReturn.fetchArchives.mock.calls[0][0].pageSize)
    ).toBe(true);
  });

  it("fetchArchives membalas 500 bila repository gagal", async () => {
    const r = repositoriTiruan();
    r.salesReturn.fetchArchives.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r)).post("/archives").send({ year: 2024 });
    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});
