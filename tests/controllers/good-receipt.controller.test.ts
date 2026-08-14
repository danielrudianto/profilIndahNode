import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku GoodReceiptController.
 *
 * Penerimaan barang adalah dokumen yang menambah stok gudang sekaligus
 * menetapkan HARGA POKOK barang yang masuk. Karena itu satu dokumen menyeret
 * tiga repository lain — stok masuk, stok produk, dan kartu stok — dan yang
 * paling penting diuji di sini adalah NILAI yang diteruskan ke masing-masing,
 * terutama pembagian harga dengan konversi satuan. Harga pokok yang meleset
 * merembet ke seluruh laporan laba rugi berikutnya.
 *
 * Dua modul luar ditiru:
 *
 *   SocketHelper, karena aslinya memanggil getIO() yang MELEMPAR selama initIO
 *   belum pernah dipanggil — dan di dalam tes memang tidak pernah dipanggil.
 *
 *   queue.helper, karena aslinya membuat Queue BullMQ yang langsung membuka
 *   koneksi Redis saat modulnya dimuat. Tanpa tiruan, tes akan mencoba
 *   menghubungi Redis sungguhan.
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

const tambahAntrian = jest.fn();
jest.mock("../../src/utils/queue.helper", () => ({
  __esModule: true,
  // Dibungkus fungsi panah supaya jest.fn()-nya baru dibaca saat dipanggil,
  // bukan saat pabrik tiruan ini dijalankan.
  queue: {
    add: (...args: unknown[]) => tambahAntrian(...args),
  },
}));

import GoodReceiptController from "../../src/controllers/good-receipt.controller";

/** Empat repository tiruan, satu per ketergantungan konstruktor. */
function repositoryTiruan() {
  return {
    goodReceipt: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      confirm: jest.fn(),
      reject: jest.fn(),
      fetchByID: jest.fn(),
      fetchByName: jest.fn(),
      fetchUnconfirmed: jest.fn(),
      fetchAnnualArchives: jest.fn(),
      fetchArchives: jest.fn(),
    },
    stockIn: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    productStock: { updateMany: jest.fn() },
    stockCard: { createMany: jest.fn() },
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function controller(repo: Repo) {
  return new GoodReceiptController(
    repo.goodReceipt as never,
    repo.stockIn as never,
    repo.productStock as never,
    repo.stockCard as never
  );
}

function app(repo: Repo) {
  const c = controller(repo);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
    next();
  });
  a.post("/", c.create);
  a.post("/check", c.check);
  a.post("/archives", c.fetchArchives);
  a.get("/archives", c.fetchAnnualArchives);
  a.get("/unconfirmed", c.fetchUnconfirmed);
  a.put("/", c.update);
  a.put("/confirm", c.confirm);
  a.put("/reject", c.reject);
  a.get("/:id", c.fetchByID);
  a.delete("/:id", c.delete);
  return a;
}

/**
 * Satu baris barang: 2 dus, tiap dus berisi 12 batang, harga 120.000 per dus
 * dengan potongan 12.000. Harga pokok per batang seharusnya
 * (120000 - 12000) / 12 = 9.000.
 */
const baris = {
  id: 31,
  product_id: 100,
  product_unit_id: 5,
  quantity: 2,
  price: 120000,
  discount: 12000,
  product_unit: { conversion: 12 },
};

const penerimaan = {
  id: 3,
  uuid: "11111111-2222-3333-4444-555555555555",
  name: "GR-001",
  invoice_name: "INV-SUP-9",
  faktur: "1234567890123456",
  date: new Date("2024-03-10T00:00:00.000Z").toISOString(),
  company_id: 1,
  supplier_id: 2,
  discount: 0,
  is_confirm: false,
  is_delete: false,
  good_receipt: [baris],
};

beforeEach(() => {
  kirimSocket.mockClear();
  // mockReset, bukan mockClear: satu tes di bawah memasang implementasi sendiri
  // untuk queue.add dan implementasi itu tidak boleh bocor ke tes berikutnya.
  tambahAntrian.mockReset();
  process.env.LIMIT = "10";
});

/** Badan permintaan yang lengkap untuk create. */
function badanBuat(tambahan: Record<string, unknown> = {}) {
  return {
    uuid: penerimaan.uuid,
    name: "GR-001",
    invoice_name: "INV-SUP-9",
    faktur: "1234567890123456",
    date: "2024-03-10T00:00:00.000Z",
    company_id: 1,
    supplier_id: 2,
    discount: 0,
    good_receipt: [
      {
        product_id: 100,
        product_unit_id: 5,
        quantity: 2,
        price: 120000,
        discount: 12000,
      },
    ],
    ...tambahan,
  };
}

