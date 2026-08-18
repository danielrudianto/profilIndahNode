import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ProductController.
 *
 * Bentuknya mengikuti tests/controllers/company.controller.test.ts: repository
 * ditiru dan disuntikkan lewat konstruktor, lalu yang diperiksa adalah
 * keputusan controller-nya — status HTTP mana yang dipilih, nilai apa yang
 * diteruskan ke repository, dan pekerjaan latar apa yang dijadwalkan.
 *
 * Tiga modul luar ikut ditiru karena semuanya menyentuh layanan sungguhan
 * begitu di-import:
 *
 *   utils/meili.helper  — memanggil initializeMeiliSearch() saat modulnya
 *                         dimuat, jadi tanpa tiruan tes akan mencoba
 *                         menghubungi Meilisearch di localhost:7700.
 *   utils/queue.helper  — membuat Queue BullMQ yang membuka koneksi Redis.
 *   utils/socket.helper — memanggil getIO() yang MELEMPAR bila initIO belum
 *                         dipanggil (ProductController sendiri tidak memakai
 *                         socket, tetapi tiruannya dipertahankan agar bentuk
 *                         berkas ini sama dengan acuan).
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

const cariMeili = jest.fn();
jest.mock("../../src/utils/meili.helper", () => ({
  __esModule: true,
  meili: {
    index: (nama: string) => ({
      search: (...args: unknown[]) => cariMeili(nama, ...args),
    }),
  },
}));

const tambahAntrian = jest.fn();
jest.mock("../../src/utils/queue.helper", () => ({
  __esModule: true,
  queue: {
    add: (...args: unknown[]) => tambahAntrian(...args),
  },
}));

import ProductController from "../../src/controllers/product.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
function repositoryTiruan() {
  return {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleActive: jest.fn(),
    fetchByID: jest.fn(),
    fetchByReference: jest.fn(),
    fetchAutocomplete: jest.fn(),
    updateSalesPrice: jest.fn(),
    updatePurchasePrice: jest.fn(),
  };
}

function unitRepositoryTiruan() {
  return { create: jest.fn() };
}

function stockCardRepositoryTiruan() {
  return { checkExistingByProductID: jest.fn() };
}

type Repo = ReturnType<typeof repositoryTiruan>;
type UnitRepo = ReturnType<typeof unitRepositoryTiruan>;
type CardRepo = ReturnType<typeof stockCardRepositoryTiruan>;

function controller(repo: Repo, unit: UnitRepo, card: CardRepo) {
  return new ProductController(repo as never, unit as never, card as never);
}

function app(repo: Repo, unit: UnitRepo, card: CardRepo) {
  const c = controller(repo, unit, card);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.post("/", c.create);
  a.put("/", c.update);
  a.put("/toggle", c.toggleActive);
  a.put("/sales-price", c.updateSalesPrice);
  a.put("/purchase-price", c.updatePurchasePrice);
  a.get("/autocomplete", c.fetchAutocomplete);
  a.get("/selector", c.fetchSelector);
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  a.delete("/:id", c.delete);
  return a;
}

/** Balasan tiruan untuk pemanggilan handler langsung (tanpa lewat HTTP). */
function resTiruan() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
}

function produk(ubah: Record<string, unknown> = {}) {
  return {
    id: 5,
    reference: "PRD-001",
    description: "Pipa PVC 3 inci",
    product_brand_id: 2,
    product_type_id: 3,
    unit: "batang",
    minimum_stock: 10,
    is_active: true,
    is_delete: false,
    ...ubah,
  };
}

/** Dokumen Meilisearch yang lengkap; ProductModel.fromMeilisearch memakainya. */
function dokumenMeili(ubah: Record<string, unknown> = {}) {
  return {
    id: 5,
    reference: "PRD-001",
    description: "Pipa PVC 3 inci",
    product_brand_id: 2,
    product_type_id: 3,
    unit: "batang",
    minimum_stock: 10,
    sales_price: "1500",
    sales_discount: "0",
    purchase_price: "1000",
    purchase_discount: "0",
    is_active: true,
    is_delete: false,
    product_brand: { id: 2, name: "Wavin" },
    product_type: { id: 3, name: "Pipa" },
    ...ubah,
  };
}

