import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku SalesDepositController.
 *
 * Sales deposit adalah PESANAN YANG SUDAH DIBAYAR DIMUKA: pelanggan menyetor
 * uang, barangnya belum keluar. Dokumen ini punya dua ujung yang keduanya
 * menyangkut uang pelanggan:
 *
 *   confirm — setoran berubah menjadi faktur penjualan, stok keluar, dan
 *             sisanya menjadi piutang;
 *   reject  — pesanan batal, dan uang yang sudah disetor harus dicatat
 *             sebagai kewajiban pengembalian (overpayment).
 *
 * Controller ini menerima TUJUH repository lewat konstruktor dan tidak
 * membungkus tulisannya dalam satu transaksi, jadi urutan pemanggilan ikut
 * diuji: yang gagal di tengah meninggalkan jejak yang tidak dibatalkan.
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

import { SalesDepositController } from "../../src/controllers/sales-deposit.controller";

function repositoriTiruan() {
  return {
    salesDeposit: {
      create: jest.fn(),
      generateName: jest.fn().mockReturnValue("DPS-2024-33334444"),
      fetch: jest.fn(),
      fetchByID: jest.fn(),
      fetchAnnualArchives: jest.fn(),
      fetchArchives: jest.fn(),
      confirmByID: jest.fn(),
      delete: jest.fn(),
    },
    salesInvoice: {
      create: jest.fn(),
      generateName: jest.fn().mockReturnValue("INV-2024-55556666"),
    },
    stockCard: {
      createMany: jest.fn().mockResolvedValue([]),
    },
    productStock: {
      updateMany: jest.fn(),
    },
    stockOut: {
      create: jest.fn(),
    },
    receivable: {
      addReceivableValue: jest.fn(),
    },
    overpayment: {
      createMany: jest.fn(),
    },
    /*
      $transaction tiruan MENJALANKAN fungsi yang dioper, bukan melewatinya.
      Kalau ia hanya mengembalikan nilai kosong, seluruh isi transaksi tidak
      pernah dijalankan dan tesnya akan hijau tanpa menguji apa pun — persis
      cara tes bisa membuktikan hal yang salah.

      Klien yang diberikan ke fungsi itu sengaja berupa penanda: repository di
      sini semuanya tiruan dan tidak menyentuh Prisma, jadi yang perlu diperiksa
      hanyalah bahwa penanda inilah yang diteruskan ke tiap repository.
    */
    prisma: {
      $transaction: jest.fn(async (fn: any) => fn(TANDA_TX)),
    },
  };
}

/** Penanda klien transaksi; dipakai untuk memastikan tiap repository menerimanya. */
const TANDA_TX = { __tx: true } as never;

type Repos = ReturnType<typeof repositoriTiruan>;

function controller(r: Repos) {
  return new SalesDepositController(
    r.salesDeposit as never,
    r.salesInvoice as never,
    r.stockCard as never,
    r.productStock as never,
    r.stockOut as never,
    r.receivable as never,
    r.overpayment as never,
    r.prisma as never
  );
}

function app(r: Repos) {
  const c = controller(r);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.get("/archives", c.fetchAnnualArchives);
  a.post("/archives", c.fetchArchives);
  a.post("/confirm", c.confirm);
  a.post("/reject", c.reject);
  a.post("/", c.create);
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  return a;
}

/**
 * Setoran satu baris: 2 dus @ 12 pcs, harga 120.000 diskon 20.000 per dus.
 *   nilai baris  = 2 x (120.000 - 20.000) = 200.000
 *   + ongkos kirim 15.000 + layanan 10.000 - diskon 5.000 = 220.000
 * Pelanggan sudah menyetor 50.000 saat pesanan dibuat.
 */
function setoran(ubah: Record<string, unknown> = {}) {
  return {
    id: 21,
    name: "DPS-2024-33334444",
    uuid: "uuid-dps",
    customerID: 5,
    sales: "BUDI",
    date: new Date("2024-05-01T00:00:00.000Z"),
    delivery: 15000,
    service: 10000,
    discount: 5000,
    isPaid: false,
    isConfirm: false,
    isDelete: false,
    sales_deposit: [
      {
        product_id: 10,
        product_unit_id: 3,
        quantity: 2,
        price: 120000,
        discount: 20000,
      },
    ],
    sales_deposit_payment: [
      {
        date: new Date("2024-05-01T00:00:00.000Z"),
        payment_method_id: 2,
        value: 50000,
      },
    ],
    ...ubah,
  };
}

