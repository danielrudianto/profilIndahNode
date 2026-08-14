import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku PromotionController.
 *
 * Mengikuti acuan company.controller.test.ts: kedua repository disuntikkan
 * lewat konstruktor sebagai objek berisi jest.fn(), lalu handler dipanggil
 * lewat express kecil dengan supertest.
 *
 * SocketHelper ikut ditiru mengikuti pola berkas acuan — aslinya memanggil
 * getIO() yang MELEMPAR bila initIO belum dijalankan.
 *
 * Yang diperiksa: bagaimana tanggal dari badan permintaan diterjemahkan,
 * bagaimana aturan promosi dipilah sebelum diserahkan ke pencarian produk, dan
 * apa yang terjadi ketika repository gagal.
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

import PromotionController from "../../src/controllers/promotion.controller";

function promosiTiruan() {
  return {
    create: jest.fn(),
    update: jest.fn(),
    fetch: jest.fn(),
    fetchByID: jest.fn(),
    fetchResult: jest.fn(),
    fetchSalesResult: jest.fn(),
    fetchPurchaseReport: jest.fn(),
    countActive: jest.fn(),
  };
}

function produkTiruan() {
  return {
    fetchPromotion: jest.fn(),
    fetchByIDs: jest.fn(),
  };
}

type RepoPromosi = ReturnType<typeof promosiTiruan>;
type RepoProduk = ReturnType<typeof produkTiruan>;

function app(promosi: RepoPromosi, produk: RepoProduk = produkTiruan()) {
  const c = new PromotionController(promosi as never, produk as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
    next();
  });
  a.post("/", c.create);
  a.put("/", c.update);
  a.get("/result/sales/:id", c.downloadSalesResultByID);
  a.get("/result/purchase/:id", c.downloadPurchaseResultByID);
  a.get("/result/:id", c.fetchResult);
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  return a;
}

const promosi = {
  id: 8,
  name: "Diskon Merek A",
  description: "Promo triwulan",
  startDate: new Date(2026, 2, 1),
  endDate: new Date(2026, 2, 31),
  target: 50_000_000,
  supplier_id: 3,
  promotion_brand: [{ product_brand_id: 1 }, { product_brand_id: 2 }],
  promotion_rules: [
    { rule: "Starts with", value: "AB" },
    { rule: "Ends with", value: "ZZ" },
    { rule: "Contains", value: "MID" },
    { rule: "Does not start with", value: "XX" },
    { rule: "Does not end with", value: "YY" },
    { rule: "Does not contain", value: "QQ" },
    { rule: "Aturan tak dikenal", value: "??" },
  ],
};

const badanPromosi = {
  name: "Diskon Merek A",
  description: "Promo triwulan",
  start_date: "01-03-2026",
  end_date: "31-03-2026",
  target: 50_000_000,
  supplier_id: 3,
  promotion_brand: [{ product_brand_id: 1 }],
  promotion_rules: [{ rule: "Starts with", value: "AB" }],
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.LIMIT = "10";
});