describe("POST / — membuat penerimaan barang", () => {
  function repoBuatSiap() {
    const repo = repositoryTiruan();
    repo.goodReceipt.create.mockResolvedValue(penerimaan);
    repo.stockIn.createMany.mockResolvedValue(undefined);
    repo.productStock.updateMany.mockResolvedValue(undefined);
    repo.stockCard.createMany.mockResolvedValue([{ id: 900 }]);
    return repo;
  }

  it("membalas 201 dan mengirim hasil repository", async () => {
    const repo = repoBuatSiap();

    const res = await request(app(repo)).post("/").send(badanBuat());

    expect(res.status).toBe(201);
    expect(res.body).toEqual(penerimaan);
  });

  it("meneruskan seluruh bidang dokumen beserta userId dari middleware", async () => {
    const repo = repoBuatSiap();

    await request(app(repo))
      .post("/")
      .send(badanBuat({ userId: 7 }));

    expect(repo.goodReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: penerimaan.uuid,
        name: "GR-001",
        invoice_name: "INV-SUP-9",
        faktur: "1234567890123456",
        date: new Date("2024-03-10T00:00:00.000Z"),
        company_id: 1,
        supplier_id: 2,
        created_by: 7,
        is_delete: false,
      })
    );
  });

  /**
   * Dokumen baru dianggap BELUM dikonfirmasi kecuali pemanggil menyatakan
   * sebaliknya. Bidang konfirmasi ikut kosong supaya arsip tidak mengaku ada
   * penyetuju yang sebenarnya tidak ada.
   */
  it("menyimpan sebagai belum dikonfirmasi bila is_confirm tidak dikirim", async () => {
    const repo = repoBuatSiap();

    await request(app(repo)).post("/").send(badanBuat());

    expect(repo.goodReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        is_confirm: false,
        confirmed_at: null,
        confirmed_by: null,
      })
    );
  });

  it("mencatat penyetuju dan waktunya bila dibuat langsung terkonfirmasi", async () => {
    const repo = repoBuatSiap();
    const sebelum = Date.now();

    await request(app(repo))
      .post("/")
      .send(badanBuat({ is_confirm: true, userId: 7 }));

    const [dikirim] = repo.goodReceipt.create.mock.calls[0] as [
      { is_confirm: boolean; confirmed_by: number; confirmed_at: Date }
    ];
    expect(dikirim.is_confirm).toBe(true);
    expect(dikirim.confirmed_by).toBe(7);
    expect(dikirim.confirmed_at.getTime()).toBeGreaterThanOrEqual(sebelum);
  });

  /**
   * Inti dokumen ini: harga pokok disimpan PER SATUAN TERKECIL, sedangkan
   * dokumen mencatat harga per satuan tampilan. Karena itu (harga - potongan)
   * dibagi konversi dan jumlahnya dikalikan konversi. Kalau pembagian ini
   * hilang, harga pokok satu batang menjadi harga satu dus — laba tiap
   * penjualan berikutnya terhitung jauh lebih kecil dari kenyataan, dan
   * kesalahannya menetap di kartu stok.
   */
  it("membagi harga dengan konversi satuan dan mengalikan jumlahnya", async () => {
    const repo = repoBuatSiap();

    await request(app(repo)).post("/").send(badanBuat());

    expect(repo.stockIn.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        good_receipt_code_id: 3,
        good_receipt_id: 31,
        product_id: 100,
        price: 9000, // (120000 - 12000) / 12
        quantity: 24, // 2 dus x 12
        company_id: 1,
        adjustment_case_code_id: null,
        adjustment_case_id: null,
      }),
    ]);
  });

  it("memakai konversi 1 bila barisnya tidak punya satuan", async () => {
    const repo = repoBuatSiap();
    repo.goodReceipt.create.mockResolvedValue({
      ...penerimaan,
      good_receipt: [{ ...baris, product_unit_id: null, product_unit: null }],
    });

    await request(app(repo)).post("/").send(badanBuat());

    expect(repo.stockIn.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ price: 108000, quantity: 2 }),
    ]);
    expect(repo.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 100, quantity: 2 },
    ]);
  });

  it("menambah stok produk sebanyak satuan terkecil", async () => {
    const repo = repoBuatSiap();

    await request(app(repo)).post("/").send(badanBuat());

    expect(repo.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 100, quantity: 24 },
    ]);
  });

  it("menuliskan kartu stok dengan jumlah kecil dan jumlah tampilan", async () => {
    const repo = repoBuatSiap();

    await request(app(repo)).post("/").send(badanBuat());

    expect(repo.stockCard.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        document_name: "GR-001",
        supplier_id: 2,
        product_id: 100,
        quantity: 24,
        display_quantity: 2,
        good_receipt_code_id: 3,
        good_receipt_id: 31,
        customer_id: null,
        sales_invoice_code_id: null,
      }),
    ]);
    expect(tambahAntrian).toHaveBeenCalledWith("stock-card-inserted", {
      id: 900,
    });
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repoBuatSiap();
    repo.goodReceipt.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).post("/").send(badanBuat());

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * Stok sudah bertambah SEJAK PEMBUATAN, bahkan untuk dokumen yang belum
   * dikonfirmasi. Perilaku ini dipertahankan apa adanya — pembatalannya
   * dikerjakan oleh /reject — tetapi perlu dikunci supaya jelas bahwa angka
   * stok di layar sudah memasukkan penerimaan yang masih menunggu persetujuan.
   */
  it("menambah stok walau dokumennya belum dikonfirmasi", async () => {
    const repo = repoBuatSiap();

    await request(app(repo))
      .post("/")
      .send(badanBuat({ is_confirm: false }));

    expect(repo.productStock.updateMany).toHaveBeenCalled();
    expect(repo.stockIn.createMany).toHaveBeenCalled();
  });

  /**
   * CACAT: pembuatan penerimaan barang TIDAK dikabarkan lewat socket.
   *
   * Controller lain di repo ini mengirim peristiwa untuk create dan update.
   * Penerimaan barang tidak mengirim apa pun, padahal ia mengubah stok gudang.
   * Layar kasir dan layar gudang milik pengguna lain tetap menampilkan stok
   * lama sampai dimuat ulang — penjualan bisa ditolak karena "stok kurang"
   * padahal barangnya sudah masuk.
   */
  it("CACAT: create tidak mengirim peristiwa socket apa pun", async () => {
    const repo = repoBuatSiap();

    await request(app(repo)).post("/").send(badanBuat());

    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: faktur pajak pada create TIDAK disaring, padahal pada update dan
   * confirm disaring.
   *
   * create memakai `req.body.faktur` mentah, sementara update dan confirm
   * memakai translateFaktur yang membuang nilai apa pun yang panjangnya bukan
   * 16 aksara. Jadi dokumen bisa lahir dengan faktur "123" — dan begitu ada
   * yang menyuntingnya, faktur itu ikut TERHAPUS diam-diam. Lihat pasangannya
   * pada blok PUT / di bawah.
   */
  it("CACAT: create menyimpan faktur sepanjang apa pun tanpa penyaringan", async () => {
    const repo = repoBuatSiap();

    await request(app(repo))
      .post("/")
      .send(badanBuat({ faktur: "123" }));

    expect(repo.goodReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({ faktur: "123" })
    );
  });

  /**
   * CACAT: dua pemeriksaan satuan yang tidak konsisten dalam satu handler.
   *
   * stockIn memakai `x.product_unit == null` sedangkan productStock memakai
   * `x.product_unit_id == null ? 1 : x.product_unit!.conversion`. Untuk baris
   * yang punya product_unit_id tetapi relasi product_unit-nya tidak ikut
   * termuat, pemeriksaan pertama aman sementara pemeriksaan kedua membaca
   * properti dari null dan MELEMPAR TypeError.
   *
   * Akibatnya penerimaan barang gagal dengan 500 tanpa penjelasan setelah
   * stok masuk terlanjur tercatat — dokumen dan stoknya jadi tidak sinkron.
   */
  it("CACAT: satuan yang tidak termuat membuat pembaruan stok melempar dan berujung 500", async () => {
    const repo = repoBuatSiap();
    repo.goodReceipt.create.mockResolvedValue({
      ...penerimaan,
      good_receipt: [{ ...baris, product_unit_id: 5, product_unit: null }],
    });

    const res = await request(app(repo)).post("/").send(badanBuat());

    expect(res.status).toBe(500);
    // Stok masuk sudah terlanjur ditulis sebelum langkah yang melempar.
    expect(repo.stockIn.createMany).toHaveBeenCalled();
    expect(repo.stockCard.createMany).not.toHaveBeenCalled();
  });
});