/** Faktur hasil konfirmasi setoran di atas. */
function fakturHasilKonfirmasi(ubah: Record<string, unknown> = {}) {
  return {
    id: 77,
    name: "DPS-2024-33334444",
    customerID: 5,
    date: new Date("2024-05-10T00:00:00.000Z"),
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
    ...ubah,
  };
}

beforeEach(() => {
  kirimSocket.mockClear();
  tambahAntrean.mockClear();
  process.env.LIMIT = "10";
});

describe("POST / — membuat setoran", () => {
  const badan = {
    customer_id: 5,
    discount: 5000,
    delivery: 15000,
    service: 10000,
    date: "2024-05-01",
    is_paid: false,
    sales: "budi",
    uuid: "uuid-dps",
    type: 1,
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

  it("membalas 201 dan mengirim setoran hasil simpan", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.create.mockResolvedValue(setoran());

    const res = await request(app(r)).post("/").send(badan);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(21);
  });

  it("meneruskan nominal uang sebagai angka, utuh apa adanya", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.create.mockResolvedValue(setoran());

    await request(app(r))
      .post("/")
      .send({
        ...badan,
        discount: "5000",
        delivery: "15000",
        service: "10000",
      });

    const arg = r.salesDeposit.create.mock.calls[0][0];
    expect(arg.discount).toBe(5000);
    expect(arg.delivery).toBe(15000);
    expect(arg.service).toBe(10000);
    expect(typeof arg.discount).toBe("number");
  });

  it("memindahkan sales_invoice permintaan menjadi sales_deposit", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.create.mockResolvedValue(setoran());

    await request(app(r))
      .post("/")
      .send({ ...badan, userId: 42 });

    const arg = r.salesDeposit.create.mock.calls[0][0];
    // Frontend memakai nama bidang faktur; controller memetakannya ke setoran.
    expect(arg.sales_deposit).toEqual(badan.sales_invoice);
    expect(arg.name).toBe("DPS-2024-33334444");
    expect(arg.uuid).toBe("uuid-dps");
    expect(arg.type).toBe(1);
    expect(arg.sales).toBe("BUDI");
    expect(arg.createdBy).toBe(42);
    expect(arg.confirmedBy).toBe(42);
    expect(arg.isDelete).toBe(false);
  });

  it("menormalkan pembayaran setoran menjadi model dengan nominal angka", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.create.mockResolvedValue(setoran());

    await request(app(r))
      .post("/")
      .send({
        ...badan,
        sales_invoice_payment: [
          { date: "2024-05-01", payment_method_id: 2, value: "50000" },
        ],
      });

    const bayar = r.salesDeposit.create.mock.calls[0][0].sales_deposit_payment;
    expect(bayar).toHaveLength(1);
    expect(bayar[0].value).toBe(50000);
    expect(typeof bayar[0].value).toBe("number");
    expect(bayar[0].sales_deposit_code_id).toBe(0);
    expect(bayar[0].date).toBeInstanceOf(Date);
  });

  it("membalas 500 khusus bila repository tidak mengembalikan setoran", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.create.mockResolvedValue(null);

    const res = await request(app(r)).post("/").send(badan);

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Sales deposit creation failed"]);
  });

  it("membalas 500 berisi key i18n bila penyimpanan gagal", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r)).post("/").send(badan);

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: nominal yang tidak dikirim menjadi NaN, bukan ditolak dan bukan nol.
   *
   * Sama seperti pada faktur penjualan: `Number(undefined)` menghasilkan NaN
   * dan diteruskan mentah sebagai diskon, ongkos kirim, dan biaya layanan.
   *
   * Akibatnya bagi pengguna: nilai setoran menjadi NaN, dan karena konfirmasi
   * menghitung sisa tagihan dari angka-angka ini, piutang yang lahir dari
   * setoran itu ikut NaN.
   */
  it("CACAT: nominal yang hilang diteruskan sebagai NaN", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.create.mockResolvedValue(setoran());

    await request(app(r))
      .post("/")
      .send({ customer_id: 5, sales_invoice: [], sales_invoice_payment: [] });

    const arg = r.salesDeposit.create.mock.calls[0][0];
    expect(Number.isNaN(arg.discount)).toBe(true);
    expect(Number.isNaN(arg.delivery)).toBe(true);
    expect(Number.isNaN(arg.service)).toBe(true);
  });

  /**
   * CACAT: setoran dibuat langsung dalam keadaan TERKONFIRMASI.
   *
   * `isConfirm: true` dan `confirmedAt/confirmedBy` diisi saat pembuatan,
   * padahal seluruh alur berikutnya — handler confirm dan reject — menolak
   * setoran yang sudah terkonfirmasi.
   *
   * Akibatnya bagi pengguna: setoran yang baru dibuat sudah masuk keadaan yang
   * membuat tombol Konfirmasi dan Tolak menolaknya dengan "sudah
   * dikonfirmasi". Pesanan itu terjebak: tidak bisa menjadi faktur, tidak bisa
   * dibatalkan, dan uang setoran pelanggan menggantung tanpa jalan keluar di
   * dalam aplikasi.
   */
  it("CACAT: setoran baru langsung ditandai terkonfirmasi", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.create.mockResolvedValue(setoran());

    await request(app(r)).post("/").send(badan);

    const arg = r.salesDeposit.create.mock.calls[0][0];
    expect(arg.isConfirm).toBe(true);
    expect(arg.confirmedAt).toBeInstanceOf(Date);
  });
});

