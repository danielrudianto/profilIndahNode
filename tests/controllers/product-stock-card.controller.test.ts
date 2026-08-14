import express from "express";
import request from "supertest";

/**
 * Perilaku ProductStockCardController.
 *
 * Bentuknya mengikuti tests/controllers/company.controller.test.ts: repository
 * ditiru dan disuntikkan lewat konstruktor, lalu yang diperiksa adalah
 * keputusan controller-nya.
 *
 * Controller ini hanya membaca — tidak ada pembuatan, penghapusan, maupun
 * peristiwa socket. SocketHelper tetap ditiru mengikuti acuan: aslinya ia
 * memanggil getIO() yang MELEMPAR bila initIO belum dipanggil, dan di dalam
 * tes initIO memang tidak pernah dipanggil.
 *
 * CATATAN UMUM TENTANG BALASAN GALAT. Kedua blok catch menulis
 * `res.status(500).send(error)` — objek Error dikirim apa adanya, bukan key
 * i18n dari ErrorList seperti di controller lain. Express menyerialkannya
 * sebagai JSON, dan `message` maupun `stack` pada Error bukan properti
 * terhitung, jadi yang sampai ke pengguna adalah badan kosong `{}`.
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

import { ProductStockCardController } from "../../src/controllers/product-stock-card.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
function productRepositoryTiruan() {
  return { fetchByID: jest.fn(), fetchByIDs: jest.fn() };
}

function stockCardRepositoryTiruan() {
  return { fetchByProductID: jest.fn(), fetchMutation: jest.fn() };
}

type ProductRepo = ReturnType<typeof productRepositoryTiruan>;
type CardRepo = ReturnType<typeof stockCardRepositoryTiruan>;

function app(produk: ProductRepo, kartu: CardRepo) {
  const c = new ProductStockCardController(produk as never, kartu as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
    next();
  });
  a.get("/:id", c.fetchByID);
  a.post("/mutation", c.fetchMutation);
  return a;
}

const halamanKartu = {
  data: [
    { id: 1, product_id: 5, quantity: 10, date: "2026-08-01" },
    { id: 2, product_id: 5, quantity: -3, date: "2026-08-02" },
  ],
  count: 2,
};

beforeEach(() => {
  kirimSocket.mockReset();
  process.env.LIMIT = "10";
});

describe("GET /:id — kartu stok satu produk", () => {
  it("membalas 200 dan meneruskan hasil repository apa adanya", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchByProductID.mockResolvedValue(halamanKartu);

    const res = await request(app(produk, kartu)).get("/5?page=1&pageSize=10");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(halamanKartu);
  });

  it("menerjemahkan halaman dan meneruskan id produk sebagai angka", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchByProductID.mockResolvedValue(halamanKartu);

    await request(app(produk, kartu)).get("/5?page=3&pageSize=25");

    expect(kartu.fetchByProductID).toHaveBeenCalledWith({
      page: 3,
      pageSize: 25,
      productID: 5,
    });
  });

  it("memakai halaman 1 bila parameter halamannya tidak masuk akal", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchByProductID.mockResolvedValue(halamanKartu);

    await request(app(produk, kartu)).get("/5?page=abc&pageSize=10");

    expect(kartu.fetchByProductID).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it("halaman nol dan negatif ikut dijadikan halaman 1", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchByProductID.mockResolvedValue(halamanKartu);

    await request(app(produk, kartu)).get("/5?page=-4&pageSize=10");

    expect(kartu.fetchByProductID).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it("tidak memakai repository produk sama sekali", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchByProductID.mockResolvedValue(halamanKartu);

    await request(app(produk, kartu)).get("/5?page=1&pageSize=10");

    // productRepository disuntikkan lewat konstruktor tetapi tidak pernah
    // dipakai handler mana pun di controller ini.
    expect(produk.fetchByID).not.toHaveBeenCalled();
    expect(produk.fetchByIDs).not.toHaveBeenCalled();
  });

  it("membalas 500 dengan badan kosong bila repository gagal", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchByProductID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(produk, kartu)).get("/5?page=1&pageSize=10");

    expect(res.status).toBe(500);
    expect(res.text).toBe("{}");
  });

  /**
   * CACAT: produknya tidak pernah diperiksa keberadaannya.
   *
   * Handler ini langsung menanyakan kartu stok untuk id apa pun. Produk yang
   * tidak ada menghasilkan halaman kosong dengan status 200, bukan 404 —
   * padahal repository produk sudah tersedia di konstruktor dan tinggal
   * dipakai.
   *
   * Akibat bagi pengguna: salah ketik id pada URL kartu stok menampilkan
   * "belum ada mutasi" untuk produk yang sebenarnya tidak ada. Operator bisa
   * menyimpulkan barangnya belum pernah bergerak, padahal ia sedang melihat
   * produk yang keliru.
   */
  it("CACAT: id produk yang tidak ada dibalas 200 berisi halaman kosong", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchByProductID.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(produk, kartu)).get(
      "/999999?page=1&pageSize=10"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], count: 0 });
    expect(produk.fetchByID).not.toHaveBeenCalled();
  });

  /**
   * CACAT: ukuran halaman dibaca dengan Number() mentah.
   *
   * Halamannya diterjemahkan translatePage — yang memang punya nilai bawaan —
   * tetapi pageSize tidak. `Number(undefined)` menghasilkan NaN, dan nilai itu
   * diteruskan langsung sebagai LIMIT kueri.
   *
   * Yang menahan hal ini di produksi hanyalah skema pada rutenya, yang
   * mewajibkan pageSize. Controller-nya sendiri tidak punya pertahanan apa
   * pun, sehingga separuh perlindungannya ada di tempat lain dan mudah hilang
   * saat rutenya diubah.
   */
  it("CACAT: pageSize menjadi NaN bila parameternya tidak dikirim", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchByProductID.mockResolvedValue({ data: [], count: 0 });

    await request(app(produk, kartu)).get("/5");

    expect(kartu.fetchByProductID).toHaveBeenCalledWith({
      page: 1,
      pageSize: NaN,
      productID: 5,
    });
  });
});

