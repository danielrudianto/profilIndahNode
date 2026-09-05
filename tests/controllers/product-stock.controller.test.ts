import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ProductStockController.
 *
 * Bentuknya mengikuti tests/controllers/company.controller.test.ts: keempat
 * repository ditiru dan disuntikkan lewat konstruktor, lalu yang diperiksa
 * adalah keputusan controller-nya — bukan kuerinya.
 *
 * Dua modul luar ditiru karena menyentuh layanan sungguhan begitu di-import:
 *
 *   utils/meili.helper  — memanggil initializeMeiliSearch() saat modulnya
 *                         dimuat, jadi tanpa tiruan tes akan menghubungi
 *                         Meilisearch di localhost:7700.
 *   utils/socket.helper — memanggil getIO() yang MELEMPAR bila initIO belum
 *                         dipanggil. Controller ini tidak mengirim peristiwa
 *                         socket sama sekali (perhatikan: seluruh handler di
 *                         sini hanya membaca), tetapi tiruannya dipertahankan
 *                         agar bentuk berkas ini sama dengan acuan.
 *
 * CATATAN UMUM TENTANG BALASAN GALAT. Dulu semua blok catch di controller ini
 * menulis `res.status(500).send(error)` — objek Error diserialkan menjadi
 * badan kosong `{}` karena `message` dan `stack` bukan properti terhitung,
 * sehingga frontend tidak punya key untuk diterjemahkan. Kini semuanya
 * membalas key i18n ErrorList["Internal server error"] seperti controller
 * lain, dan tes-tes 500 di bawah menjaganya.
 */

const kirimSocket = jest.fn();
/* Meta perhitungan minimum membaca cap waktu dari Redis. */
jest.mock("../../src/utils/redis.helper", () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue("2026-08-18T16:00:00.000Z"),
    set: jest.fn(),
  },
}));

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

import ProductStockController from "../../src/controllers/product-stock.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
function stockRepositoryTiruan() {
  return {
    fetchProblematicStock: jest.fn(),
    fetchInadequateStock: jest.fn(),
    fetchStock: jest.fn(),
    fetchStockByProductID: jest.fn(),
    fetchInadequateWarehouse: jest.fn(),
    /*
      Penghitung chip kondisi pada halaman stok 15a — jalur GET / memanggilnya
      SEBELUM apa pun, jadi tiruannya wajib ada atau seluruh daftar membalas
      500. Nilai bawaannya nol-nol supaya tiap uji tidak perlu mengaturnya.
    */
    countConditions: jest.fn().mockResolvedValue({ low: 0, negative: 0 }),
  };
}

function packageRepositoryTiruan() {
  return { fetchByID: jest.fn() };
}

function productRepositoryTiruan() {
  return { fetchByID: jest.fn(), fetchByIDs: jest.fn().mockResolvedValue([]) };
}

function depositRepositoryTiruan() {
  return { calculatePendingStock: jest.fn() };
}

type StockRepo = ReturnType<typeof stockRepositoryTiruan>;
type PackageRepo = ReturnType<typeof packageRepositoryTiruan>;
type ProductRepo = ReturnType<typeof productRepositoryTiruan>;
type DepositRepo = ReturnType<typeof depositRepositoryTiruan>;

type Semua = {
  stok: StockRepo;
  paket: PackageRepo;
  produk: ProductRepo;
  deposit: DepositRepo;
};

function repos(): Semua {
  return {
    stok: stockRepositoryTiruan(),
    paket: packageRepositoryTiruan(),
    produk: productRepositoryTiruan(),
    deposit: depositRepositoryTiruan(),
  };
}

function controller(r: Semua) {
  return new ProductStockController(
    r.stok as never,
    r.paket as never,
    r.produk as never,
    r.deposit as never
  );
}