describe("POST /confirm — setoran menjadi faktur", () => {
  const badanKonfirmasi = {
    id: 21,
    date: "2024-05-10",
    sales_invoice_payment: [
      { date: "2024-05-10", payment_method_id: 2, value: 50000 },
    ],
  };

  it("membalas 201 dan mengirim faktur yang baru dibuat", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());

    const res = await request(app(r)).post("/confirm").send(badanKonfirmasi);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(77);
  });

  it("menyalin nominal setoran ke faktur tanpa mengubahnya", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());

    await request(app(r))
      .post("/confirm")
      .send({ ...badanKonfirmasi, userId: 42 });

    const arg = r.salesInvoice.create.mock.calls[0][0];
    expect(arg.delivery).toBe(15000);
    expect(arg.service).toBe(10000);
    expect(arg.discount).toBe(5000);
    expect(arg.customerID).toBe(5);
    expect(arg.uuid).toBe("uuid-dps");
    expect(arg.sales).toBe("BUDI");
    expect(arg.createdBy).toBe(42);
    expect(arg.confirmedBy).toBe(42);
    expect(arg.isConfirm).toBe(true);
    expect(arg.isDelete).toBe(false);
    // Baris setoran menjadi baris faktur; hanya lima bidang yang dibawa.
    expect(arg.sales_invoice).toEqual([
      {
        product_id: 10,
        product_unit_id: 3,
        quantity: 2,
        price: 120000,
        discount: 20000,
      },
    ]);
  });

  it("memakai pembayaran dari badan permintaan sebagai pembayaran faktur", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());

    await request(app(r)).post("/confirm").send(badanKonfirmasi);

    const bayar = r.salesInvoice.create.mock.calls[0][0].sales_invoice_payment;
    expect(bayar).toEqual([
      {
        payment_method_id: 2,
        value: 50000,
        date: new Date("2024-05-10T00:00:00.000Z"),
        sales_invoice_code_id: 0,
      },
    ]);
  });

  it("menaikkan piutang sebesar nilai setoran dikurangi pembayaran", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());

    await request(app(r)).post("/confirm").send(badanKonfirmasi);

    // 200.000 + 15.000 + 10.000 - 5.000 = 220.000; dibayar 50.000.
    expect(r.receivable.addReceivableValue).toHaveBeenCalledWith(170000);
  });

  it("tidak menyentuh piutang bila setoran sudah ditandai lunas", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran({ isPaid: true }));
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());

    await request(app(r)).post("/confirm").send(badanKonfirmasi);

    expect(r.receivable.addReceivableValue).not.toHaveBeenCalled();
  });

  it("menolak 400 bila pembayaran melebihi nilai setoran", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());

    const res = await request(app(r))
      .post("/confirm")
      .send({
        id: 21,
        date: "2024-05-10",
        sales_invoice_payment: [{ payment_method_id: 2, value: 220001 }],
      });

    expect(res.status).toBe(400);
    expect(res.text).toBe(
      ErrorList["Sales deposit payment is greater than value"]
    );
    // Tidak ada faktur yang terlanjur lahir.
    expect(r.salesInvoice.create).not.toHaveBeenCalled();
    expect(r.salesDeposit.confirmByID).not.toHaveBeenCalled();
  });

  it("menerima pembayaran yang tepat sama dengan nilai setoran", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());

    const res = await request(app(r))
      .post("/confirm")
      .send({
        id: 21,
        date: "2024-05-10",
        sales_invoice_payment: [{ payment_method_id: 2, value: 220000 }],
      });

    expect(res.status).toBe(201);
    expect(r.receivable.addReceivableValue).toHaveBeenCalledWith(0);
  });

  it("membalas 404 bila setoran tidak ada", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(null);

    const res = await request(app(r)).post("/confirm").send(badanKonfirmasi);

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(r.salesInvoice.create).not.toHaveBeenCalled();
  });

  it.each([
    ["sudah dikonfirmasi", { isConfirm: true }],
    ["sudah dihapus", { isDelete: true }],
  ])("membalas 400 bila setoran %s", async (_nama, ubah) => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran(ubah));

    const res = await request(app(r)).post("/confirm").send(badanKonfirmasi);

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Deposit already confirmed"]);
    // Penjagaan ini yang mencegah satu setoran melahirkan dua faktur.
    expect(r.salesInvoice.create).not.toHaveBeenCalled();
  });

  it("mengeluarkan barang, mengurangi stok, dan menulis kartu stok", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());
    r.stockCard.createMany.mockResolvedValue([{ id: 901 }]);

    await request(app(r)).post("/confirm").send(badanKonfirmasi);

    // 2 dus x 12 pcs = 24 pcs; harga per pcs NETTO diskon baris:
    // (120.000 - 20.000) / 12 — sejalan dengan faktur penjualan dan CLI.
    // Dulu diskonnya tidak dikurangkan, sehingga angka "sales" pada laporan
    // HPP lebih besar dari uang yang sungguh masuk.
    expect(r.stockOut.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          product_id: 10,
          quantity: 24,
          price: (120000 - 20000) / 12,
          sales_invoice_id: 501,
          sales_invoice_code_id: 77,
        }),
      ],
      TANDA_TX
    );
    expect(r.productStock.updateMany).toHaveBeenCalledWith(
      [{ productID: 10, quantity: -24 }],
      TANDA_TX
    );
    const kartu = r.stockCard.createMany.mock.calls[0][0][0];
    expect(kartu.quantity).toBe(-24);
    expect(kartu.display_quantity).toBe(-2);
    expect(kartu.customer_id).toBe(5);
    expect(tambahAntrean).toHaveBeenCalledWith("stock-card-inserted", {
      id: 901,
    });
  });

  it("membuat faktur lebih dulu, baru menandai setoran terkonfirmasi", async () => {
    const r = repositoriTiruan();
    const urutan: string[] = [];
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockImplementation(async () => {
      urutan.push("faktur");
      return fakturHasilKonfirmasi();
    });
    r.salesDeposit.confirmByID.mockImplementation(async () => {
      urutan.push("tandai-setoran");
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

    await request(app(r)).post("/confirm").send(badanKonfirmasi);

    /*
      Piutang berada PALING AKHIR, sesudah kelima tulisan basis data.

      addReceivableValue menaikkan penghitung di Redis, dan Redis tidak ikut
      dibatalkan ketika transaksi gagal. Menaikkannya di tengah rangkaian —
      seperti sebelumnya — membuat total piutang membesar untuk konfirmasi yang
      pada akhirnya tidak jadi tersimpan. Urutan ini yang menjaganya.
    */
    expect(urutan).toEqual([
      "faktur",
      "tandai-setoran",
      "barang-keluar",
      "stok",
      "kartu-stok",
      "piutang",
    ]);
    // Argumen ketiga adalah id faktur yang baru dibuat: sejak migrasi
    // 20260814010000 kaitan setoran ke fakturnya disimpan di kolom
    // sales_deposit_code.sales_invoice_code_id, bukan lagi tersirat lewat
    // awalan nomor DPS-.
    expect(r.salesDeposit.confirmByID).toHaveBeenCalledWith(
      21,
      99,
      77,
      TANDA_TX
    );
  });

  /**
   * CACAT PALING BERAT DI BERKAS INI: blok catch confirm TIDAK MEMBALAS
   * apa pun.
   *
   * Seluruh handler lain menutup catch dengan `res.status(500).send(...)`.
   * Di sini catch hanya menulis ke console (src/controllers/
   * sales-deposit.controller.ts baris 321-323), lalu handler selesai tanpa
   * pernah menyentuh res.
   *
   * Akibatnya bagi pengguna: begitu ada satu galat basis data di tengah
   * konfirmasi, permintaannya MENGGANTUNG sampai proxy atau peramban menyerah.
   * Kasir tidak tahu apakah fakturnya jadi atau tidak, lalu menekan Konfirmasi
   * lagi. Padahal `salesInvoice.create` bisa saja sudah berhasil dan yang
   * gagal adalah langkah setelahnya — sehingga percobaan kedua melahirkan
   * FAKTUR KEDUA untuk setoran yang sama. Pelanggan tertagih dua kali dan stok
   * berkurang dua kali.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung sampai tes kehabisan waktu, persis seperti yang dialami
   * pemanggil sungguhan.
   */
  it("membalas 500 bila ada galat di tengah jalan", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockRejectedValue(new Error("koneksi putus"));
    const c = controller(r);

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await c.confirm(
      { body: { ...badanKonfirmasi, userId: 99 } } as never,
      res as never
    );

    // Dulu blok catch-nya hanya mencatat ke log tanpa menyentuh `res`, sehingga
    // permintaannya menggantung sampai klien timeout — dan kasir yang tidak
    // menerima balasan wajar menekan tombol konfirmasi sekali lagi.
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalled();
  });

  /**
   * CACAT: faktur sudah terlanjur ada walau langkah sesudahnya gagal.
   *
   * Lanjutan dari cacat di atas, dan inilah yang membuatnya berbahaya:
   * `salesInvoice.create` berhasil, `confirmByID` gagal, dan tidak ada
   * pembatalan. Setorannya tetap dalam keadaan belum terkonfirmasi, sehingga
   * konfirmasi ulang diperbolehkan dan membuat faktur kedua.
   */
  it("CACAT: faktur tetap tertulis saat penandaan setoran gagal, dan setoran tetap bisa dikonfirmasi lagi", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());
    r.salesDeposit.confirmByID.mockRejectedValue(new Error("koneksi putus"));
    const c = controller(r);

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await c.confirm(
      { body: { ...badanKonfirmasi, userId: 99 } } as never,
      res as never
    );

    expect(r.salesInvoice.create).toHaveBeenCalledTimes(1);
    // Kegagalannya kini muncul ke permukaan sebagai 500, jadi percobaan ulang
    // yang tidak disengaja berhenti. Yang BELUM tertutup adalah celah di
    // bawah: rangkaiannya tidak transaksional, jadi konfirmasi ulang yang
    // dilakukan dengan sengaja tetap menerbitkan faktur kedua.
    expect(res.status).toHaveBeenCalledWith(500);

    // Percobaan kedua — setoran masih belum terkonfirmasi, jadi lolos lagi.
    r.salesDeposit.confirmByID.mockResolvedValue(undefined);
    await c.confirm(
      { body: { ...badanKonfirmasi, userId: 99 } } as never,
      res as never
    );
    expect(r.salesInvoice.create).toHaveBeenCalledTimes(2);
  });

  /**
   * Faktur hasil konfirmasi memakai penomoran FAKTUR, bukan penomoran setoran.
   *
   * Dulu penamaannya memakai `salesDepositRepository.generateName`, yang
   * berawalan "DPS-", sehingga faktur penjualan yang lahir dari setoran beredar
   * dengan nomor setoran: penomoran faktur menjadi tidak berurutan, dokumennya
   * sulit dicari lewat pencarian nomor faktur, dan bila nomor itu kebetulan
   * sama dengan nomor dokumen setoran aslinya, dua dokumen berbeda beredar
   * dengan nomor yang sama ke tangan pelanggan.
   *
   * Asal-usulnya sekarang dicatat lewat kolom sales_invoice_code_id — dikunci
   * oleh tes urutan pemanggilan di atas — sehingga awalan nomor tidak lagi
   * perlu merangkap sebagai penanda asal.
   */
  it("faktur hasil konfirmasi bernomor INV-, bukan DPS-", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());

    await request(app(r)).post("/confirm").send(badanKonfirmasi);

    expect(r.salesInvoice.create.mock.calls[0][0].name).toBe(
      "INV-2024-55556666"
    );
    expect(r.salesInvoice.generateName).toHaveBeenCalled();
    expect(r.salesDeposit.generateName).not.toHaveBeenCalled();
  });

  /**
   * CACAT BERAT: uang yang SUDAH disetor pelanggan hilang saat konfirmasi.
   *
   * Setoran menyimpan pembayarannya sendiri di `sales_deposit_payment` — itulah
   * uang yang benar-benar sudah diterima kasir. Handler ini mengabaikannya
   * sepenuhnya dan hanya memakai `sales_invoice_payment` dari badan permintaan.
   *
   * Akibatnya bagi pengguna: bila pemanggil tidak mengirim ulang daftar
   * pembayarannya — misalnya layar konfirmasi hanya meminta pelunasan sisa —
   * faktur lahir TANPA satu pun pembayaran, dan seluruh nilai setoran menjadi
   * piutang. Pelanggan yang sudah membayar dimuka 50.000 tetap ditagih penuh
   * 220.000, dan uang yang sudah masuk kas tidak punya dokumen pasangannya.
   */
  it("CACAT: pembayaran setoran diabaikan bila tidak dikirim ulang", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());

    await request(app(r))
      .post("/confirm")
      .send({ id: 21, date: "2024-05-10", sales_invoice_payment: [] });

    // Setoran punya pembayaran 50.000, tetapi fakturnya lahir tanpa pembayaran.
    expect(
      r.salesInvoice.create.mock.calls[0][0].sales_invoice_payment
    ).toEqual([]);
    // Dan seluruh 220.000 menjadi piutang, bukan 170.000.
    expect(r.receivable.addReceivableValue).toHaveBeenCalledWith(220000);
  });

  /**
   * CACAT: pembayaran bernilai negatif tidak ditolak.
   *
   * Penjagaannya hanya `payment > value`. Nominal minus selalu lolos, lalu
   * dipakai untuk menghitung piutang.
   *
   * Akibatnya bagi pengguna: piutang yang lahir dari setoran bisa dibuat LEBIH
   * BESAR daripada nilai barangnya, hanya dengan mengirim pembayaran minus.
   */
  it("CACAT: pembayaran negatif menggelembungkan piutang", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesInvoice.create.mockResolvedValue(fakturHasilKonfirmasi());

    const res = await request(app(r))
      .post("/confirm")
      .send({
        id: 21,
        date: "2024-05-10",
        sales_invoice_payment: [{ payment_method_id: 2, value: -100000 }],
      });

    expect(res.status).toBe(201);
    // 220.000 - (-100.000) = 320.000 piutang untuk barang senilai 200.000.
    expect(r.receivable.addReceivableValue).toHaveBeenCalledWith(320000);
  });
});