describe("POST / — membuat promosi", () => {
  it("membalas 201 dan mengirim hasil repository", async () => {
    const repo = promosiTiruan();
    repo.create.mockResolvedValue(promosi);

    const res = await request(app(repo)).post("/").send(badanPromosi);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(8);
  });

  it("menerjemahkan tanggal berformat DD-MM-YYYY dan menyertakan pembuatnya", async () => {
    const repo = promosiTiruan();
    repo.create.mockResolvedValue(promosi);

    await request(app(repo)).post("/").send(badanPromosi);

    const dikirim = repo.create.mock.calls[0][0] as {
      startDate: Date;
      endDate: Date;
      created_by: number;
      supplier_id: number;
      target: number;
    };
    expect(dikirim.startDate.getFullYear()).toBe(2026);
    expect(dikirim.startDate.getMonth()).toBe(2);
    expect(dikirim.startDate.getDate()).toBe(1);
    expect(dikirim.endDate.getDate()).toBe(31);
    // userId dari middleware, bukan dari kiriman klien.
    expect(dikirim.created_by).toBe(99);
    expect(dikirim.supplier_id).toBe(3);
    expect(dikirim.target).toBe(50_000_000);
  });

  it("tanggal akhir null tetap null — promosi tanpa batas waktu", async () => {
    const repo = promosiTiruan();
    repo.create.mockResolvedValue(promosi);

    await request(app(repo))
      .post("/")
      .send({ ...badanPromosi, end_date: null });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ endDate: null })
    );
  });

  it("selalu menandai promosi baru sebagai belum terhapus", async () => {
    const repo = promosiTiruan();
    repo.create.mockResolvedValue(promosi);

    await request(app(repo)).post("/").send(badanPromosi);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        is_delete: false,
        deleted_by: null,
        deleted_at: null,
      })
    );
  });

  it("meneruskan aturan dan merek apa adanya", async () => {
    const repo = promosiTiruan();
    repo.create.mockResolvedValue(promosi);

    await request(app(repo)).post("/").send(badanPromosi);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promotion_rules: [{ rule: "Starts with", value: "AB" }],
        promotion_brand: [{ product_brand_id: 1 }],
      })
    );
  });

  /**
   * CACAT: tanggal berformat ISO ditafsirkan menjadi tanggal yang sama sekali
   * lain, tanpa satu pun galat.
   *
   * Penerjemahnya `moment(req.body.start_date, "DD-MM-YYYY")` dalam mode
   * longgar. Kalau frontend mengirim "2026-03-15" — bentuk yang dihasilkan
   * `<input type="date">` maupun `Date.toJSON()` — moment membaca "2026"
   * sebagai TANGGAL, "03" sebagai bulan, dan "15" sebagai TAHUN. Tanggal 2026
   * meluber sejauh 2025 hari dari Maret, dan hasilnya: 20 Maret 2015.
   *
   * Skema di route tidak menahan ini: `start_date` hanya diperiksa "ada dan
   * tidak kosong", bentuknya tidak diperiksa sama sekali.
   *
   * Akibat bagi pengguna: promosi tersimpan dengan masa berlaku sebelas tahun
   * di masa lalu. Ia tidak pernah terhitung aktif, tidak muncul di dashboard,
   * dan laporan hasilnya selalu kosong — sementara layar mengabarkan bahwa
   * promosinya berhasil dibuat.
   */
  it("CACAT: tanggal ISO 2026-03-15 tersimpan sebagai 20 Maret 2015", async () => {
    const repo = promosiTiruan();
    repo.create.mockResolvedValue(promosi);

    await request(app(repo))
      .post("/")
      .send({ ...badanPromosi, start_date: "2026-03-15" });

    const dikirim = repo.create.mock.calls[0][0] as { startDate: Date };
    expect(dikirim.startDate.getFullYear()).toBe(2015);
    expect(dikirim.startDate.getMonth()).toBe(2);
    expect(dikirim.startDate.getDate()).toBe(20);
  });

  /**
   * CACAT: tanggal akhir berupa teks kosong menjadi Invalid Date.
   *
   * Penjagaannya hanya `req.body.end_date == null`, yang tidak mengenali "".
   * Skema di route pun sengaja meloloskan `end_date: ""` (dijelaskan di
   * promotion.schema.ts). Jadi teks kosong sampai ke moment dan menghasilkan
   * Invalid Date.
   *
   * Akibat bagi pengguna: alih-alih tersimpan sebagai promosi tanpa batas
   * waktu — yang jelas dimaksudkan ketika kolomnya dikosongkan — permintaannya
   * ditolak Prisma dan berakhir 500 tanpa penjelasan bidang mana yang salah.
   */
  it("CACAT: end_date berupa teks kosong menjadi Invalid Date, bukan null", async () => {
    const repo = promosiTiruan();
    repo.create.mockResolvedValue(promosi);

    await request(app(repo))
      .post("/")
      .send({ ...badanPromosi, end_date: "" });

    const dikirim = repo.create.mock.calls[0][0] as { endDate: Date };
    expect(dikirim.endDate).not.toBeNull();
    expect(dikirim.endDate.toString()).toBe("Invalid Date");
  });

  /**
   * CACAT: pesan galat berupa kalimat bahasa Inggris, bukan key i18n.
   *
   * Seluruh aplikasi mengirim nilai dari ErrorList — "error.internalServer" —
   * yang diterjemahkan frontend. Tiga handler di berkas ini justru mengirim
   * teks harfiah "Internal Server Error".
   *
   * Akibat bagi pengguna: yang muncul di layar adalah tulisan
   * "Internal Server Error" apa adanya, di tengah antarmuka berbahasa
   * Indonesia — karena frontend menampilkan isi balasan galat apa adanya
   * ketika tidak mengenalinya sebagai key.
   */
  it("CACAT: kegagalan membalas teks Inggris harfiah, bukan key i18n", async () => {
    const repo = promosiTiruan();
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).post("/").send(badanPromosi);

    expect(res.status).toBe(500);
    expect(res.text).toBe("Internal Server Error");
    expect(res.text).not.toBe(ErrorList["Internal server error"]);
  });
});

