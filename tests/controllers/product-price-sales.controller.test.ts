import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ProductSalesPriceController.
 *
 * Bentuknya mengikuti tests/controllers/company.controller.test.ts: repository
 * ditiru dan disuntikkan lewat konstruktor, lalu yang diperiksa adalah
 * keputusan controller-nya.
 *
 * Dua modul luar ditiru:
 *
 *   utils/queue.helper  — aslinya membuat Queue BullMQ yang membuka koneksi
 *                         Redis begitu modulnya dimuat.
 *   utils/socket.helper — memanggil getIO() yang MELEMPAR bila initIO belum
 *                         dipanggil. Controller ini tidak mengirim peristiwa
 *                         socket sama sekali: perubahan harga jual TIDAK
 *                         dikabarkan ke klien lain, sehingga kasir yang sedang
 *                         membuka layar penjualan tetap memakai harga lama
 *                         sampai ia memuat ulang halamannya sendiri.
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
  queue: {
    add: (...args: unknown[]) => tambahAntrian(...args),
  },
}));

import { ProductSalesPriceController } from "../../src/controllers/product-price-sales.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
function repositoryTiruan() {
  return {
    fetchSales: jest.fn(),
    fetchSalesPriceByID: jest.fn(),
    fetchByID: jest.fn(),
    updateSalesPrice: jest.fn(),
    updatePurchasePrice: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo) {
  const c = new ProductSalesPriceController(repo as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
    next();
  });
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  a.put("/", c.update);
  return a;
}

function produk(ubah: Record<string, unknown> = {}) {
  return {
    id: 5,
    reference: "PRD-001",
    description: "Pipa PVC 3 inci",
    is_delete: false,
    ...ubah,
  };
}

beforeEach(() => {
  kirimSocket.mockReset();
  tambahAntrian.mockReset();
  process.env.LIMIT = "10";
});

describe("GET / — daftar produk untuk pengisian harga jual", () => {
  it("menerjemahkan halaman dan kata kunci, lalu memakai LIMIT sebagai ukuran halaman", async () => {
    const repo = repositoryTiruan();
    repo.fetchSales.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(repo)).get("/?page=3&keyword=pipa");

    expect(res.status).toBe(200);
    expect(repo.fetchSales).toHaveBeenCalledWith({
      keyword: "pipa",
      page: 3,
      pageSize: 10,
    });
  });

  it("memakai halaman 1 dan kata kunci kosong bila parameternya tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.fetchSales.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=0");

    expect(repo.fetchSales).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, keyword: "" })
    );
  });

  it("kata kunci berisi persen tetap dicari, tidak menggagalkan permintaan", async () => {
    const repo = repositoryTiruan();
    repo.fetchSales.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(repo)).get("/?keyword=%25");

    expect(res.status).toBe(200);
    expect(repo.fetchSales).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "%" })
    );
  });

  it("meneruskan hasil repository apa adanya", async () => {
    const repo = repositoryTiruan();
    repo.fetchSales.mockResolvedValue({ data: [produk()], count: 1 });

    const res = await request(app(repo)).get("/");

    expect(res.body).toEqual({ data: [produk()], count: 1 });
  });

  /**
   * CACAT: balasan galat berbadan kosong.
   *
   * Blok catch-nya menulis `res.status(500).send(error)`. Express
   * menyerialkan objek Error sebagai JSON, dan `message` maupun `stack`
   * bukan properti terhitung, jadi yang sampai ke pengguna adalah `{}`.
   *
   * Akibat bagi pengguna: layar hanya menampilkan kegagalan tanpa kalimat apa
   * pun, dan frontend tidak menerima key i18n yang bisa diterjemahkan —
   * berbeda dengan controller lain yang mengirim ErrorList.
   */
  it("CACAT: 500 dikirim sebagai objek kosong, bukan key galat", async () => {
    const repo = repositoryTiruan();
    repo.fetchSales.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/");

    expect(res.status).toBe(500);
    expect(res.text).toBe("{}");
    expect(res.text).not.toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: process.env.LIMIT yang tidak diset menjadi NaN, bukan nilai
   * bawaan.
   *
   * `Number(process.env.LIMIT!)` — tanda serunya hanya menenangkan pemeriksa
   * tipe. Saat berjalan, variabel yang kosong menghasilkan NaN yang
   * diteruskan sebagai pageSize ke kueri LIMIT/OFFSET.
   *
   * Akibat bagi pengguna: pada lingkungan yang lupa menyetel LIMIT, layar
   * pengisian harga jual tidak menampilkan satu produk pun — halaman kosong
   * tanpa pesan galat, sehingga terlihat seperti belum ada produk sama sekali.
   */
  it("CACAT: pageSize menjadi NaN bila LIMIT tidak diset", async () => {
    const repo = repositoryTiruan();
    repo.fetchSales.mockResolvedValue({ data: [], count: 0 });
    delete process.env.LIMIT;

    await request(app(repo)).get("/");

    expect(repo.fetchSales).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: NaN })
    );
  });
});

