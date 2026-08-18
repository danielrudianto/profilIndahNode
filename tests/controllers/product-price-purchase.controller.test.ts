import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ProductPurchasePriceController.
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
 *                         socket sama sekali — perubahan harga beli TIDAK
 *                         dikabarkan ke klien lain, berbeda dengan penghapusan
 *                         paket produk; tiruannya dipertahankan agar bentuk
 *                         berkas ini sama dengan acuan.
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

import { ProductPurchasePriceController } from "../../src/controllers/product-price-purchase.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
function repositoryTiruan() {
  return {
    fetchSales: jest.fn(),
    fetchByID: jest.fn(),
    updateSalesPrice: jest.fn(),
    updatePurchasePrice: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo) {
  const c = new ProductPurchasePriceController(repo as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.get("/", c.fetch);
  a.put("/", c.updateByProductID);
  // update tidak dipasang di rute mana pun (lihat catatan pada tesnya), tetapi
  // ia tetap method publik controller ini sehingga ikut diuji di sini.
  a.put("/legacy", c.update);
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

describe("GET / — daftar produk untuk pengisian harga beli", () => {
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

    await request(app(repo)).get("/?page=abc");

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
   * Blok catch-nya menulis `res.status(500).send(error)` — objek Error dikirim
   * apa adanya, bukan key i18n dari ErrorList seperti pada handler update di
   * berkas yang sama. Express menyerialkannya sebagai JSON, dan `message`
   * maupun `stack` pada Error bukan properti terhitung.
   *
   * Akibat bagi pengguna: yang sampai ke layar adalah `{}` — tidak ada kalimat
   * yang bisa ditampilkan dan tidak ada key yang bisa diterjemahkan frontend,
   * sehingga pengguna hanya melihat kegagalan tanpa keterangan apa pun.
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
   * pengisian harga beli tidak menampilkan satu produk pun — halaman kosong
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

  /**
   * CACAT: daftar harga BELI diambil dari kueri harga JUAL.
   *
   * Handler ini memanggil `productRepository.fetchSales`, kueri yang sama
   * persis dengan yang dipakai ProductSalesPriceController.fetch. Tidak ada
   * method fetchPurchase di repository, dan tidak ada penyesuaian apa pun di
   * sini.
   *
   * Akibat bagi pengguna: kolom harga pada layar "harga beli" berisi angka
   * yang disusun untuk layar "harga jual". Operator pembelian membandingkan
   * harga penawaran pemasok dengan angka yang salah, lalu menimpanya.
   */
  it("CACAT: fetch memakai fetchSales, bukan kueri harga beli", async () => {
    const repo = repositoryTiruan();
    repo.fetchSales.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/");

    expect(repo.fetchSales).toHaveBeenCalled();
  });
});

describe("PUT / — mengubah harga beli satu produk", () => {
  const data = [
    { product_unit_id: null, price: 1000, discount: 50 },
    { product_unit_id: 9, price: 9500, discount: 0 },
  ];

  it("membalas 201 dan meneruskan setiap baris dengan product_id yang sama", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updatePurchasePrice.mockResolvedValue({ count: 2 });

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(201);
    expect(repo.updatePurchasePrice).toHaveBeenCalledWith([
      { product_id: 5, product_unit_id: null, price: 1000, discount: 50 },
      { product_id: 5, product_unit_id: 9, price: 9500, discount: 0 },
    ]);
  });

  it("mengabaikan product_id yang ditulis di dalam baris data", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updatePurchasePrice.mockResolvedValue({ count: 1 });

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

    expect(repo.updatePurchasePrice).toHaveBeenCalledWith([
      { product_id: 5, product_unit_id: null, price: 1, discount: 0 },
    ]);
  });

  it("menjadwalkan pengindeksan ulang produk setelah harga berubah", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updatePurchasePrice.mockResolvedValue({ count: 2 });

    await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(tambahAntrian).toHaveBeenCalledWith("product-updated", { id: 5 });
  });

  it("membalas 404 bila produknya tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(404);
    // Perhatikan: pesannya "Not found" yang umum, bukan "Product not found"
    // seperti yang dipakai ProductController.
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.updatePurchasePrice).not.toHaveBeenCalled();
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  it("membalas 404 bila produknya sudah dihapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk({ is_delete: true }));

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(404);
    expect(repo.updatePurchasePrice).not.toHaveBeenCalled();
  });

  it("membalas 500 berbadan kosong bila penyimpanan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updatePurchasePrice.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(500);
    expect(res.text).toBe("{}");
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  /**
   * CACAT: kegagalan penjadwalan pengindeksan membatalkan laporan
   * keberhasilan.
   *
   * Harganya sudah tersimpan sebelum `queue.add` dipanggil. Bila Redis sedang
   * tidak bisa dihubungi, balasannya menjadi 500 berbadan kosong.
   *
   * Akibat bagi pengguna: harga beli SUDAH berubah di basis data, tetapi layar
   * bertuliskan gagal. Operator mengisi ulang seluruh baris harga dan menekan
   * simpan lagi, tanpa tahu perubahan pertamanya sebenarnya berhasil.
   */
  it("CACAT: 500 saat antrian gagal, padahal harganya terlanjur tersimpan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updatePurchasePrice.mockResolvedValue({ count: 2 });
    tambahAntrian.mockRejectedValue(new Error("redis mati"));

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(500);
    expect(repo.updatePurchasePrice).toHaveBeenCalled();
  });

  /**
   * CACAT: hasil repository dikirim, bukan produk yang harganya baru diubah.
   *
   * updatePurchasePrice pada ProductRepository dideklarasikan mengembalikan
   * `void`; controller tetap meneruskan nilainya sebagai badan balasan 201.
   *
   * Akibat bagi pengguna: balasan sukses berbadan kosong, sehingga frontend
   * tidak bisa memperbarui tampilannya dari balasan itu dan harus memuat ulang
   * seluruh halaman untuk melihat harga yang baru saja disimpannya.
   */
  it("CACAT: badan balasan 201 kosong karena repository tidak mengembalikan apa pun", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updatePurchasePrice.mockResolvedValue(undefined);

    const res = await request(app(repo)).put("/").send({ product_id: 5, data });

    expect(res.status).toBe(201);
    expect(res.text).toBe("");
  });
});