function app(r: Semua) {
  const c = controller(r);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.post("/problematic", c.fetchProblematic);
  a.post("/inadequate", c.fetchInadequate);
  a.post("/warehouse/inadequate", c.fetchInadequateWarehouse);
  a.post("/warehouse", c.fetchWarehouse);
  a.get("/meta/:id", c.fetchProductMetaDataByID);
  a.get("/product/:id", c.fetchByProductID);
  a.get("/package/:id", c.fetchByPackageID);
  a.get("/", c.fetch);
  return a;
}

/** Dokumen Meilisearch lengkap; ProductModel.fromMeilisearch memakainya. */
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

beforeEach(() => {
  kirimSocket.mockReset();
  cariMeili.mockReset();
  process.env.LIMIT = "10";
});

describe("POST /problematic dan POST /inadequate", () => {
  it("membaca halaman dan kata kunci dari BADAN permintaan, bukan dari kueri", async () => {
    const r = repos();
    r.stok.fetchProblematicStock.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(r))
      .post("/problematic")
      .send({
        page: 3,
        keyword: "pipa",
        brands: [1, 2],
        types: [7],
      });

    expect(res.status).toBe(200);
    expect(r.stok.fetchProblematicStock).toHaveBeenCalledWith({
      keyword: "pipa",
      page: 3,
      pageSize: 10,
      brands: [1, 2],
      types: [7],
    });
  });

  it("memakai halaman 1 dan kata kunci kosong bila parameternya tidak masuk akal", async () => {
    const r = repos();
    r.stok.fetchProblematicStock.mockResolvedValue({ data: [], count: 0 });

    await request(app(r))
      .post("/problematic")
      .send({ page: "abc", brands: [], types: [] });

    expect(r.stok.fetchProblematicStock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, keyword: "" })
    );
  });

  it("fetchInadequate memakai repository yang berbeda dengan bentuk masukan sama", async () => {
    const r = repos();
    r.stok.fetchInadequateStock.mockResolvedValue({ data: [], count: 5 });

    const res = await request(app(r))
      .post("/inadequate")
      .send({ page: 2, keyword: "pvc", brands: [], types: [] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ data: [], count: 5 });
    expect(r.stok.fetchInadequateStock).toHaveBeenCalledWith({
      keyword: "pvc",
      page: 2,
      pageSize: 10,
      brands: [],
      types: [],
    });
    expect(r.stok.fetchProblematicStock).not.toHaveBeenCalled();
  });

  it("membalas key i18n bila repository gagal", async () => {
    const r = repos();
    r.stok.fetchProblematicStock.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r))
      .post("/problematic")
      .send({ brands: [], types: [] });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: process.env.LIMIT yang tidak diset menjadi NaN, bukan nilai
   * bawaan.
   *
   * pageSize dihitung dengan `Number(process.env.LIMIT!)`. Tanda seru itu
   * hanya menenangkan pemeriksa tipe; saat berjalan, variabel yang kosong
   * menghasilkan NaN yang diteruskan sebagai pageSize ke kueri LIMIT/OFFSET.
   *
   * Akibat bagi pengguna: pada lingkungan yang lupa menyetel LIMIT, laporan
   * stok bermasalah dan stok kurang tidak menampilkan apa pun — halaman kosong
   * tanpa pesan galat, sehingga terlihat seolah memang tidak ada stok yang
   * bermasalah. Bandingkan dengan daftar produk yang memakai translatePageSize
   * dan punya nilai bawaan 10.
   */
  it("CACAT: pageSize menjadi NaN bila LIMIT tidak diset", async () => {
    const r = repos();
    r.stok.fetchProblematicStock.mockResolvedValue({ data: [], count: 0 });
    delete process.env.LIMIT;

    await request(app(r)).post("/problematic").send({ brands: [], types: [] });

    expect(r.stok.fetchProblematicStock).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: NaN })
    );
  });
});