describe("GET / dan GET /:id — membaca promosi", () => {
  it("menerjemahkan halaman dan kata kunci sebelum meneruskannya", async () => {
    const repo = promosiTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=2&keyword=diskon");

    expect(repo.fetch).toHaveBeenCalledWith({
      keyword: "diskon",
      page: 2,
      pageSize: 10,
    });
  });

  it("memakai halaman 1 bila parameternya tidak masuk akal", async () => {
    const repo = promosiTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=abc");

    expect(repo.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, keyword: "" })
    );
  });

  it("kata kunci berisi persen tetap dicari, tidak menggagalkan permintaan", async () => {
    const repo = promosiTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(repo)).get("/?keyword=%25");

    expect(res.status).toBe(200);
    expect(repo.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "%" })
    );
  });

  it("fetch membalas 500 dengan teks Inggris harfiah bila repository gagal", async () => {
    const repo = promosiTiruan();
    repo.fetch.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/");

    expect(res.status).toBe(500);
    expect(res.text).toBe("Internal Server Error");
  });

  it("fetchByID membalas 200 dan meneruskan id sebagai angka", async () => {
    const repo = promosiTiruan();
    repo.fetchByID.mockResolvedValue(promosi);

    const res = await request(app(repo)).get("/8");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(8);
    expect(repo.fetchByID).toHaveBeenCalledWith(8);
  });

  it("fetchByID membalas 404 dengan key khusus promosi", async () => {
    const repo = promosiTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/8");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Promotion not found"]);
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const repo = promosiTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/8");

    expect(res.status).toBe(500);
    expect(res.text).toBe("Internal Server Error");
  });
});

describe("PUT / — mengubah promosi", () => {
  it("membalas 201 dan meneruskan id beserta seluruh bidangnya", async () => {
    const repo = promosiTiruan();
    repo.update.mockResolvedValue(promosi);

    const res = await request(app(repo))
      .put("/")
      .send({ ...badanPromosi, id: 8 });

    expect(res.status).toBe(201);
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 8,
        name: "Diskon Merek A",
        created_by: 99,
        supplier_id: 3,
      })
    );
  });

  /**
   * Ketiga bidang penghapusan ikut dikirim bernilai "belum terhapus" pada
   * setiap penyuntingan. Untungnya PromotionRepository.update TIDAK menulis
   * kolom-kolom itu, jadi promosi yang sudah dihapus tidak hidup kembali
   * hanya karena disunting. Dikunci di sini supaya kalau kelak repository
   * ikut menulisnya, cacat itu ketahuan lewat tes ini.
   */
  it("mengirim penanda belum-terhapus yang diabaikan repository", async () => {
    const repo = promosiTiruan();
    repo.update.mockResolvedValue(promosi);

    await request(app(repo))
      .put("/")
      .send({ ...badanPromosi, id: 8 });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_delete: false,
        deleted_by: null,
        deleted_at: null,
      })
    );
  });

  /**
   * CACAT: update membalas galat dengan bentuk yang BERBEDA dari create.
   *
   * create dan fetch mengirim teks "Internal Server Error"; update mengirim
   * objek Error lewat `res.status(500).send(error)`. Karena `message` milik
   * Error bersifat non-enumerable, badan balasannya justru kosong dari
   * penjelasan.
   *
   * Akibat bagi pengguna: dua tombol pada layar yang sama — simpan baru dan
   * simpan perubahan — gagal dengan cara yang tampak berbeda. Yang satu
   * memunculkan tulisan Inggris, yang satu lagi tidak memunculkan apa pun.
   */
  it("CACAT: kegagalan update mengirim objek galat kosong, bukan teks", async () => {
    const repo = promosiTiruan();
    repo.update.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .put("/")
      .send({ ...badanPromosi, id: 8 });

    expect(res.status).toBe(500);
    expect(res.text).not.toBe("Internal Server Error");
    expect(res.body.message).toBeUndefined();
  });
});