describe("PUT / — menyunting penerimaan barang", () => {
  const sudahDikonfirmasi = { ...penerimaan, is_confirm: true };

  function repoSuntingSiap() {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchByID.mockResolvedValue(sudahDikonfirmasi);
    repo.goodReceipt.update.mockResolvedValue(sudahDikonfirmasi);
    repo.stockIn.deleteMany.mockResolvedValue(undefined);
    repo.stockIn.createMany.mockResolvedValue(undefined);
    repo.productStock.updateMany.mockResolvedValue(undefined);
    repo.stockCard.createMany.mockResolvedValue([{ id: 900 }]);
    return repo;
  }

  function badanSunting(tambahan: Record<string, unknown> = {}) {
    return {
      id: 3,
      name: "GR-001",
      invoice_name: "INV-SUP-9",
      faktur: "1234567890123456",
      date: "2024-03-11T00:00:00.000Z",
      discount: 0,
      supplier_id: 2,
      company_id: 1,
      good_receipt: [
        {
          id: 31,
          product_id: 100,
          product_unit_id: 5,
          quantity: 2,
          price: 120000,
          discount: 12000,
        },
      ],
      ...tambahan,
    };
  }

  it("membalas 201 dan mempertahankan uuid dokumen lama", async () => {
    const repo = repoSuntingSiap();

    const res = await request(app(repo)).put("/").send(badanSunting());

    expect(res.status).toBe(201);
    expect(repo.goodReceipt.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3, uuid: penerimaan.uuid })
    );
  });

  /**
   * Penyuntingan membalik dulu pengaruh dokumen lama (stok dikurangi) baru
   * menerapkan yang baru (stok ditambah). Kalau salah satu langkah hilang,
   * stok gudang bergeser sebanyak dokumen itu setiap kali disunting.
   */
  it("mengurangi stok versi lama lalu menambahkan versi baru", async () => {
    const repo = repoSuntingSiap();

    await request(app(repo)).put("/").send(badanSunting());

    expect(repo.productStock.updateMany).toHaveBeenNthCalledWith(1, [
      { productID: 100, quantity: -24 },
    ]);
    expect(repo.productStock.updateMany).toHaveBeenNthCalledWith(2, [
      { productID: 100, quantity: 24 },
    ]);
  });

  it("menghapus stok masuk versi lama dan mengantrikan penghapusan kartu stoknya", async () => {
    const repo = repoSuntingSiap();

    await request(app(repo)).put("/").send(badanSunting());

    expect(repo.stockIn.deleteMany).toHaveBeenCalledWith([
      {
        good_receipt_code_id: 3,
        good_receipt_id: 31,
        adjustment_case_code_id: null,
        adjustment_case_id: null,
        price: 0,
      },
    ]);
    expect(tambahAntrian).toHaveBeenCalledWith(
      "stock-card-deleted",
      expect.objectContaining({ good_receipt_code_id: 3, good_receipt_id: 31 })
    );
    expect(tambahAntrian).toHaveBeenCalledWith("good-receipt-deleted", 31);
  });

  it("membalas 404 bila dokumennya tidak ada", async () => {
    const repo = repoSuntingSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).put("/").send(badanSunting());

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Good receipt not found"]);
    expect(repo.goodReceipt.update).not.toHaveBeenCalled();
  });

  it("membalas 400 bila dokumennya sudah dihapus", async () => {
    const repo = repoSuntingSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue({
      ...sudahDikonfirmasi,
      is_delete: true,
    });

    const res = await request(app(repo)).put("/").send(badanSunting());

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Good receipt already deleted"]);
    expect(repo.goodReceipt.update).not.toHaveBeenCalled();
  });

  /**
   * Dokumen yang masih menunggu persetujuan tidak disunting lewat jalur ini —
   * harganya diisi saat konfirmasi. Penolakannya memakai 400 karena ini aturan
   * bisnis, bukan "tidak ditemukan".
   */
  it("membalas 400 bila dokumennya belum dikonfirmasi", async () => {
    const repo = repoSuntingSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue(penerimaan);

    const res = await request(app(repo)).put("/").send(badanSunting());

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Good receipt not confirmed"]);
    expect(repo.goodReceipt.update).not.toHaveBeenCalled();
  });

  it("membalas 500 bila salah satu langkah gagal", async () => {
    const repo = repoSuntingSiap();
    repo.stockIn.createMany.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send(badanSunting());

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT BERAT: menyunting dokumen MERUSAK harga pokok barang bersatuan.
   *
   * Saat membuat dokumen, harga stok masuk dihitung
   * `(price - discount) / conversion` — harga per satuan terkecil. Saat
   * MENYUNTING, rumusnya hanya `price - discount`: pembagian konversinya
   * hilang.
   *
   * Untuk barang 1 dus berisi 12, harga pokok per batang melonjak 12 kali
   * lipat begitu dokumennya disunting sekali saja. Semua penjualan barang itu
   * sesudahnya dilaporkan RUGI besar, dan nilai persediaan di neraca ikut
   * menggelembung. Tidak ada peringatan apa pun; angkanya hanya berubah.
   */
  it("CACAT: update menyimpan harga stok masuk tanpa membagi konversi satuan", async () => {
    const repo = repoSuntingSiap();

    await request(app(repo)).put("/").send(badanSunting());

    expect(repo.stockIn.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        product_id: 100,
        price: 108000, // seharusnya 9000, yaitu (120000 - 12000) / 12
        quantity: 24,
      }),
    ]);
  });

  /**
   * CACAT: faktur pajak yang panjangnya bukan 16 aksara DIBUANG diam-diam.
   *
   * translateFaktur mengembalikan null untuk panjang berapa pun selain 16.
   * Karena create tidak menyaring apa-apa (lihat blok POST / di atas), dokumen
   * bisa lahir membawa faktur pendek — lalu menyunting nama pemasoknya saja
   * sudah cukup untuk MENGHAPUS nomor faktur pajaknya. Nomor itu dibutuhkan
   * saat pelaporan pajak dan hilangnya tidak terlihat di layar mana pun.
   */
  it.each([
    ["16 aksara dipertahankan", "1234567890123456", "1234567890123456"],
    ["panjang lain dibuang", "12345", null],
    ["kosong menjadi null", "", null],
  ])("CACAT: faktur %s", async (_nama, masukan, harapan) => {
    const repo = repoSuntingSiap();

    await request(app(repo))
      .put("/")
      .send(badanSunting({ faktur: masukan }));

    expect(repo.goodReceipt.update).toHaveBeenCalledWith(
      expect.objectContaining({ faktur: harapan })
    );
  });

  /**
   * CACAT: penyuntingan menimpa penyetuju dokumen.
   *
   * update selalu mengirim `confirmed_by: userID` dan `confirmed_at: new
   * Date()`. Siapa pun yang menyunting dokumen jadi tercatat sebagai
   * PENYETUJUNYA, dan waktu persetujuan aslinya hilang. Jejak audit penerimaan
   * barang — justru dokumen yang paling sering diperiksa saat ada selisih stok
   * — tidak lagi bisa dipercaya.
   */
  it("CACAT: update menimpa confirmed_by dengan penyunting dan confirmed_at dengan waktu kini", async () => {
    const repo = repoSuntingSiap();
    const sebelum = Date.now();

    await request(app(repo))
      .put("/")
      .send(badanSunting({ userId: 55 }));

    const [dikirim] = repo.goodReceipt.update.mock.calls[0] as [
      { confirmed_by: number; confirmed_at: Date }
    ];
    expect(dikirim.confirmed_by).toBe(55);
    expect(dikirim.confirmed_at.getTime()).toBeGreaterThanOrEqual(sebelum);
  });

  /**
   * CACAT BERAT: update tidak membalas apa pun bila repository mengembalikan
   * nilai kosong.
   *
   * Seluruh badan handler berada di dalam `if (result) { ... return ... }`.
   * Tidak ada cabang else dan tidak ada return sesudahnya, jadi ketika
   * repository mengembalikan null/undefined handler-nya selesai TANPA pernah
   * memanggil res. Permintaannya menggantung sampai pemanggil atau proxy
   * menyerah — dan pengguna melihat halaman yang berputar selamanya, tidak tahu
   * apakah suntingannya tersimpan.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP tesnya akan
   * menggantung sampai kehabisan waktu, persis yang dialami pemanggil
   * sungguhan.
   */
  it("CACAT: update selesai tanpa membalas apa pun bila repository mengembalikan null", async () => {
    const repo = repoSuntingSiap();
    repo.goodReceipt.update.mockResolvedValue(null);
    const c = controller(repo);

    const req = { body: badanSunting(), params: {}, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.update(req, res)).resolves.toBeUndefined();
    // Tidak ada status maupun badan yang pernah dikirim.
    expect((res as any).status).not.toHaveBeenCalled();
    expect((res as any).send).not.toHaveBeenCalled();
  });
});