const isiBadan = {
  reference: "PRD-001",
  description: "Pipa PVC 3 inci",
  product_brand_id: 2,
  product_type_id: 3,
  minimum_stock: 10,
  unit: "batang",
  units: [],
};

beforeEach(() => {
  kirimSocket.mockReset();
  cariMeili.mockReset();
  tambahAntrian.mockReset();
  process.env.LIMIT = "10";
});

describe("POST / — membuat produk", () => {
  it("membalas 201 dan mengirim produk hasil repository", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByReference.mockResolvedValue(null);
    repo.create.mockResolvedValue(produk());

    const res = await request(app(repo, unit, card))
      .post("/")
      .send({ ...isiBadan });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(produk());
  });

  it("meneruskan userId dari middleware sebagai created_by beserta harga awal", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByReference.mockResolvedValue(null);
    repo.create.mockResolvedValue(produk());

    await request(app(repo, unit, card))
      .post("/")
      .send({
        ...isiBadan,
        userId: 7,
        sales_price: 1500,
        sales_discount: 50,
        purchase_price: 1000,
        purchase_discount: 25,
      });

    expect(repo.create).toHaveBeenCalledWith({
      reference: "PRD-001",
      description: "Pipa PVC 3 inci",
      product_brand_id: 2,
      product_type_id: 3,
      created_by: 7,
      created_at: expect.any(Date),
      minimum_stock: 10,
      unit: "batang",
      sales_price: 1500,
      sales_discount: 50,
      purchase_price: 1000,
      purchase_discount: 25,
    });
  });

  it("menolak dengan 400 bila referensinya sudah dipakai produk lain", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByReference.mockResolvedValue(produk({ id: 88 }));

    const res = await request(app(repo, unit, card))
      .post("/")
      .send({ ...isiBadan });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Reference unique constraint"]);
    // Penting: produknya tidak boleh ikut dibuat saat referensinya bentrok.
    expect(repo.create).not.toHaveBeenCalled();
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  it("menyimpan satuan tambahan memakai id produk yang baru dibuat", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByReference.mockResolvedValue(null);
    repo.create.mockResolvedValue(produk({ id: 12 }));

    await request(app(repo, unit, card))
      .post("/")
      .send({
        ...isiBadan,
        units: [
          {
            unit: "dus",
            conversion: 10,
            sales_price: 15000,
            sales_discount: 0,
            purchase_price: 10000,
            purchase_discount: 0,
          },
        ],
      });

    expect(unit.create).toHaveBeenCalledWith([
      {
        product_id: 12,
        unit: "dus",
        conversion: 10,
        created_by: 99,
        created_at: expect.any(Date),
        sales_price: 15000,
        sales_discount: 0,
        purchase_price: 10000,
        purchase_discount: 0,
      },
    ]);
  });

  it("tidak memanggil repository satuan bila daftar satuannya kosong", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByReference.mockResolvedValue(null);
    repo.create.mockResolvedValue(produk());

    await request(app(repo, unit, card))
      .post("/")
      .send({ ...isiBadan, units: [] });

    expect(unit.create).not.toHaveBeenCalled();
  });

  it("menjadwalkan pengindeksan produk baru ke antrian", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByReference.mockResolvedValue(null);
    repo.create.mockResolvedValue(produk({ id: 12 }));

    await request(app(repo, unit, card))
      .post("/")
      .send({ ...isiBadan });

    expect(tambahAntrian).toHaveBeenCalledWith("product-created", { id: 12 });
  });

  it("membalas 500 bila repository gagal, tanpa menjadwalkan apa pun", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByReference.mockResolvedValue(null);
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo, unit, card))
      .post("/")
      .send({ ...isiBadan });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  /**
   * CACAT: badan tanpa `units` dilaporkan sebagai galat server.
   *
   * `units` dibaca apa adanya lalu langsung dipakai `units.length`. Bila
   * kliennya tidak mengirim bidang itu, yang terjadi adalah TypeError — bukan
   * penolakan 400 yang menjelaskan bidang mana yang kurang.
   *
   * Akibat bagi pengguna: produknya SUDAH TERSIMPAN di basis data (create
   * dipanggil sebelum baris yang melempar), tetapi layar menampilkan "galat
   * server". Pengguna mengira gagal lalu mengulang, dan percobaan kedua
   * ditolak 400 karena referensinya kini dianggap bentrok dengan produk yang
   * tanpa sadar sudah dibuatnya sendiri.
   */
  it("CACAT: 500 saat units tidak dikirim, padahal produknya terlanjur dibuat", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByReference.mockResolvedValue(null);
    repo.create.mockResolvedValue(produk());

    const { units: _units, ...tanpaUnits } = isiBadan;
    const res = await request(app(repo, unit, card))
      .post("/")
      .send(tanpaUnits);

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    // Inilah bagian yang merugikan: produknya sudah masuk basis data.
    expect(repo.create).toHaveBeenCalled();
    // Tetapi pengindeksannya tidak pernah dijadwalkan, jadi produk itu juga
    // tidak akan muncul di hasil pencarian.
    expect(tambahAntrian).not.toHaveBeenCalled();
  });
});