describe("POST /mutation — mutasi stok", () => {
  it("membalas 200 dan meneruskan tanggal, produk, serta dasar tampilan", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchMutation.mockResolvedValue({ awal: 10, masuk: 5, keluar: 2 });

    const res = await request(app(produk, kartu)).post("/mutation").send({
      date: "2026-08-01",
      product_id: 5,
      viewBy: "date",
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ awal: 10, masuk: 5, keluar: 2 });
    expect(kartu.fetchMutation).toHaveBeenCalledWith({
      date: new Date("2026-08-01"),
      productID: 5,
      viewBy: "date",
    });
  });

  it("meneruskan viewBy 'created' apa adanya", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchMutation.mockResolvedValue({});

    await request(app(produk, kartu)).post("/mutation").send({
      date: "2026-08-01",
      product_id: 5,
      viewBy: "created",
    });

    expect(kartu.fetchMutation).toHaveBeenCalledWith(
      expect.objectContaining({ viewBy: "created" })
    );
  });

  it("membalas 500 dengan badan kosong bila repository gagal", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchMutation.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(produk, kartu))
      .post("/mutation")
      .send({ date: "2026-08-01", product_id: 5, viewBy: "date" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("{}");
  });

  /**
   * CACAT: tanggal yang tidak bisa dibaca diteruskan sebagai Invalid Date.
   *
   * Tanggalnya dibangun dengan `new Date(req.body.date)` tanpa pemeriksaan
   * apa pun, padahal repo ini punya translateDate di utils/escape.helper yang
   * justru dibuat untuk keperluan itu. Skema rutenya hanya mewajibkan bidang
   * `date` ADA, bukan berbentuk tanggal yang sah, jadi teks apa pun lolos.
   *
   * Akibat bagi pengguna: laporan mutasi untuk tanggal yang salah ketik tidak
   * ditolak, melainkan dikirim ke basis data sebagai Invalid Date. Semua
   * perbandingan tanggal pada kueri itu bernilai salah, sehingga laporannya
   * kembali dengan angka nol — terbaca sebagai "tidak ada mutasi pada periode
   * itu", bukan sebagai kesalahan pengisian.
   */
  it("CACAT: tanggal tak terbaca diteruskan sebagai Invalid Date, bukan ditolak", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchMutation.mockResolvedValue({ awal: 0, masuk: 0, keluar: 0 });

    const res = await request(app(produk, kartu))
      .post("/mutation")
      .send({ date: "kemarin sore", product_id: 5, viewBy: "date" });

    expect(res.status).toBe(200);
    const dikirim = kartu.fetchMutation.mock.calls[0][0] as { date: Date };
    expect(dikirim.date).toBeInstanceOf(Date);
    expect(Number.isNaN(dikirim.date.getTime())).toBe(true);
  });

  /**
   * CACAT: produk tidak diperiksa dan viewBy tidak dibatasi di controller.
   *
   * fetchMutation meneruskan product_id maupun viewBy apa adanya. Repository
   * membedakan cabang kuerinya dengan `data.viewBy === "date"`, jadi nilai
   * lain apa pun diam-diam jatuh ke cabang "created".
   *
   * Akibat bagi pengguna: kalau suatu saat skema rutenya dilonggarkan atau
   * handler ini dipasang di tempat lain, laporan mutasi akan disusun menurut
   * tanggal PEMBUATAN dokumen padahal pengguna memilih tanggal dokumen —
   * dua angka yang berbeda, keduanya tampak masuk akal, dan tidak ada yang
   * memberi tahu bahwa pilihannya diabaikan.
   */
  it("CACAT: viewBy asing diteruskan apa adanya tanpa penolakan", async () => {
    const produk = productRepositoryTiruan();
    const kartu = stockCardRepositoryTiruan();
    kartu.fetchMutation.mockResolvedValue({});

    const res = await request(app(produk, kartu))
      .post("/mutation")
      .send({ date: "2026-08-01", product_id: 999999, viewBy: "sembarang" });

    expect(res.status).toBe(200);
    expect(kartu.fetchMutation).toHaveBeenCalledWith(
      expect.objectContaining({ productID: 999999, viewBy: "sembarang" })
    );
  });
});