describe("PUT /confirm — mengonfirmasi penerimaan barang", () => {
  function repoKonfirmasiSiap() {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchByID.mockResolvedValue(penerimaan);
    repo.goodReceipt.confirm.mockResolvedValue({
      ...penerimaan,
      is_confirm: true,
    });
    repo.stockIn.updateMany.mockResolvedValue(undefined);
    return repo;
  }

  function badanKonfirmasi(tambahan: Record<string, unknown> = {}) {
    return {
      id: 3,
      name: "GR-001",
      invoice_name: "INV-SUP-9",
      faktur: "1234567890123456",
      date: "2024-03-10T00:00:00.000Z",
      discount: 0,
      good_receipt: [{ id: 31, price: 120000, discount: 12000 }],
      ...tambahan,
    };
  }

  it("membalas 200 berisi dokumen yang sudah dikonfirmasi", async () => {
    const repo = repoKonfirmasiSiap();

    const res = await request(app(repo))
      .put("/confirm")
      .send(badanKonfirmasi());

    expect(res.status).toBe(200);
    expect(res.body.is_confirm).toBe(true);
  });

  /**
   * Perusahaan dan pemasok TIDAK diambil dari badan permintaan melainkan dari
   * dokumen yang tersimpan. Dengan begitu penyetuju tidak bisa diam-diam
   * memindahkan penerimaan barang ke perusahaan lain saat mengonfirmasinya.
   */
  it("mengambil perusahaan, pemasok, dan uuid dari dokumen tersimpan", async () => {
    const repo = repoKonfirmasiSiap();

    await request(app(repo))
      .put("/confirm")
      .send(badanKonfirmasi({ company_id: 999, supplier_id: 999 }));

    expect(repo.goodReceipt.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: penerimaan.uuid,
        company_id: 1,
        supplier_id: 2,
        is_confirm: true,
        is_delete: false,
      })
    );
  });

  it("mencatat penyetuju dari userId middleware", async () => {
    const repo = repoKonfirmasiSiap();

    await request(app(repo))
      .put("/confirm")
      .send(badanKonfirmasi({ userId: 42 }));

    expect(repo.goodReceipt.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ confirmed_by: 42 })
    );
  });

  /**
   * Konfirmasi hanya boleh mengubah harga dan potongan — jumlah barangnya sudah
   * terkunci sejak penerimaan. Karena itu baris yang dikirim dipangkas menjadi
   * tiga bidang saja.
   */
  it("hanya meneruskan harga, potongan, dan id tiap baris", async () => {
    const repo = repoKonfirmasiSiap();

    await request(app(repo))
      .put("/confirm")
      .send(
        badanKonfirmasi({
          good_receipt: [
            { id: 31, price: 120000, discount: 12000, quantity: 999 },
          ],
        })
      );

    expect(repo.goodReceipt.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        good_receipt: [{ id: 31, price: 120000, discount: 12000 }],
      })
    );
  });

  /**
   * Harga pokok stok masuk diperbarui memakai rumus yang sama dengan create:
   * (harga - potongan) dibagi konversi satuan.
   */
  it("memperbarui harga stok masuk dengan pembagian konversi satuan", async () => {
    const repo = repoKonfirmasiSiap();

    await request(app(repo)).put("/confirm").send(badanKonfirmasi());

    expect(repo.stockIn.updateMany).toHaveBeenCalledWith([
      {
        good_receipt_id: 31,
        good_receipt_code_id: 3,
        adjustment_case_id: null,
        adjustment_case_code_id: null,
        price: 9000, // (120000 - 12000) / 12
      },
    ]);
  });

  it("membalas 404 bila dokumennya tidak ada", async () => {
    const repo = repoKonfirmasiSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo))
      .put("/confirm")
      .send(badanKonfirmasi());

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.goodReceipt.confirm).not.toHaveBeenCalled();
  });

  /** Konfirmasi ganda ditolak supaya harga pokok tidak ditulis ulang dua kali. */
  it("membalas 400 bila dokumennya sudah dikonfirmasi", async () => {
    const repo = repoKonfirmasiSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue({
      ...penerimaan,
      is_confirm: true,
    });

    const res = await request(app(repo))
      .put("/confirm")
      .send(badanKonfirmasi());

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Good receipt already confirmed"]);
    expect(repo.goodReceipt.confirm).not.toHaveBeenCalled();
  });

  it("membalas 400 bila dokumennya sudah dihapus", async () => {
    const repo = repoKonfirmasiSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue({
      ...penerimaan,
      is_delete: true,
    });

    const res = await request(app(repo))
      .put("/confirm")
      .send(badanKonfirmasi());

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Good receipt already deleted"]);
  });

  /**
   * CACAT: badan balasan galat pada confirm berupa objek Error mentah.
   *
   * `res.status(500).send(error)` menghasilkan JSON "{}" karena message dan
   * stack bukan properti yang bisa dihitung. Pemanggil menerima badan KOSONG,
   * bukan key i18n seperti ErrorList["Internal server error"] yang dipakai
   * create dan update — frontend tidak punya apa pun untuk ditampilkan.
   */
  it("CACAT: badan galat confirm berupa objek kosong, bukan key i18n", async () => {
    const repo = repoKonfirmasiSiap();
    repo.goodReceipt.confirm.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo))
      .put("/confirm")
      .send(badanKonfirmasi());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({});
  });

  /**
   * CACAT: konfirmasi TIDAK dikabarkan lewat socket, padahal ia menetapkan
   * harga pokok yang dipakai seluruh laporan. Pengguna lain yang sedang membuka
   * daftar dokumen menunggu persetujuan tetap melihat dokumen ini di sana.
   */
  it("CACAT: confirm tidak mengirim peristiwa socket apa pun", async () => {
    const repo = repoKonfirmasiSiap();

    await request(app(repo)).put("/confirm").send(badanKonfirmasi());

    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("PUT /reject — menolak penerimaan barang", () => {
  function repoTolakSiap() {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchByID.mockResolvedValue(penerimaan);
    repo.goodReceipt.reject.mockResolvedValue({
      ...penerimaan,
      is_delete: true,
    });
    repo.stockIn.deleteMany.mockResolvedValue(undefined);
    repo.productStock.updateMany.mockResolvedValue(undefined);
    return repo;
  }

  /**
   * Penolakan menandai dokumen sebagai TERHAPUS, bukan sekadar "ditolak" —
   * tidak ada status tersendiri untuk itu di basis data.
   */
  it("membalas 200 dan menandai dokumen sebagai terhapus", async () => {
    const repo = repoTolakSiap();

    const res = await request(app(repo)).put("/reject").send({ id: 3 });

    expect(res.status).toBe(200);
    expect(repo.goodReceipt.reject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 3,
        uuid: penerimaan.uuid,
        is_confirm: false,
        is_delete: true,
      })
    );
  });

  /**
   * Karena stok sudah bertambah sejak pembuatan, penolakan harus
   * MENGEMBALIKANNYA: jumlahnya dibalik tanda lalu tetap dikali konversi
   * satuan. Kalau langkah ini hilang, barang yang tidak jadi diterima tetap
   * tercatat ada di gudang.
   */
  it("mengembalikan stok dan menghapus stok masuknya", async () => {
    const repo = repoTolakSiap();

    await request(app(repo)).put("/reject").send({ id: 3 });

    expect(repo.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 100, quantity: -24 },
    ]);
    expect(repo.stockIn.deleteMany).toHaveBeenCalledWith([
      {
        good_receipt_id: 31,
        good_receipt_code_id: 3,
        adjustment_case_id: null,
        adjustment_case_code_id: null,
        price: 0,
      },
    ]);
  });

  it("mengantrikan penghapusan kartu stok tiap baris", async () => {
    const repo = repoTolakSiap();

    await request(app(repo)).put("/reject").send({ id: 3 });

    expect(tambahAntrian).toHaveBeenCalledWith(
      "stock-card-deleted",
      expect.objectContaining({ good_receipt_code_id: 3, good_receipt_id: 31 })
    );
  });

  it("membalas 404 bila dokumennya tidak ada", async () => {
    const repo = repoTolakSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).put("/reject").send({ id: 3 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.goodReceipt.reject).not.toHaveBeenCalled();
  });

  /** Dokumen yang sudah dikonfirmasi tidak boleh ditolak belakangan. */
  it("membalas 400 bila dokumennya sudah dikonfirmasi", async () => {
    const repo = repoTolakSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue({
      ...penerimaan,
      is_confirm: true,
    });

    const res = await request(app(repo)).put("/reject").send({ id: 3 });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Good receipt already confirmed"]);
    expect(repo.goodReceipt.reject).not.toHaveBeenCalled();
    expect(repo.productStock.updateMany).not.toHaveBeenCalled();
  });

  it("membalas 400 bila dokumennya sudah dihapus", async () => {
    const repo = repoTolakSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue({
      ...penerimaan,
      is_delete: true,
    });

    const res = await request(app(repo)).put("/reject").send({ id: 3 });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Good receipt already deleted"]);
  });

  it("membalas 400 bila repository tidak mengembalikan hasil", async () => {
    const repo = repoTolakSiap();
    repo.goodReceipt.reject.mockResolvedValue(null);

    const res = await request(app(repo)).put("/reject").send({ id: 3 });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Good receipt creation failed"]);
    expect(repo.productStock.updateMany).not.toHaveBeenCalled();
  });

  it("membalas 500 bila salah satu langkah gagal", async () => {
    const repo = repoTolakSiap();
    repo.stockIn.deleteMany.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/reject").send({ id: 3 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({});
  });
});