describe("GET / — daftar stok lewat Meilisearch", () => {
  it("mencari produk aktif lalu menempelkan stoknya", async () => {
    const r = repos();
    cariMeili.mockResolvedValue({
      hits: [dokumenMeili(), dokumenMeili({ id: 6 })],
      estimatedTotalHits: 2,
    });
    r.stok.fetchStock.mockResolvedValue([{ id: 5, stock: 42 }]);

    const res = await request(app(r)).get("/?page=2&pageSize=5");

    expect(res.status).toBe(200);
    expect(cariMeili).toHaveBeenCalledWith("product", "", {
      limit: 5,
      offset: 5,
      filter: ["is_active = true", "is_delete = false"],
    });
    // Stok dicari hanya untuk produk yang muncul di halaman ini.
    expect(r.stok.fetchStock).toHaveBeenCalledWith([5, 6]);
    expect(res.body.count).toBe(2);
    expect(res.body.data[0].product_stock).toEqual({ stock: 42 });
    // Produk tanpa baris stok dianggap bernilai nol, bukan dibuang.
    expect(res.body.data[1].product_stock).toEqual({ stock: 0 });
  });

  it("menerjemahkan kata kunci yang mengandung persen tanpa menggagalkan permintaan", async () => {
    const r = repos();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });
    r.stok.fetchStock.mockResolvedValue([]);

    const res = await request(app(r)).get("/?page=1&pageSize=10&keyword=%25");

    expect(res.status).toBe(200);
    expect(cariMeili).toHaveBeenCalledWith("product", "%", expect.anything());
  });

  it("membalas key i18n bila Meilisearch gagal", async () => {
    const r = repos();
    cariMeili.mockRejectedValue(new Error("meili mati"));

    const res = await request(app(r)).get("/?page=1&pageSize=10");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(r.stok.fetchStock).not.toHaveBeenCalled();
  });

  /**
   * CACAT: halaman dan ukuran halaman dibaca dengan Number() mentah.
   *
   * Handler lain di berkas yang sama memakai translatePage, yang mengembalikan
   * 1 untuk masukan yang tidak masuk akal. fetch tidak: `Number(undefined)`
   * menghasilkan NaN, dan limit maupun offset yang dikirim ke Meilisearch ikut
   * menjadi NaN.
   *
   * Yang menahan hal ini di produksi hanyalah skema pada rutenya, yang
   * mewajibkan page dan pageSize. Controller-nya sendiri tidak punya pertahanan
   * apa pun, jadi memasang handler ini pada rute lain — atau melonggarkan
   * skemanya — langsung menghasilkan halaman kosong tanpa penjelasan.
   */
  it("CACAT: tanpa page dan pageSize, limit dan offset menjadi NaN", async () => {
    const r = repos();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });
    r.stok.fetchStock.mockResolvedValue([]);

    await request(app(r)).get("/");

    expect(cariMeili).toHaveBeenCalledWith("product", "", {
      limit: NaN,
      offset: NaN,
      filter: ["is_active = true", "is_delete = false"],
    });
  });

  /**
   * CACAT: daftar ini mengirim dokumen Meilisearch MENTAH, bukan ProductModel.
   *
   * fetchWarehouse pada berkas yang sama memetakan setiap hit lewat
   * ProductModel.fromMeilisearch; fetch hanya menyebar `...x`. Karena itu
   * harga di sini tetap bertipe teks seperti tersimpan di indeks, sementara
   * endpoint tetangganya mengirim angka.
   *
   * Akibat bagi pengguna: perhitungan di sisi frontend yang menjumlahkan harga
   * dari daftar ini merangkai teks alih-alih menambah angka — "1500" + "1000"
   * menjadi "15001000". Bidang tambahan yang kebetulan ada di indeks juga ikut
   * terkirim ke klien tanpa disaring.
   */
  it("CACAT: harga dikirim sebagai teks karena dokumen indeks tidak dipetakan", async () => {
    const r = repos();
    cariMeili.mockResolvedValue({
      hits: [dokumenMeili({ rahasia_internal: "jangan dikirim" })],
      estimatedTotalHits: 1,
    });
    r.stok.fetchStock.mockResolvedValue([]);

    const res = await request(app(r)).get("/?page=1&pageSize=10");

    expect(res.body.data[0].sales_price).toBe("1500");
    expect(res.body.data[0].rahasia_internal).toBe("jangan dikirim");
  });
});