describe("POST /reject — menolak setoran", () => {
  it("membalas 201 dan menghapus setoran", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesDeposit.delete.mockResolvedValue({ id: 21, isDelete: true });

    const res = await request(app(r))
      .post("/reject")
      .send({ id: 21, method: "none" });

    expect(res.status).toBe(201);
    expect(r.salesDeposit.delete).toHaveBeenCalledWith(21, 99);
  });

  it("mencatat kewajiban pengembalian uang bila method create", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesDeposit.delete.mockResolvedValue({ id: 21 });
    r.overpayment.createMany.mockResolvedValue([{ id: 55 }]);

    await request(app(r)).post("/reject").send({
      id: 21,
      method: "create",
      userId: 42,
      return_payment_date: "2024-05-15",
      return_payment_method: "Transfer",
      return_payment_bank: "BCA",
      return_payment_name: "Budi",
      return_payment_number: "1234567890",
    });

    const arg = r.overpayment.createMany.mock.calls[0][0][0];
    // Nominal yang dikembalikan harus persis uang yang pernah disetor.
    expect(arg.value).toBe(50000);
    expect(typeof arg.value).toBe("number");
    expect(arg.sales_deposit_code_id).toBe(21);
    expect(arg.customer_id).toBe(5);
    expect(arg.payment_method_id).toBe(2);
    expect(arg.return_payment_method).toBe("Transfer");
    expect(arg.return_payment_bank).toBe("BCA");
    expect(arg.return_payment_name).toBe("Budi");
    expect(arg.return_payment_number).toBe("1234567890");
    expect(arg.created_by).toBe(42);
    expect(arg.return_payment_date.toISOString()).toBe(
      "2024-05-15T00:00:00.000Z"
    );
  });

  it("mengangkakan nominal setoran yang tersimpan sebagai teks", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(
      setoran({
        sales_deposit_payment: [
          {
            date: new Date("2024-05-01"),
            payment_method_id: 2,
            value: "50000",
          },
        ],
      })
    );
    r.salesDeposit.delete.mockResolvedValue({ id: 21 });
    r.overpayment.createMany.mockResolvedValue([]);

    await request(app(r))
      .post("/reject")
      .send({ id: 21, method: "create", return_payment_date: "2024-05-15" });

    expect(r.overpayment.createMany.mock.calls[0][0][0].value).toBe(50000);
  });

  it("mengisi null untuk keterangan pengembalian yang tidak dikirim", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesDeposit.delete.mockResolvedValue({ id: 21 });
    r.overpayment.createMany.mockResolvedValue([]);

    await request(app(r))
      .post("/reject")
      .send({ id: 21, method: "create", return_payment_date: "2024-05-15" });

    const arg = r.overpayment.createMany.mock.calls[0][0][0];
    expect(arg.return_payment_method).toBeNull();
    expect(arg.return_payment_number).toBeNull();
  });

  it("menghapus setoran lebih dulu, baru mencatat pengembalian", async () => {
    const r = repositoriTiruan();
    const urutan: string[] = [];
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesDeposit.delete.mockImplementation(async () => {
      urutan.push("hapus");
      return { id: 21 };
    });
    r.overpayment.createMany.mockImplementation(async () => {
      urutan.push("pengembalian");
      return [];
    });

    await request(app(r))
      .post("/reject")
      .send({ id: 21, method: "create", return_payment_date: "2024-05-15" });

    expect(urutan).toEqual(["hapus", "pengembalian"]);
  });

  it("membalas 404 bila setoran tidak ada", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(null);

    const res = await request(app(r))
      .post("/reject")
      .send({ id: 21, method: "create" });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(r.salesDeposit.delete).not.toHaveBeenCalled();
  });

  it.each([
    ["sudah dikonfirmasi", { isConfirm: true }],
    ["sudah dihapus", { isDelete: true }],
  ])("membalas 400 bila setoran %s", async (_nama, ubah) => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran(ubah));

    const res = await request(app(r))
      .post("/reject")
      .send({ id: 21, method: "create" });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Deposit already confirmed"]);
    // Setoran yang sudah menjadi faktur tidak boleh dibatalkan lewat sini.
    expect(r.salesDeposit.delete).not.toHaveBeenCalled();
    expect(r.overpayment.createMany).not.toHaveBeenCalled();
  });

  it("membalas 500 bila penghapusan gagal", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesDeposit.delete.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r))
      .post("/reject")
      .send({ id: 21, method: "create" });

    expect(res.status).toBe(500);
    expect(r.overpayment.createMany).not.toHaveBeenCalled();
  });

  /**
   * CACAT BERAT: uang setoran LENYAP bila method bukan "create".
   *
   * Pencatatan kewajiban pengembalian hanya berjalan pada cabang
   * `method == "create"`. Nilai `method` datang langsung dari badan permintaan
   * dan tidak pernah divalidasi terhadap daftar nilai yang sah. Nilai apa pun
   * di luar "create" — termasuk salah ketik, huruf besar "Create", atau
   * bidang yang tidak dikirim sama sekali — membuat setoran dihapus TANPA
   * satu pun catatan pengembalian.
   *
   * Akibatnya bagi pengguna: uang yang sudah disetor pelanggan hilang dari
   * sistem. Setorannya ditandai terhapus, tidak ada baris overpayment, tidak
   * ada piutang, tidak ada jejak apa pun bahwa perusahaan masih berutang uang
   * itu. Balasannya tetap 201, jadi tidak ada tanda bahwa sesuatu terlewat.
   */
  it.each([["Create"], ["none"], [undefined]])(
    "CACAT: method %s menghapus setoran tanpa mencatat pengembalian uang",
    async (method) => {
      const r = repositoriTiruan();
      r.salesDeposit.fetchByID.mockResolvedValue(setoran());
      r.salesDeposit.delete.mockResolvedValue({ id: 21, isDelete: true });

      const res = await request(app(r))
        .post("/reject")
        .send({ id: 21, method });

      expect(res.status).toBe(201);
      expect(r.salesDeposit.delete).toHaveBeenCalledWith(21, 99);
      // 50.000 milik pelanggan hilang tanpa jejak.
      expect(r.overpayment.createMany).not.toHaveBeenCalled();
    }
  );

  /**
   * CACAT: setoran sudah terlanjur terhapus walau pencatatan pengembalian
   * gagal.
   *
   * `delete` dijalankan lebih dulu, `createMany` sesudahnya, tanpa transaksi
   * dan tanpa pembatalan. Bila pencatatan pengembalian gagal, pengguna
   * menerima 500 dan menyangka penolakannya batal — padahal setorannya sudah
   * hilang dan uangnya tidak tercatat di mana pun.
   */
  it("CACAT: setoran tetap terhapus walau pencatatan pengembalian gagal", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());
    r.salesDeposit.delete.mockResolvedValue({ id: 21, isDelete: true });
    r.overpayment.createMany.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r))
      .post("/reject")
      .send({ id: 21, method: "create", return_payment_date: "2024-05-15" });

    expect(res.status).toBe(500);
    expect(r.salesDeposit.delete).toHaveBeenCalledTimes(1);
  });
});