describe("PUT / — mengubah produk", () => {
  it("membalas 200 dan mengirim produk yang sudah diubah", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.fetchByReference.mockResolvedValue(null);
    repo.update.mockResolvedValue(produk({ description: "Pipa PVC 4 inci" }));

    const res = await request(app(repo, unit, card))
      .put("/")
      .send({ ...isiBadan, id: 5 });

    // Perhatikan: create membalas 201, tetapi update membalas 200.
    expect(res.status).toBe(200);
    expect(res.body.description).toBe("Pipa PVC 4 inci");
  });

  it("meneruskan id dan userId ke repository", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.fetchByReference.mockResolvedValue(null);
    repo.update.mockResolvedValue(produk());

    await request(app(repo, unit, card))
      .put("/")
      .send({ ...isiBadan, id: 5, userId: 7 });

    expect(repo.update).toHaveBeenCalledWith({
      id: 5,
      reference: "PRD-001",
      description: "Pipa PVC 3 inci",
      product_brand_id: 2,
      product_type_id: 3,
      created_by: 7,
      created_at: expect.any(Date),
      minimum_stock: 10,
      unit: "batang",
    });
  });

  it("menjadwalkan pengindeksan ulang setelah perubahan", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.fetchByReference.mockResolvedValue(null);
    repo.update.mockResolvedValue(produk());

    await request(app(repo, unit, card))
      .put("/")
      .send({ ...isiBadan, id: 5 });

    expect(tambahAntrian).toHaveBeenCalledWith("product-updated", { id: 5 });
  });

  it("membalas 404 bila produknya tidak ada", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo, unit, card))
      .put("/")
      .send({ ...isiBadan, id: 5 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Product not found"]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  /**
   * Produk yang sudah dihapus ditolak dengan 400, bukan 404 seperti produk
   * yang memang tidak ada — padahal pesannya sama persis. Frontend jadi tidak
   * bisa membedakan keduanya lewat pesan, hanya lewat status. Perilaku ini
   * dikunci apa adanya.
   */
  it("membalas 400 bila produknya sudah dihapus", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk({ is_delete: true }));

    const res = await request(app(repo, unit, card))
      .put("/")
      .send({ ...isiBadan, id: 5 });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Product not found"]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("menolak 400 bila referensinya sudah dipakai produk LAIN", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.fetchByReference.mockResolvedValue(produk({ id: 88 }));

    const res = await request(app(repo, unit, card))
      .put("/")
      .send({ ...isiBadan, id: 5 });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Reference unique constraint"]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("mengizinkan produk mempertahankan referensinya sendiri", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    // Referensi yang sama, tetapi milik produk yang sedang diubah.
    repo.fetchByReference.mockResolvedValue(produk({ id: 5 }));
    repo.update.mockResolvedValue(produk());

    const res = await request(app(repo, unit, card))
      .put("/")
      .send({ ...isiBadan, id: 5 });

    expect(res.status).toBe(200);
    expect(repo.update).toHaveBeenCalled();
  });

  it("membalas 500 bila penyimpanan gagal", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.fetchByReference.mockResolvedValue(null);
    repo.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo, unit, card))
      .put("/")
      .send({ ...isiBadan, id: 5 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  /**
   * CACAT BERAT: pemeriksaan keberadaan produk pada update berada DI LUAR
   * blok try.
   *
   * `this.productRepository.fetchByID(id)` dipanggil sebelum `try {` dibuka.
   * Bila kueri itu gagal — koneksi basis data putus sesaat, misalnya —
   * penolakannya tidak tertangkap siapa pun. Express 4 tidak menangani
   * penolakan promise dari handler async, jadi tidak ada balasan yang dikirim
   * dan Node 15 ke atas menghentikan seluruh proses pada unhandled rejection.
   *
   * Akibat bagi pengguna: satu kali menekan "Simpan" pada form produk saat
   * basis data sedang bermasalah tidak berujung pesan galat, melainkan
   * MEMATIKAN SERVER untuk semua orang yang sedang memakainya.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu.
   */
  it("CACAT: update menolak tanpa membalas bila pemeriksaan produk gagal", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));
    const c = controller(repo, unit, card);

    const req = { body: { id: 5 }, params: {}, query: {} } as never;
    const res = resTiruan();

    await expect(c.update(req, res as never)).rejects.toThrow("koneksi putus");
    // Tidak ada balasan yang pernah dikirim — itulah sebabnya permintaannya
    // menggantung alih-alih menerima 500.
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("PUT /toggle — mengaktifkan dan menonaktifkan produk", () => {
  it("membalas 201 dan meneruskan status AKTIF SAAT INI ke repository", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk({ is_active: true }));
    repo.toggleActive.mockResolvedValue(produk({ is_active: false }));

    const res = await request(app(repo, unit, card))
      .put("/toggle")
      .send({
        id: 5,
      });

    expect(res.status).toBe(201);
    // Controller mengirim nilai lama; repository yang bertugas membalikkannya.
    expect(repo.toggleActive).toHaveBeenCalledWith(5, true);
  });

  it("mengubah id bertipe teks menjadi angka sebelum meneruskannya", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk({ is_active: false }));
    repo.toggleActive.mockResolvedValue(produk());

    await request(app(repo, unit, card))
      .put("/toggle")
      .send({ id: "5" });

    expect(repo.fetchByID).toHaveBeenCalledWith(5);
    expect(repo.toggleActive).toHaveBeenCalledWith(5, false);
  });

  it("membalas 404 bila produknya tidak ada dan 400 bila sudah dihapus", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);
    expect(
      (
        await request(app(repo, unit, card))
          .put("/toggle")
          .send({ id: 5 })
      ).status
    ).toBe(404);

    repo.fetchByID.mockResolvedValue(produk({ is_delete: true }));
    expect(
      (
        await request(app(repo, unit, card))
          .put("/toggle")
          .send({ id: 5 })
      ).status
    ).toBe(400);
    expect(repo.toggleActive).not.toHaveBeenCalled();
  });

  /**
   * CACAT: perubahan status aktif TIDAK dijadwalkan ke antrian pengindeksan.
   *
   * create, update, dan delete semuanya memanggil queue.add agar dokumen
   * Meilisearch ikut menyesuaikan. toggleActive tidak.
   *
   * Akibat bagi pengguna: daftar produk dan selector menyaring dengan
   * `is_active = true` LANGSUNG dari indeks Meilisearch. Produk yang baru
   * dinonaktifkan tetap muncul di pencarian dan tetap bisa dipilih ke dalam
   * faktur — sampai ada perubahan lain pada produk itu yang memicu
   * pengindeksan ulang. Sebaliknya, produk yang baru diaktifkan kembali tetap
   * tidak bisa ditemukan.
   */
  it("CACAT: toggleActive tidak menjadwalkan pengindeksan ulang", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk({ is_active: true }));
    repo.toggleActive.mockResolvedValue(produk({ is_active: false }));

    await request(app(repo, unit, card))
      .put("/toggle")
      .send({ id: 5 });

    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.toggleActive.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo, unit, card))
      .put("/toggle")
      .send({ id: 5 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("PUT /sales-price dan /purchase-price — perubahan harga massal", () => {
  const daftar = [
    { product_id: 5, product_unit_id: null, price: 1500, discount: 100 },
    { product_id: 6, product_unit_id: 9, price: 2500, discount: 0 },
  ];

  it("updateSalesPrice meneruskan hanya empat bidang harga dan membalas 201", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.updateSalesPrice.mockResolvedValue({ count: 2 });

    const res = await request(app(repo, unit, card))
      .put("/sales-price")
      // Bidang asing sengaja disertakan untuk memastikan ia dibuang.
      .send({ items: daftar.map((x) => ({ ...x, catatan: "abaikan" })) });

    expect(res.status).toBe(201);
    expect(repo.updateSalesPrice).toHaveBeenCalledWith(daftar);
  });

  it("updateSalesPrice menjadwalkan satu pekerjaan antrian per baris", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.updateSalesPrice.mockResolvedValue({ count: 2 });

    await request(app(repo, unit, card))
      .put("/sales-price")
      .send({ items: daftar });

    expect(tambahAntrian).toHaveBeenCalledTimes(2);
    expect(tambahAntrian).toHaveBeenNthCalledWith(1, "product-updated", {
      id: 5,
    });
    expect(tambahAntrian).toHaveBeenNthCalledWith(2, "product-updated", {
      id: 6,
    });
  });

  it("updatePurchasePrice meneruskan daftar yang sama dan membalas 201", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.updatePurchasePrice.mockResolvedValue({ count: 2 });

    const res = await request(app(repo, unit, card))
      .put("/purchase-price")
      .send({ items: daftar });

    expect(res.status).toBe(201);
    expect(repo.updatePurchasePrice).toHaveBeenCalledWith(daftar);
    expect(tambahAntrian).toHaveBeenCalledTimes(2);
  });

  it("membalas 500 bila penyimpanan harga gagal", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.updateSalesPrice.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo, unit, card))
      .put("/sales-price")
      .send({ items: daftar });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  /**
   * CACAT: harga massal diterima tanpa memeriksa produknya ada atau tidak.
   *
   * Berbeda dengan update biasa yang memanggil fetchByID lebih dulu, kedua
   * handler ini langsung meneruskan apa pun isi `items` ke repository dan
   * menjadwalkan pengindeksan untuk setiap product_id di dalamnya.
   *
   * Akibat bagi pengguna: id produk yang salah ketik atau sudah dihapus tetap
   * dibalas 201 "berhasil", dan antrian dipenuhi pekerjaan pengindeksan untuk
   * produk yang tidak ada. Operator tidak pernah diberi tahu bahwa perubahan
   * harganya sebenarnya tidak mengenai apa pun.
   */
  it("CACAT: id produk yang tidak ada tetap dibalas 201 dan tetap masuk antrian", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.updateSalesPrice.mockResolvedValue({ count: 0 });

    const res = await request(app(repo, unit, card))
      .put("/sales-price")
      .send({
        items: [
          { product_id: 999999, product_unit_id: null, price: 1, discount: 0 },
        ],
      });

    expect(res.status).toBe(201);
    expect(repo.fetchByID).not.toHaveBeenCalled();
    expect(tambahAntrian).toHaveBeenCalledWith("product-updated", {
      id: 999999,
    });
  });
});