describe("PUT /legacy — method update yang tidak terpasang di rute mana pun", () => {
  /**
   * CACAT BERAT: method `update` milik controller HARGA BELI menyimpan HARGA
   * JUAL.
   *
   * Ia membaca `sales_price` dan `sales_discount` dari badan permintaan lalu
   * memanggil `productRepository.updateSalesPrice` — salinan kata demi kata
   * dari ProductSalesPriceController. Tidak ada satu pun baris yang menyentuh
   * harga beli.
   *
   * Untuk sekarang method ini tidak dipasang di rute mana pun
   * (product-price-purchase.route.ts hanya memasang fetch dan
   * updateByProductID), jadi belum ada pengguna yang terkena. Bahayanya ada
   * pada namanya: siapa pun yang kelak memasang `update` pada PUT harga beli
   * akan mengira ia menyimpan harga beli, padahal setiap penyimpanan justru
   * MENIMPA HARGA JUAL seluruh satuan produk itu — dan margin penjualan
   * runtuh tanpa ada yang mengubah layar harga jual.
   *
   * Cacatnya dikunci apa adanya di sini supaya perilakunya terdokumentasi.
   */
  it("CACAT: update menulis harga jual, padahal ini controller harga beli", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updateSalesPrice.mockResolvedValue(undefined);

    const res = await request(app(repo))
      .put("/legacy")
      .send({
        product_id: 5,
        sales_price: 1500,
        sales_discount: 100,
        product_unit: [
          {
            product_id: 5,
            product_unit_id: 9,
            sales_price: 15000,
            sales_discount: 0,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(repo.updateSalesPrice).toHaveBeenCalledWith([
      { product_id: 5, product_unit_id: null, price: 1500, discount: 100 },
      { product_id: 5, product_unit_id: 9, price: 15000, discount: 0 },
    ]);
    // Harga beli tidak pernah disentuh sama sekali.
    expect(repo.updatePurchasePrice).not.toHaveBeenCalled();
  });

  /**
   * CACAT: balasannya berisi produk SEBELUM perubahan.
   *
   * Yang dikirim adalah `product` — hasil fetchByID yang diambil untuk
   * memeriksa keberadaan produk — bukan hasil penyimpanan. Akibatnya frontend
   * yang memperbarui tampilannya dari balasan ini menampilkan harga lama
   * seolah itulah yang baru saja tersimpan.
   */
  it("CACAT: 200 mengembalikan produk lama, bukan hasil penyimpanan", async () => {
    const repo = repositoryTiruan();
    const lama = produk({ sales_price: 1000 });
    repo.fetchByID.mockResolvedValue(lama);
    repo.updateSalesPrice.mockResolvedValue({ sales_price: 1500 });

    const res = await request(app(repo)).put("/legacy").send({
      product_id: 5,
      sales_price: 1500,
      sales_discount: 0,
      product_unit: [],
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(lama);
  });

  it("menjadwalkan pengindeksan ulang produk", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updateSalesPrice.mockResolvedValue(undefined);

    await request(app(repo)).put("/legacy").send({
      product_id: 5,
      sales_price: 1,
      sales_discount: 0,
      product_unit: [],
    });

    expect(tambahAntrian).toHaveBeenCalledWith("product-updated", { id: 5 });
  });

  it("membalas 404 bila produknya tidak ada atau sudah dihapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);
    const pertama = await request(app(repo)).put("/legacy").send({
      product_id: 5,
      sales_price: 1,
      sales_discount: 0,
      product_unit: [],
    });
    expect(pertama.status).toBe(404);
    expect(pertama.text).toBe(ErrorList["Product not found"]);

    repo.fetchByID.mockResolvedValue(produk({ is_delete: true }));
    const kedua = await request(app(repo)).put("/legacy").send({
      product_id: 5,
      sales_price: 1,
      sales_discount: 0,
      product_unit: [],
    });
    expect(kedua.status).toBe(404);
    expect(repo.updateSalesPrice).not.toHaveBeenCalled();
  });

  it("membalas 500 dengan key galat bila penyimpanan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(produk());
    repo.updateSalesPrice.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/legacy").send({
      product_id: 5,
      sales_price: 1,
      sales_discount: 0,
      product_unit: [],
    });

    // Berbeda dengan fetch dan updateByProductID di berkas yang sama, handler
    // ini mengirim key i18n yang bisa ditampilkan ke pengguna.
    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(tambahAntrian).not.toHaveBeenCalled();
  });
});