describe("DELETE /:id — menghapus penerimaan barang", () => {
  const sudahDikonfirmasi = { ...penerimaan, is_confirm: true };

  function repoHapusSiap() {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchByID.mockResolvedValue(sudahDikonfirmasi);
    repo.goodReceipt.delete.mockResolvedValue({
      ...sudahDikonfirmasi,
      is_delete: true,
    });
    repo.stockIn.deleteMany.mockResolvedValue(undefined);
    repo.productStock.updateMany.mockResolvedValue(undefined);
    return repo;
  }

  /**
   * Penghapusan membalas 201 — status "dibuat" untuk perbuatan menghapus.
   * Ganjil, tetapi dipertahankan apa adanya karena frontend sudah bergantung
   * padanya; menurunkannya ke 200 akan mengubah cabang keberhasilan di sana.
   */
  it("membalas 201 dan meneruskan id serta userId", async () => {
    const repo = repoHapusSiap();

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(201);
    expect(repo.goodReceipt.delete).toHaveBeenCalledWith(3, 99);
  });

  it("mengembalikan stok sebanyak satuan terkecil dan menghapus stok masuknya", async () => {
    const repo = repoHapusSiap();

    await request(app(repo)).delete("/3");

    expect(repo.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 100, quantity: -24 },
    ]);
    expect(repo.stockIn.deleteMany).toHaveBeenCalledWith([
      {
        good_receipt_code_id: 3,
        good_receipt_id: 31,
        adjustment_case_code_id: null,
        adjustment_case_id: null,
        price: 0,
      },
    ]);
  });

  it("membalas 404 bila dokumennya tidak ada", async () => {
    const repo = repoHapusSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Good receipt not found"]);
    expect(repo.goodReceipt.delete).not.toHaveBeenCalled();
  });

  /**
   * Dokumen yang belum dikonfirmasi tidak dihapus lewat jalur ini — alurnya
   * adalah /reject. Penolakannya 400 karena ini aturan bisnis.
   */
  it("membalas 400 bila dokumennya belum dikonfirmasi", async () => {
    const repo = repoHapusSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue(penerimaan);

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Good receipt not confirmed"]);
    expect(repo.goodReceipt.delete).not.toHaveBeenCalled();
  });

  it("membalas 400 bila dokumennya sudah dihapus", async () => {
    const repo = repoHapusSiap();
    repo.goodReceipt.fetchByID.mockResolvedValue({
      ...sudahDikonfirmasi,
      is_delete: true,
    });

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Good receipt already deleted"]);
    expect(repo.goodReceipt.delete).not.toHaveBeenCalled();
  });

  it("membalas 500 bila salah satu langkah gagal", async () => {
    const repo = repoHapusSiap();
    repo.stockIn.deleteMany.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({});
  });

  /**
   * CACAT: penghapusan TIDAK dikabarkan lewat socket meski ia mengurangi stok
   * gudang. Layar pengguna lain tetap menampilkan stok lama sampai dimuat
   * ulang, dan penjualan bisa dilakukan atas angka stok yang sudah tidak
   * berlaku.
   */
  it("CACAT: delete tidak mengirim peristiwa socket apa pun", async () => {
    const repo = repoHapusSiap();

    await request(app(repo)).delete("/3");

    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: pengantrian penghapusan kartu stok tidak pernah ditunggu.
   *
   * `goodReceipt.good_receipt?.forEach(async (x) => { await queue.add(...) })`
   * — forEach MENGABAIKAN promise yang dikembalikan fungsi async, jadi balasan
   * 201 dikirim sebelum pekerjaan antrian benar-benar terdaftar.
   *
   * Akibatnya "berhasil" yang dibaca pengguna belum berarti kartu stoknya akan
   * dibersihkan; dan bila Redis sedang bermasalah, penolakannya tidak
   * tertangkap try/catch mana pun — ia menjadi unhandled rejection yang pada
   * Node 15 ke atas MENGHENTIKAN SELURUH PROSES beberapa saat setelah pengguna
   * menerima balasan sukses.
   *
   * Dikunci tanpa ikut menjatuhkan proses tes: antrian dibuat menggantung, dan
   * balasan 201 terbukti sudah terkirim sementara pekerjaannya belum selesai.
   */
  it("CACAT: balasan 201 dikirim sebelum pekerjaan antrian selesai", async () => {
    const repo = repoHapusSiap();
    let antrianSelesai = false;
    let lanjutkan: (() => void) | undefined;
    tambahAntrian.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          lanjutkan = () => {
            antrianSelesai = true;
            resolve();
          };
        })
    );

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(201);
    expect(antrianSelesai).toBe(false);
    lanjutkan?.();
  });
});