/*
  Peran dikirim sebagai `callerRole`, bukan `role`.

  Layar ini membaca peran PEMANGGIL untuk memutuskan penyaringan gudang, dan
  nilai itu kini ditulis middleware ke kunci tersendiri. `role` dikembalikan
  menjadi milik badan permintaan supaya formulir pengguna tidak lagi kehilangan
  peran yang dipilihnya — lihat tests/utils/peran-pemanggil.test.ts.
*/
describe("POST /warehouse — daftar stok gudang", () => {
  const badan = { keyword: "pipa", page: 2, pageSize: 5 };

  it("menyaring produk aktif saja untuk peran biasa", async () => {
    const r = repos();
    cariMeili.mockResolvedValue({
      hits: [dokumenMeili()],
      estimatedTotalHits: 1,
    });
    r.stok.fetchStockByProductID.mockResolvedValue([
      { product_id: 5, stock: 42 },
    ]);

    const res = await request(app(r))
      .post("/warehouse")
      .send({ ...badan, callerRole: 2 });

    expect(res.status).toBe(200);
    expect(cariMeili).toHaveBeenCalledWith("product", "pipa", {
      filter: ["is_delete = false", "is_active = true"],
      offset: 5,
      limit: 5,
    });
    expect(res.body.data[0].product_stock).toEqual({ stock: 42 });
    // Peran biasa tidak memotong stok dengan deposit yang belum diambil.
    expect(r.deposit.calculatePendingStock).not.toHaveBeenCalled();
  });

  it("mengubah dokumen indeks menjadi ProductModel dengan harga bertipe angka", async () => {
    const r = repos();
    cariMeili.mockResolvedValue({
      hits: [dokumenMeili()],
      estimatedTotalHits: 1,
    });
    r.stok.fetchStockByProductID.mockResolvedValue([]);

    const res = await request(app(r))
      .post("/warehouse")
      .send({ ...badan, callerRole: 2 });

    expect(res.body.data[0].sales_price).toBe(1500);
    expect(res.body.data[0].product_stock).toEqual({ stock: 0 });
  });

  it("peran 6 menyaring menurut tipe produk yang boleh dijual salesman itu", async () => {
    const r = repos();
    cariMeili.mockResolvedValue({
      hits: [dokumenMeili()],
      estimatedTotalHits: 1,
    });
    r.stok.fetchStockByProductID.mockResolvedValue([
      { product_id: 5, stock: 42 },
    ]);
    r.deposit.calculatePendingStock.mockResolvedValue([]);

    await request(app(r))
      .post("/warehouse")
      .send({
        ...badan,
        callerRole: 6,
        user_sales: [{ product_type_id: 3 }, { product_type_id: 7 }],
      });

    expect(cariMeili).toHaveBeenCalledWith("product", "pipa", {
      filter: [
        "is_delete = false",
        "is_active = true",
        "product_type_id = 3 OR product_type_id = 7",
      ],
      offset: 5,
      limit: 5,
    });
  });

  it("peran 6 memotong stok dengan deposit yang belum diambil pelanggan", async () => {
    const r = repos();
    cariMeili.mockResolvedValue({
      hits: [dokumenMeili()],
      estimatedTotalHits: 1,
    });
    r.stok.fetchStockByProductID.mockResolvedValue([
      { product_id: 5, stock: 42 },
    ]);
    r.deposit.calculatePendingStock.mockResolvedValue([
      { product_id: 5, quantity: 12 },
    ]);

    const res = await request(app(r))
      .post("/warehouse")
      .send({ ...badan, callerRole: 6, user_sales: [{ product_type_id: 3 }] });

    // Salesman hanya boleh menjanjikan barang yang belum dijanjikan ke orang
    // lain: 42 - 12.
    expect(res.body.data[0].product_stock).toEqual({ stock: 30 });
  });

  it("membalas key i18n bila pencarian gagal", async () => {
    const r = repos();
    cariMeili.mockRejectedValue(new Error("meili mati"));

    const res = await request(app(r))
      .post("/warehouse")
      .send({ ...badan, callerRole: 2 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /*
    Gudang/salesman tanpa satu pun tipe produk dijawab daftar kosong.
    Dulu typeFilter kosong ("") tetap dikirim ke Meilisearch dan meledak
    jadi 500 berbadan kosong.
  */
  it("user_sales kosong dijawab daftar kosong tanpa menyentuh Meilisearch", async () => {
    const r = repos();

    const res = await request(app(r))
      .post("/warehouse")
      .send({ ...badan, callerRole: 6, user_sales: [] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], count: 0 });
    expect(cariMeili).not.toHaveBeenCalled();
  });

  it("pencarian tanpa hasil dijawab kosong, bukan 500 dari Prisma.join", async () => {
    const r = repos();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

    const res = await request(app(r))
      .post("/warehouse")
      .send({ ...badan, callerRole: 6, user_sales: [{ product_type_id: 3 }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], count: 0 });
    expect(r.stok.fetchStockByProductID).not.toHaveBeenCalled();
  });

  /**
   * CACAT: nilai dari req.body dirangkai langsung ke dalam ekspresi saringan
   * Meilisearch.
   *
   * `product_type_id = ${x.product_type_id}` tidak memeriksa bahwa nilainya
   * berupa angka. Untuk sekarang user_sales memang ditulis authMiddlewareRole
   * dari token — itulah satu-satunya yang menahan penyalahgunaan, dan itu
   * bukan sesuatu yang tampak dari controller-nya.
   *
   * Akibatnya: begitu ada satu pemanggil yang bisa mengisi bidang itu, ia bisa
   * menyisipkan ekspresi saringan miliknya sendiri dan membaca produk di luar
   * jatahnya — termasuk produk yang sudah dihapus atau dinonaktifkan.
   */
  it("CACAT: nilai product_type_id disisipkan mentah ke saringan Meilisearch", async () => {
    const r = repos();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });
    r.stok.fetchStockByProductID.mockResolvedValue([]);
    r.deposit.calculatePendingStock.mockResolvedValue([]);

    await request(app(r))
      .post("/warehouse")
      .send({
        ...badan,
        callerRole: 6,
        user_sales: [{ product_type_id: "3 OR is_delete = true" }],
      });

    expect(cariMeili).toHaveBeenCalledWith(
      "product",
      "pipa",
      expect.objectContaining({
        filter: [
          "is_delete = false",
          "is_active = true",
          "product_type_id = 3 OR is_delete = true",
        ],
      })
    );
  });
});

describe("POST /warehouse/inadequate — produk yang stoknya di bawah minimum", () => {
  it("mengambil daftar id lalu melengkapinya dengan data produk", async () => {
    const r = repos();
    r.stok.fetchInadequateWarehouse.mockResolvedValue({
      data: [{ id: 5, product_stock: { stock: 2 } }],
      count: 1,
    });
    r.produk.fetchByIDs.mockResolvedValue([
      { id: 5, reference: "PRD-001", description: "Pipa PVC 3 inci" },
    ]);

    const res = await request(app(r))
      .post("/warehouse/inadequate")
      .send({ keyword: "pipa", page: 2, pageSize: 5 });

    expect(res.status).toBe(200);
    expect(r.stok.fetchInadequateWarehouse).toHaveBeenCalledWith({
      page: 2,
      keyword: "pipa",
      pageSize: 5,
    });
    expect(r.produk.fetchByIDs).toHaveBeenCalledWith([5]);
    expect(res.body).toEqual({
      data: [
        {
          id: 5,
          reference: "PRD-001",
          description: "Pipa PVC 3 inci",
          product_stock: { stock: 2 },
        },
      ],
      count: 1,
    });
  });

  it("membalas key i18n bila repository gagal", async () => {
    const r = repos();
    r.stok.fetchInadequateWarehouse.mockRejectedValue(new Error("gagal"));

    const res = await request(app(r))
      .post("/warehouse/inadequate")
      .send({ keyword: "", page: 1, pageSize: 10 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: baris yang produknya tidak ditemukan menjadi lubang `null` di
   * dalam daftar.
   *
   * Pemetaannya berbentuk `if (productIndex != -1) { return ... }` tanpa
   * cabang else, jadi baris yang tidak berpasangan menghasilkan `undefined`
   * yang oleh JSON.stringify diubah menjadi `null`. Barisnya tidak dibuang,
   * hanya dikosongkan.
   *
   * Akibat bagi pengguna: daftar "stok kurang" menampilkan baris kosong, dan
   * frontend yang membaca `item.reference` pada baris itu langsung gagal —
   * satu produk yatim (misalnya baris product_stock yang produknya sudah
   * dihapus) merusak tampilan seluruh halaman.
   */
  it("CACAT: produk yang tidak ditemukan menyisakan null di dalam daftar", async () => {
    const r = repos();
    r.stok.fetchInadequateWarehouse.mockResolvedValue({
      data: [
        { id: 5, product_stock: { stock: 2 } },
        { id: 6, product_stock: { stock: 1 } },
      ],
      count: 2,
    });
    // Produk 6 sudah tidak ada lagi di tabel product.
    r.produk.fetchByIDs.mockResolvedValue([{ id: 5, reference: "PRD-001" }]);

    const res = await request(app(r))
      .post("/warehouse/inadequate")
      .send({ keyword: "", page: 1, pageSize: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[1]).toBeNull();
    // Cacahnya tetap 2, jadi penomoran halaman ikut menghitung baris kosong.
    expect(res.body.count).toBe(2);
  });
});

describe("GET /meta/:id — data ringkas produk", () => {
  it("membalas 200 dengan produk yang diminta", async () => {
    const r = repos();
    r.produk.fetchByID.mockResolvedValue({ id: 5, reference: "PRD-001" });

    const res = await request(app(r)).get("/meta/5");

    expect(res.status).toBe(200);
    expect(r.produk.fetchByID).toHaveBeenCalledWith(5);
    expect(res.body).toEqual({ id: 5, reference: "PRD-001" });
  });

  it("membalas key i18n bila kueri gagal", async () => {
    const r = repos();
    r.produk.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(r)).get("/meta/5");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: produk yang tidak ada dibalas 200 dengan badan kosong.
   *
   * Hasil repository dikirim apa adanya tanpa pemeriksaan `!result`, berbeda
   * dengan fetchByPackageID di berkas yang sama yang membalas 404.
   *
   * Akibat bagi pengguna: layar kartu stok untuk id yang salah tidak
   * menampilkan "produk tidak ditemukan", melainkan halaman kosong yang
   * terlihat seperti sedang memuat selamanya — dan frontend yang membaca
   * `data.reference` pada balasan kosong itu gagal tanpa pesan.
   */
  it("CACAT: id yang tidak ada dibalas 200 tanpa isi, bukan 404", async () => {
    const r = repos();
    r.produk.fetchByID.mockResolvedValue(null);

    const res = await request(app(r)).get("/meta/999999");

    expect(res.status).toBe(200);
    expect(res.text).toBe("");
  });
});

describe("GET /product/:id — stok satu produk", () => {
  it("membalas stok produk yang ditemukan", async () => {
    const r = repos();
    r.stok.fetchStockByProductID.mockResolvedValue([
      { product_id: 5, stock: 42 },
    ]);

    const res = await request(app(r)).get("/product/5");

    expect(res.status).toBe(200);
    expect(r.stok.fetchStockByProductID).toHaveBeenCalledWith([5]);
    expect(res.body).toEqual({ stock: { product_id: 5, stock: 42 } });
  });

  it("membalas key i18n bila kueri gagal", async () => {
    const r = repos();
    r.stok.fetchStockByProductID.mockRejectedValue(new Error("gagal"));

    const res = await request(app(r)).get("/product/5");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: bentuk balasan berubah-ubah tergantung ada tidaknya baris stok.
   *
   * Barisnya berbunyi `stock: stock.length == 0 ? 0 : stock[0]`. Bila produk
   * itu punya baris stok, `stock` berisi OBJEK `{ product_id, stock }`; bila
   * tidak, `stock` berisi ANGKA 0.
   *
   * Akibat bagi pengguna: frontend harus membaca `data.stock.stock` untuk
   * sebagian produk dan `data.stock` untuk sebagian lainnya. Produk baru yang
   * belum pernah menerima barang — justru yang paling sering dibuka untuk
   * memeriksa stok — masuk ke cabang yang berbeda, jadi angka stoknya tampil
   * sebagai kosong atau NaN.
   */
  it("CACAT: produk tanpa baris stok membalas angka, bukan objek", async () => {
    const r = repos();
    r.stok.fetchStockByProductID.mockResolvedValue([]);

    const res = await request(app(r)).get("/product/5");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ stock: 0 });
  });
});

describe("GET /package/:id — stok tiap isi paket", () => {
  it("membalas stok untuk setiap produk di dalam paket", async () => {
    const r = repos();
    r.paket.fetchByID.mockResolvedValue({
      id: 3,
      package_content: [{ product_id: 5 }, { product_id: 6 }],
    });
    r.stok.fetchStockByProductID.mockResolvedValue([
      { product_id: 5, stock: 42 },
    ]);

    const res = await request(app(r)).get("/package/3");

    expect(res.status).toBe(200);
    expect(r.paket.fetchByID).toHaveBeenCalledWith(3);
    expect(r.stok.fetchStockByProductID).toHaveBeenCalledWith([5, 6]);
    // Produk tanpa baris stok dilaporkan nol, bukan dibuang dari daftar.
    expect(res.body).toEqual([
      { product_id: 5, stock: 42 },
      { product_id: 6, stock: 0 },
    ]);
  });

  it("membalas 404 bila paketnya tidak ada", async () => {
    const r = repos();
    r.paket.fetchByID.mockResolvedValue(null);

    const res = await request(app(r)).get("/package/3");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Product package not found"]);
    expect(r.stok.fetchStockByProductID).not.toHaveBeenCalled();
  });

  it("membalas key i18n bila kueri stok gagal", async () => {
    const r = repos();
    r.paket.fetchByID.mockResolvedValue({
      id: 3,
      package_content: [{ product_id: 5 }],
    });
    r.stok.fetchStockByProductID.mockRejectedValue(new Error("gagal"));

    const res = await request(app(r)).get("/package/3");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: paket yang sudah dihapus tetap dilayani.
   *
   * Hanya keberadaan barisnya yang diperiksa; bendera is_delete tidak dilihat,
   * padahal ProductPackageController.delete memakainya sebagai penjaga.
   *
   * Akibat bagi pengguna: layar yang memeriksa ketersediaan paket sebelum
   * menjual masih menampilkan angka stok untuk paket yang sudah ditarik dari
   * peredaran, seolah paket itu masih bisa dijual.
   */
  it("CACAT: paket yang sudah dihapus tetap dibalas 200", async () => {
    const r = repos();
    r.paket.fetchByID.mockResolvedValue({
      id: 3,
      is_delete: true,
      package_content: [{ product_id: 5 }],
    });
    r.stok.fetchStockByProductID.mockResolvedValue([
      { product_id: 5, stock: 42 },
    ]);

    const res = await request(app(r)).get("/package/3");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ product_id: 5, stock: 42 }]);
  });

  /**
   * CACAT: paket tanpa isi dilaporkan sebagai galat server.
   *
   * `productPackage.package_content!` memakai tanda seru; saat berjalan,
   * paket yang isinya belum dimuat atau memang kosong membuat `.map`
   * dipanggil pada undefined. Galatnya tertangkap try dan menjadi 500
   * berbadan kosong — tidak bisa dibedakan dari basis data yang sedang mati.
   */
  it("paket tanpa package_content membalas 500 ber-key i18n", async () => {
    const r = repos();
    r.paket.fetchByID.mockResolvedValue({ id: 3 });

    const res = await request(app(r)).get("/package/3");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(r.stok.fetchStockByProductID).not.toHaveBeenCalled();
  });
});