describe("GET /result/:id — hasil promosi", () => {
  function siapkan() {
    const repo = promosiTiruan();
    const produk = produkTiruan();
    repo.fetchByID.mockResolvedValue(promosi);
    produk.fetchPromotion.mockResolvedValue([11, 12]);
    produk.fetchByIDs.mockResolvedValue([{ id: 11 }, { id: 12 }]);
    repo.fetchResult.mockResolvedValue({ sales: 1_000, purchase: 2_000 });
    return { repo, produk };
  }

  it("membalas 200 berisi promosi, hasil, dan daftar produknya", async () => {
    const { repo, produk } = siapkan();

    const res = await request(app(repo, produk)).get("/result/8");

    expect(res.status).toBe(200);
    expect(res.body.promotion.id).toBe(8);
    expect(res.body.result).toEqual({ sales: 1_000, purchase: 2_000 });
    expect(res.body.products).toEqual([{ id: 11 }, { id: 12 }]);
  });

  it("memilah aturan promosi menjadi enam daftar terpisah", async () => {
    const { repo, produk } = siapkan();

    await request(app(repo, produk)).get("/result/8");

    expect(produk.fetchPromotion).toHaveBeenCalledWith({
      brands: [1, 2],
      startsWith: ["AB"],
      endsWith: ["ZZ"],
      contains: ["MID"],
      doesNotStartWith: ["XX"],
      doesNotEndWith: ["YY"],
      doesNotContain: ["QQ"],
    });
  });

  it("aturan yang namanya tidak dikenal diabaikan diam-diam", async () => {
    const { repo, produk } = siapkan();

    await request(app(repo, produk)).get("/result/8");

    const dikirim = produk.fetchPromotion.mock.calls[0][0] as Record<
      string,
      unknown[]
    >;
    // "Aturan tak dikenal" tidak masuk ke satu pun daftar — promosi tetap
    // dihitung seolah aturan itu tidak pernah ditulis.
    const semuaNilai = Object.values(dikirim).flat();
    expect(semuaNilai).not.toContain("??");
  });

  it("promosi tanpa merek menghasilkan daftar merek kosong", async () => {
    const { repo, produk } = siapkan();
    repo.fetchByID.mockResolvedValue({ ...promosi, promotion_brand: null });

    await request(app(repo, produk)).get("/result/8");

    expect(produk.fetchPromotion).toHaveBeenCalledWith(
      expect.objectContaining({ brands: [] })
    );
  });

  it("meneruskan id produk, pemasok, dan rentang tanggal ke perhitungan hasil", async () => {
    const { repo, produk } = siapkan();

    await request(app(repo, produk)).get("/result/8");

    expect(repo.fetchResult).toHaveBeenCalledWith(
      [11, 12],
      3,
      promosi.startDate,
      promosi.endDate
    );
    expect(produk.fetchByIDs).toHaveBeenCalledWith([11, 12]);
  });

  /**
   * Perhatikan ketidakseragaman yang dikunci di sini: GET /:id membalas
   * ErrorList["Promotion not found"] ("promotion.notFound"), sedangkan
   * GET /result/:id membalas ErrorList["Not found"] ("error.notFound") untuk
   * keadaan yang persis sama.
   */
  it("membalas 404 dengan key umum bila promosi tidak ada", async () => {
    const repo = promosiTiruan();
    const produk = produkTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo, produk)).get("/result/8");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(res.text).not.toBe(ErrorList["Promotion not found"]);
    expect(produk.fetchPromotion).not.toHaveBeenCalled();
  });

  /**
   * CACAT BERAT: fetchResult tidak punya penanganan galat sama sekali.
   *
   * create, fetch, fetchByID, dan update semuanya membungkus kerjanya dengan
   * try/catch. Ketiga handler hasil promosi — fetchResult,
   * downloadSalesResultByID, dan downloadPurchaseResultByID — tidak.
   *
   * Karena handler-nya `async`, penolakan dari repository menjadi promise yang
   * ditolak dan tidak ada yang menangkapnya: Express 4 tidak menangani
   * penolakan promise, dan Node 15 ke atas menghentikan proses pada unhandled
   * rejection. Satu kueri hasil promosi yang gagal MEMATIKAN SELURUH SERVER.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu.
   */
  it("CACAT: fetchResult menolak tanpa membalas saat repository gagal", async () => {
    const repo = promosiTiruan();
    const produk = produkTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));
    const c = new PromotionController(repo as never, produk as never);

    const req = { params: { id: "8" }, body: {}, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.fetchResult(req, res)).rejects.toThrow("koneksi putus");
    expect((res as any).status).not.toHaveBeenCalled();
  });

  /**
   * CACAT: promosi tanpa aturan MEMATIKAN PROSES, bukan sekadar gagal.
   *
   * `promotion.promotion_rules!` memakai tanda seru — janji kepada TypeScript
   * bahwa nilainya tidak pernah null. Janji itu tidak dijamin apa pun: kolomnya
   * boleh kosong, dan promosi yang seluruh aturannya terhapus mengembalikan
   * null. `.filter()` atas null melempar TypeError, dan karena tidak ada
   * try/catch, lemparannya menjadi unhandled rejection yang menghentikan Node.
   *
   * Akibat bagi pengguna: membuka halaman hasil satu promosi yang aturannya
   * kosong menjatuhkan SELURUH server bagi semua orang — dan bisa diulang
   * kapan saja oleh siapa saja yang tahu id promosi itu.
   */
  it("CACAT: promosi tanpa aturan melempar TypeError tanpa membalas", async () => {
    const repo = promosiTiruan();
    const produk = produkTiruan();
    repo.fetchByID.mockResolvedValue({ ...promosi, promotion_rules: null });
    const c = new PromotionController(repo as never, produk as never);

    const req = { params: { id: "8" }, body: {}, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.fetchResult(req, res)).rejects.toThrow(TypeError);
    expect((res as any).status).not.toHaveBeenCalled();
    expect(produk.fetchPromotion).not.toHaveBeenCalled();
  });
});