describe("GET /:id — harga jual satu produk", () => {
  it("membalas 200 dan meneruskan id sebagai angka", async () => {
    const repo = repositoryTiruan();
    repo.fetchSalesPriceByID.mockResolvedValue(produk({ sales_price: 1500 }));

    const res = await request(app(repo)).get("/5");

    expect(res.status).toBe(200);
    expect(repo.fetchSalesPriceByID).toHaveBeenCalledWith(5);
    expect(res.body.sales_price).toBe(1500);
  });

  it("membalas 500 berbadan kosong bila kueri gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchSalesPriceByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/5");

    expect(res.status).toBe(500);
    expect(res.text).toBe("{}");
  });

  /**
   * CACAT: produk yang tidak ada dibalas 200 dengan badan kosong.
   *
   * Hasil repository dikirim apa adanya tanpa pemeriksaan `!product`, padahal
   * handler update di berkas yang sama membalas 404 untuk keadaan yang persis
   * sama.
   *
   * Akibat bagi pengguna: form harga jual untuk id yang salah — atau untuk
   * produk yang baru saja dihapus rekan kerjanya — terbuka dalam keadaan
   * kosong, bukan menampilkan "produk tidak ditemukan". Operator mengisi
   * seluruh kolom harga, menekan simpan, dan baru saat itulah ditolak 404.
   */
  it("CACAT: id yang tidak ada dibalas 200 tanpa isi, bukan 404", async () => {
    const repo = repositoryTiruan();
    repo.fetchSalesPriceByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/999999");

    expect(res.status).toBe(200);
    expect(res.text).toBe("");
  });
});