describe("POST /check dan GET /:id, /unconfirmed, /archives", () => {
  it("check mencari dokumen berdasarkan nama", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchByName.mockResolvedValue(penerimaan);

    const res = await request(app(repo))
      .post("/check")
      .send({ name: "GR-001" });

    expect(res.status).toBe(200);
    expect(repo.goodReceipt.fetchByName).toHaveBeenCalledWith("GR-001");
    expect(res.body).toEqual(penerimaan);
  });

  it("check membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchByName.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo))
      .post("/check")
      .send({ name: "GR-001" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchByID membalas 200 berisi dokumen yang diminta", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchByID.mockResolvedValue(penerimaan);

    const res = await request(app(repo)).get("/3");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(penerimaan);
    expect(repo.goodReceipt.fetchByID).toHaveBeenCalledWith(3);
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchByID.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/3");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: dokumen yang tidak ada dijawab 200 berbadan kosong, bukan 404.
   *
   * Handler update, delete, confirm, dan reject semuanya memeriksa hasil
   * fetchByID dan membalas 404 ketika null. Handler fetchByID sendiri tidak.
   * Frontend yang membuka halaman rincian dengan id keliru menerima "berhasil"
   * dengan badan kosong — layarnya menampilkan formulir kosong alih-alih pesan
   * "tidak ditemukan".
   */
  it("CACAT: dokumen yang tidak ada dijawab 200 dengan badan kosong", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/3");

    expect(res.status).toBe(200);
    expect(res.text).toBe("");
  });

  it("fetchUnconfirmed meneruskan halaman dan ukuran halaman", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchUnconfirmed.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/unconfirmed?page=3");

    expect(repo.goodReceipt.fetchUnconfirmed).toHaveBeenCalledWith({
      keyword: "",
      page: 3,
      pageSize: 10,
    });
  });

  it("fetchUnconfirmed memakai halaman 1 untuk parameter yang tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchUnconfirmed.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/unconfirmed?page=-5");

    expect(repo.goodReceipt.fetchUnconfirmed).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it("fetchAnnualArchives meneruskan hasil repository apa adanya", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchAnnualArchives.mockResolvedValue([
      { year: 2024, count: 12 },
    ]);

    const res = await request(app(repo)).get("/archives");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ year: 2024, count: 12 }]);
  });

  it("fetchAnnualArchives membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchAnnualArchives.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/archives");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchArchives meneruskan seluruh penyaring", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).post("/archives").send({
      year: 2024,
      month: 3,
      page: 2,
      keyword: "gr",
      startDate: "2024-03-01T00:00:00.000Z",
      endDate: "2024-03-31T00:00:00.000Z",
      sortBy: "date",
      sortDirection: "desc",
      isActive: true,
      isDelete: false,
      isPending: false,
    });

    expect(repo.goodReceipt.fetchArchives).toHaveBeenCalledWith({
      month: 3,
      year: 2024,
      page: 2,
      pageSize: 10, // dari process.env.LIMIT, bukan dari badan permintaan
      keyword: "gr",
      startDate: new Date("2024-03-01T00:00:00.000Z"),
      endDate: new Date("2024-03-31T00:00:00.000Z"),
      sortBy: "date",
      sortDirection: "desc",
      isActive: true,
      isDelete: false,
      isPending: false,
    });
  });

  /**
   * Kata kunci berisi "%" dulu MEMATIKAN PROSES: translateKeyword melempar
   * URIError di luar blok try. Kini kata kuncinya dipakai apa adanya dan
   * pencariannya berjalan seperti biasa.
   */
  it("fetchArchives menerima kata kunci berisi persen tanpa menggagalkan permintaan", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(repo))
      .post("/archives")
      .send({ year: 2024, month: 3, keyword: "%" });

    expect(res.status).toBe(200);
    expect(repo.goodReceipt.fetchArchives).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "%" })
    );
  });

  it("fetchArchives membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchArchives.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo))
      .post("/archives")
      .send({ year: 2024, month: 3 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: rentang tanggal arsip yang kosong menjadi Invalid Date.
   *
   * Controller memanggil `new Date(req.body.startDate)` tanpa penjagaan apa
   * pun — berbeda dari AdjustmentCaseController yang memakai translateDate.
   * Untuk permintaan tanpa startDate/endDate, kedua batasnya menjadi Invalid
   * Date dan penyaringan tanggal di basis data berperilaku tak menentu.
   * Pengguna melihat arsip yang isinya tidak sesuai periode mana pun, tanpa
   * satu pun pesan galat.
   */
  it("CACAT: startDate dan endDate yang kosong menjadi Invalid Date", async () => {
    const repo = repositoryTiruan();
    repo.goodReceipt.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).post("/archives").send({ year: 2024, month: 3 });

    const [dikirim] = repo.goodReceipt.fetchArchives.mock.calls[0] as [
      { startDate: Date; endDate: Date }
    ];
    expect(Number.isNaN(dikirim.startDate.getTime())).toBe(true);
    expect(Number.isNaN(dikirim.endDate.getTime())).toBe(true);
  });
});