describe("GET /result/sales/:id — unduhan hasil penjualan", () => {
  it("membalas 200 dan membungkus hasil di dalam bidang data", async () => {
    const repo = promosiTiruan();
    const produk = produkTiruan();
    repo.fetchByID.mockResolvedValue(promosi);
    produk.fetchPromotion.mockResolvedValue([11]);
    repo.fetchSalesResult.mockResolvedValue([{ nomor: "SI-001" }]);

    const res = await request(app(repo, produk)).get("/result/sales/8");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ nomor: "SI-001" }] });
    // Hasil penjualan TIDAK disaring per pemasok — berbeda dari hasil
    // pembelian di bawah.
    expect(repo.fetchSalesResult).toHaveBeenCalledWith(
      [11],
      promosi.startDate,
      promosi.endDate
    );
  });

  it("membalas 404 bila promosi tidak ada", async () => {
    const repo = promosiTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/result/sales/8");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  /** Cacat yang sama seperti fetchResult: tanpa try/catch sama sekali. */
  it("CACAT: downloadSalesResultByID menolak tanpa membalas saat repository gagal", async () => {
    const repo = promosiTiruan();
    const produk = produkTiruan();
    repo.fetchByID.mockResolvedValue(promosi);
    produk.fetchPromotion.mockResolvedValue([11]);
    repo.fetchSalesResult.mockRejectedValue(new Error("kueri gagal"));
    const c = new PromotionController(repo as never, produk as never);

    const req = { params: { id: "8" }, body: {}, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.downloadSalesResultByID(req, res)).rejects.toThrow(
      "kueri gagal"
    );
    expect((res as any).status).not.toHaveBeenCalled();
  });
});

describe("GET /result/purchase/:id — unduhan hasil pembelian", () => {
  it("membalas 200 dan menyaring hasil per pemasok promosi", async () => {
    const repo = promosiTiruan();
    const produk = produkTiruan();
    repo.fetchByID.mockResolvedValue(promosi);
    produk.fetchPromotion.mockResolvedValue([11]);
    repo.fetchPurchaseReport.mockResolvedValue([{ nomor: "GR-001" }]);

    const res = await request(app(repo, produk)).get("/result/purchase/8");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [{ nomor: "GR-001" }] });
    expect(repo.fetchPurchaseReport).toHaveBeenCalledWith(
      [11],
      3,
      promosi.startDate,
      promosi.endDate
    );
  });

  it("memakai penyaring aturan yang sama seperti halaman hasil", async () => {
    const repo = promosiTiruan();
    const produk = produkTiruan();
    repo.fetchByID.mockResolvedValue(promosi);
    produk.fetchPromotion.mockResolvedValue([]);
    repo.fetchPurchaseReport.mockResolvedValue([]);

    await request(app(repo, produk)).get("/result/purchase/8");

    expect(produk.fetchPromotion).toHaveBeenCalledWith({
      brands: [1, 2],
      startsWith: ["AB"],
      endsWith: ["ZZ"],
      contains: ["MID"],
      doesNotStartWith: ["XX"],
      doesNotEndWith: ["YY"],
      doesNotContain: ["QQ"],
    });
  });

  it("membalas 404 bila promosi tidak ada", async () => {
    const repo = promosiTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/result/purchase/8");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  /** Cacat yang sama seperti dua handler hasil lainnya. */
  it("CACAT: downloadPurchaseResultByID menolak tanpa membalas saat repository gagal", async () => {
    const repo = promosiTiruan();
    const produk = produkTiruan();
    repo.fetchByID.mockResolvedValue(promosi);
    produk.fetchPromotion.mockRejectedValue(new Error("kueri gagal"));
    const c = new PromotionController(repo as never, produk as never);

    const req = { params: { id: "8" }, body: {}, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.downloadPurchaseResultByID(req, res)).rejects.toThrow(
      "kueri gagal"
    );
    expect((res as any).status).not.toHaveBeenCalled();
  });
});