describe("GET / dan GET /selector — pencarian lewat Meilisearch", () => {
  it("menerjemahkan halaman dan ukuran halaman menjadi limit dan offset", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

    const res = await request(app(repo, unit, card)).get(
      "/?page=3&pageSize=25&keyword=pipa"
    );

    expect(res.status).toBe(200);
    expect(cariMeili).toHaveBeenCalledWith("product", "pipa", {
      limit: 25,
      offset: 50,
      filter: ["is_delete = false"],
    });
  });

  /**
   * process.env.LIMIT TIDAK dipakai di sini — barisnya sudah dikomentari dan
   * diganti translatePageSize, yang punya nilai bawaan 10 sendiri. Jadi daftar
   * produk tetap konsisten meski LIMIT tidak diset, berbeda dengan beberapa
   * handler lain di aplikasi ini.
   */
  it("memakai halaman 1 dan ukuran 10 bila parameternya kosong atau tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });
    delete process.env.LIMIT;

    await request(app(repo, unit, card)).get("/?page=abc&pageSize=999");

    expect(cariMeili).toHaveBeenCalledWith("product", "", {
      limit: 10,
      offset: 0,
      filter: ["is_delete = false"],
    });
  });

  it("kata kunci berisi persen tetap dicari, tidak menggagalkan permintaan", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

    const res = await request(app(repo, unit, card)).get("/?keyword=%25");

    expect(res.status).toBe(200);
    expect(cariMeili).toHaveBeenCalledWith("product", "%", expect.anything());
  });

  it("mengubah dokumen Meilisearch menjadi bentuk ProductModel", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    cariMeili.mockResolvedValue({
      hits: [dokumenMeili()],
      estimatedTotalHits: 41,
    });

    const res = await request(app(repo, unit, card)).get("/");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(41);
    expect(res.body.data).toHaveLength(1);
    // Harga di indeks tersimpan sebagai teks; modelnya menjadikannya angka.
    expect(res.body.data[0]).toMatchObject({
      id: 5,
      reference: "PRD-001",
      sales_price: 1500,
      purchase_price: 1000,
      product_brand: { id: 2, name: "Wavin" },
    });
  });

  it("selector menambahkan saringan is_active pada pencariannya", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

    await request(app(repo, unit, card)).get("/selector?page=2&pageSize=5");

    expect(cariMeili).toHaveBeenCalledWith("product", "", {
      limit: 5,
      offset: 5,
      filter: ["is_active = true", "is_delete = false"],
    });
  });

  it("membalas 500 bila Meilisearch tidak bisa dihubungi", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    cariMeili.mockRejectedValue(new Error("meili mati"));

    const res = await request(app(repo, unit, card)).get("/");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: satu dokumen indeks yang tidak lengkap menggagalkan SELURUH
   * halaman.
   *
   * ProductModel.fromMeilisearch memanggil ProductBrandViewModel.fromMap
   * tanpa memeriksa apakah bidang product_brand ada. Dokumen lama yang
   * terindeks sebelum bidang itu ditambahkan membuat pemetaannya melempar,
   * dan karena pemetaan dilakukan di dalam try yang sama, balasannya menjadi
   * 500 untuk seluruh daftar.
   *
   * Akibat bagi pengguna: halaman daftar produk kosong dan bertuliskan galat
   * server, bukan menampilkan produk-produk lain yang datanya baik-baik saja.
   */
  it("CACAT: dokumen indeks tanpa product_brand membuat seluruh daftar gagal", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    cariMeili.mockResolvedValue({
      hits: [dokumenMeili(), dokumenMeili({ id: 6, product_brand: undefined })],
      estimatedTotalHits: 2,
    });

    const res = await request(app(repo, unit, card)).get("/");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("GET /autocomplete", () => {
  it("meneruskan kata kunci yang sudah diterjemahkan", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchAutocomplete.mockResolvedValue([produk()]);

    const res = await request(app(repo, unit, card)).get(
      "/autocomplete?keyword=pipa%20pvc"
    );

    expect(res.status).toBe(200);
    expect(repo.fetchAutocomplete).toHaveBeenCalledWith("pipa pvc");
    expect(res.body).toEqual([produk()]);
  });

  it("mencari dengan kata kunci kosong bila parameternya tidak ada", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchAutocomplete.mockResolvedValue([]);

    await request(app(repo, unit, card)).get("/autocomplete");

    expect(repo.fetchAutocomplete).toHaveBeenCalledWith("");
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchAutocomplete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo, unit, card)).get("/autocomplete");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("GET /:id", () => {
  it("menambahkan can_delete berdasarkan ada tidaknya kartu stok", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    card.checkExistingByProductID.mockResolvedValue(false);

    const res = await request(app(repo, unit, card)).get("/5");

    expect(res.status).toBe(200);
    expect(card.checkExistingByProductID).toHaveBeenCalledWith(5);
    expect(res.body.can_delete).toBe(true);
  });

  it("menandai produk yang sudah punya mutasi stok sebagai tidak bisa dihapus", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    card.checkExistingByProductID.mockResolvedValue(true);

    const res = await request(app(repo, unit, card)).get("/5");

    expect(res.body.can_delete).toBe(false);
  });

  it("membalas 404 bila produknya tidak ada", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo, unit, card)).get("/5");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Product not found"]);
    expect(card.checkExistingByProductID).not.toHaveBeenCalled();
  });

  it("membalas 500 bila kueri gagal", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo, unit, card)).get("/5");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: produk yang sudah dihapus tetap dikirim dengan status 200.
   *
   * fetchByID hanya memeriksa `!result`; bendera is_delete tidak dilihat sama
   * sekali, padahal update, toggleActive, dan delete semuanya memeriksanya.
   *
   * Akibat bagi pengguna: menyimpan tautan ke halaman detail produk yang
   * kemudian dihapus tetap menampilkan produk itu seolah masih aktif. Form
   * ubahnya pun terbuka seperti biasa, lalu penyimpanannya baru ditolak 400 —
   * pengguna mengisi seluruh form untuk sesuatu yang sejak awal tidak ada.
   */
  it("CACAT: fetchByID membalas 200 untuk produk yang sudah dihapus", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk({ is_delete: true }));
    card.checkExistingByProductID.mockResolvedValue(false);

    const res = await request(app(repo, unit, card)).get("/5");

    expect(res.status).toBe(200);
    expect(res.body.is_delete).toBe(true);
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus dan menjadwalkan pengindeksan ulang bila boleh", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    card.checkExistingByProductID.mockResolvedValue(false);
    repo.delete.mockResolvedValue(produk({ is_delete: true }));

    const res = await request(app(repo, unit, card)).delete("/5");

    // Perhatikan: penghapusan membalas 201, bukan 200.
    expect(res.status).toBe(201);
    expect(repo.delete).toHaveBeenCalledWith(5, 99);
    expect(tambahAntrian).toHaveBeenCalledWith("product-updated", { id: 5 });
  });

  it("membalas 404 bila produknya tidak ada", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo, unit, card)).delete("/5");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Product not found"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 400 bila produknya sudah dihapus", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk({ is_delete: true }));

    const res = await request(app(repo, unit, card)).delete("/5");

    expect(res.status).toBe(400);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 400 bila produknya sudah punya mutasi stok", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    card.checkExistingByProductID.mockResolvedValue(true);

    const res = await request(app(repo, unit, card)).delete("/5");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Product cannot be deleted"]);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  it("membalas 404 bila repository tidak mengembalikan hasil penghapusan", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    card.checkExistingByProductID.mockResolvedValue(false);
    repo.delete.mockResolvedValue(null);

    const res = await request(app(repo, unit, card)).delete("/5");

    expect(res.status).toBe(404);
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  it("membalas 500 bila penghapusan gagal", async () => {
    const repo = repositoryTiruan();
    const unit = unitRepositoryTiruan();
    const card = stockCardRepositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    card.checkExistingByProductID.mockResolvedValue(false);
    repo.delete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo, unit, card)).delete("/5");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(tambahAntrian).not.toHaveBeenCalled();
  });
});