describe("PUT / — mengubah harga jual satu produk", () => {
  const data = [
    { product_unit_id: null, price: 1500, discount: 100 },
    { product_unit_id: 9, price: 14000, discount: 0 },
  ];

  it("membalas 201 dan meneruskan setiap baris dengan product_id yang sama", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updateSalesPrice.mockResolvedValue({ count: 2 });

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(201);
    expect(repo.updateSalesPrice).toHaveBeenCalledWith([
      { product_id: 5, product_unit_id: null, price: 1500, discount: 100 },
      { product_id: 5, product_unit_id: 9, price: 14000, discount: 0 },
    ]);
    // Harga beli tidak ikut tersentuh.
    expect(repo.updatePurchasePrice).not.toHaveBeenCalled();
  });

  it("mengabaikan product_id yang ditulis di dalam baris data", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updateSalesPrice.mockResolvedValue({ count: 1 });

    await request(app(repo))
      .put("/")
      .send({
        product_id: 5,
        // product_id di baris sengaja berbeda; controller harus memakai yang
        // di tingkat atas supaya harga tidak nyasar ke produk lain.
        data: [
          { product_id: 77, product_unit_id: null, price: 1, discount: 0 },
        ],
      });

    expect(repo.updateSalesPrice).toHaveBeenCalledWith([
      { product_id: 5, product_unit_id: null, price: 1, discount: 0 },
    ]);
  });

  it("menjadwalkan pengindeksan ulang produk setelah harga berubah", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updateSalesPrice.mockResolvedValue({ count: 2 });

    await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(tambahAntrian).toHaveBeenCalledWith("product-updated", { id: 5 });
    // Tidak ada peristiwa socket: klien lain tidak diberi tahu apa pun.
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  it("membalas 404 bila produknya tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(404);
    // Perhatikan: pesannya "Not found" yang umum, bukan "Product not found"
    // seperti yang dipakai ProductController.
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.updateSalesPrice).not.toHaveBeenCalled();
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  it("membalas 404 bila produknya sudah dihapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk({ is_delete: true }));

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(404);
    expect(repo.updateSalesPrice).not.toHaveBeenCalled();
  });

  it("membalas 500 berbadan kosong bila penyimpanan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updateSalesPrice.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(500);
    expect(res.text).toBe("{}");
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  /**
   * CACAT: badan tanpa `data` dilaporkan sebagai galat server.
   *
   * `data` langsung dipetakan tanpa pemeriksaan. Bila bidang itu tidak
   * dikirim, yang terjadi adalah TypeError yang tertangkap try dan menjadi
   * 500 berbadan kosong — pengguna tidak diberi tahu bidang mana yang kurang,
   * dan pesannya tidak bisa dibedakan dari basis data yang sedang mati.
   */
  it("CACAT: 500 saat data tidak dikirim, bukan 400", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());

    const res = await request(app(repo)).put("/").send({ product_id: 5 });

    expect(res.status).toBe(500);
    expect(res.text).toBe("{}");
    expect(repo.updateSalesPrice).not.toHaveBeenCalled();
  });

  /**
   * CACAT: kegagalan penjadwalan pengindeksan membatalkan laporan
   * keberhasilan.
   *
   * Harganya sudah tersimpan sebelum `queue.add` dipanggil. Bila Redis sedang
   * tidak bisa dihubungi, balasannya menjadi 500 berbadan kosong.
   *
   * Akibat bagi pengguna: harga jual SUDAH berubah di basis data, tetapi layar
   * bertuliskan gagal. Operator mengisi ulang seluruh baris harga dan menekan
   * simpan lagi, tanpa tahu perubahan pertamanya sebenarnya berhasil.
   */
  it("CACAT: 500 saat antrian gagal, padahal harganya terlanjur tersimpan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updateSalesPrice.mockResolvedValue({ count: 2 });
    tambahAntrian.mockRejectedValue(new Error("redis mati"));

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(500);
    expect(repo.updateSalesPrice).toHaveBeenCalled();
  });

  /**
   * CACAT: harga boleh disimpan untuk satuan milik produk lain.
   *
   * Yang diperiksa hanya keberadaan produknya; `product_unit_id` pada tiap
   * baris diteruskan apa adanya tanpa dicocokkan dengan produk itu.
   *
   * Akibat bagi pengguna: satu id satuan yang salah — misalnya karena form
   * lama masih memegang daftar satuan produk sebelumnya — menuliskan harga ke
   * pasangan produk/satuan yang tidak pernah ada, atau menimpa harga satuan
   * milik produk lain. Balasannya tetap 201 "berhasil".
   */
  it("CACAT: product_unit_id tidak dicocokkan dengan produknya", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updateSalesPrice.mockResolvedValue({ count: 1 });

    const res = await request(app(repo))
      .put("/")
      .send({
        product_id: 5,
        data: [{ product_unit_id: 999999, price: 1, discount: 0 }],
      });

    expect(res.status).toBe(201);
    expect(repo.updateSalesPrice).toHaveBeenCalledWith([
      { product_id: 5, product_unit_id: 999999, price: 1, discount: 0 },
    ]);
  });
});