describe("GET /, GET /:id, GET /archives, POST /archives", () => {
  it("fetch menerjemahkan halaman dan kata kunci", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetch.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(r)).get("/?page=3&keyword=indah&pageSize=25");

    expect(res.status).toBe(200);
    expect(r.salesDeposit.fetch).toHaveBeenCalledWith({
      page: 3,
      pageSize: 25,
      keyword: "indah",
    });
  });

  /**
   * CACAT: pageSize tanpa nilai bawaan pada daftar setoran.
   *
   * `Number(undefined)` menghasilkan NaN yang diteruskan sebagai batas jumlah
   * baris. Halaman daftar setoran gagal dimuat bila pemanggil lupa mengirim
   * pageSize — padahal rute ini memang tidak punya skema yang mewajibkannya.
   */
  it("CACAT: pageSize yang hilang menjadi NaN", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(r)).get("/");

    expect(Number.isNaN(r.salesDeposit.fetch.mock.calls[0][0].pageSize)).toBe(
      true
    );
  });

  it("fetch membalas 500 bila repository gagal", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetch.mockRejectedValue(new Error("koneksi putus"));

    expect((await request(app(r)).get("/")).status).toBe(500);
  });

  it("fetchByID membalas 200 dan mengubah id menjadi angka", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(setoran());

    const res = await request(app(r)).get("/21");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(21);
    expect(r.salesDeposit.fetchByID).toHaveBeenCalledWith(21);
  });

  it("fetchByID membalas 404 bila setoran tidak ada", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockResolvedValue(null);

    const res = await request(app(r)).get("/21");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Sales deposit not found"]);
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    expect((await request(app(r)).get("/21")).status).toBe(500);
  });

  it("fetchAnnualArchives meneruskan hasil repository", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchAnnualArchives.mockResolvedValue([
      { year: 2024, count: 4 },
    ]);

    const res = await request(app(r)).get("/archives");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ year: 2024, count: 4 }]);
  });

  it("fetchArchives membangun rentang tanggal zona waktu +08:00", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    await request(app(r)).post("/archives").send({
      year: 2024,
      month: 5,
      isPending: true,
      isDelete: false,
      sortBy: "date",
      sortDirection: "desc",
      startDate: "2024-05-01",
      endDate: "2024-05-31",
    });

    const arg = r.salesDeposit.fetchArchives.mock.calls[0][0];
    expect(arg.year).toBe(2024);
    expect(arg.month).toBe(5);
    expect(arg.isPending).toBe(true);
    expect(arg.sortBy).toBe("date");
    // 2024-05-01 00:00 di +08:00 sama dengan 2024-04-30 16:00 UTC.
    expect(arg.startDate.toISOString()).toBe("2024-04-30T16:00:00.000Z");
    expect(arg.endDate.toISOString()).toBe("2024-05-31T15:59:59.000Z");
  });

  /**
   * SEMBUH: halaman dan kata kunci arsip kini dibaca dari badan permintaan.
   *
   * Dulu handler membaca `req.query.page` dan `req.query.keyword` padahal
   * rutenya POST dan skemanya mewajibkan keduanya di badan — arsip setoran
   * selalu menampilkan halaman pertama dan pencariannya mati sama sekali.
   *
   * `pageSize` di badan tetap diabaikan dengan sengaja: ukuran halaman
   * dipatok server lewat LIMIT, sama seperti arsip retur penjualan.
   */
  it("SEMBUH: page dan keyword di badan permintaan dipakai", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    await request(app(r)).post("/archives").send({
      year: 2024,
      month: 5,
      page: 5,
      pageSize: 50,
      keyword: "indah",
    });

    const arg = r.salesDeposit.fetchArchives.mock.calls[0][0];
    // Halaman 5 melewati 4 × LIMIT (10) = 40 baris.
    expect(arg.offset).toBe(40);
    expect(arg.limit).toBe(10);
    expect(arg.keyword).toBe("indah");
  });

  /**
   * CACAT: ukuran halaman arsip menjadi NaN bila LIMIT tidak terpasang.
   *
   * Akibatnya bagi pengguna: arsip setoran gagal dimuat di lingkungan yang
   * lupa memasang LIMIT, dengan galat yang tidak menyebut penyebabnya.
   */
  it("CACAT: limit menjadi NaN bila LIMIT tidak terpasang", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchArchives.mockResolvedValue({ data: [], count: 0 });
    delete process.env.LIMIT;

    await request(app(r)).post("/archives").send({ year: 2024, month: 5 });

    const arg = r.salesDeposit.fetchArchives.mock.calls[0][0];
    expect(Number.isNaN(arg.limit)).toBe(true);
    expect(Number.isNaN(arg.offset)).toBe(true);
  });

  it("fetchArchives membalas 500 bila repository gagal", async () => {
    const r = repositoriTiruan();
    r.salesDeposit.fetchArchives.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r))
      .post("/archives")
      .send({ year: 2024, month: 5 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});
