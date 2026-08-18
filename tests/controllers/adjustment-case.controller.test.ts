import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku AdjustmentCaseController.
 *
 * Penyesuaian stok adalah dokumen yang mengubah jumlah barang di gudang tanpa
 * transaksi jual beli: barang yang DITEMUKAN (type 0, jumlah positif) atau
 * HILANG (type selain 0, jumlah negatif). Karena ia menyentuh stok, satu
 * dokumen menyeret empat repository lain — stok produk, stok masuk, stok
 * keluar, dan kartu stok — sehingga yang paling penting diuji di sini adalah
 * NILAI dan TANDA yang diteruskan ke masing-masing.
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
    constructor(
      public nama: string,
      public data: unknown
    ) {}
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

import AdjustmentCaseController from "../../src/controllers/adjustment-case.controller";

/** Lima repository tiruan, satu per ketergantungan konstruktor. */
function repositoryTiruan() {
  return {
    adjustmentCase: {
      create: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      delete: jest.fn(),
      fetchByID: jest.fn(),
      fetchUnconfirmed: jest.fn(),
      fetchAnnualArchives: jest.fn(),
      fetchArchives: jest.fn(),
    },
    productStock: { updateMany: jest.fn() },
    stockIn: { createMany: jest.fn(), deleteMany: jest.fn() },
    stockOut: { create: jest.fn(), deleteMany: jest.fn() },
    stockCard: { createMany: jest.fn() },
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function controller(repo: Repo) {
  return new AdjustmentCaseController(
    repo.adjustmentCase as never,
    repo.productStock as never,
    repo.stockIn as never,
    repo.stockOut as never,
    repo.stockCard as never
  );
}

function app(repo: Repo) {
  const c = controller(repo);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.post("/", c.create);
  a.post("/approve", c.approve);
  a.post("/reject", c.reject);
  a.post("/archives", c.fetchArchives);
  a.get("/archives", c.fetchAnnualArchives);
  a.get("/unconfirmed", c.fetchUnconfirmed);
  a.get("/:id", c.fetchByID);
  a.delete("/:id", c.delete);
  return a;
}

/** Dokumen penyesuaian yang belum dikonfirmasi. */
const penyesuaian = {
  id: 7,
  name: "ADJ-2024-12345678",
  date: new Date("2024-03-10T00:00:00.000Z").toISOString(),
  company_id: 1,
  is_confirm: false,
  is_delete: false,
  adjustment_case: [
    {
      id: 71,
      product_id: 100,
      product_unit_id: 5,
      quantity: 2,
      product_unit: { conversion: 12 },
    },
  ],
};

beforeEach(() => {
  kirimSocket.mockClear();
  // mockReset, bukan mockClear: satu tes di bawah memasang implementasi sendiri
  // untuk queue.add dan implementasi itu tidak boleh bocor ke tes berikutnya.
  tambahAntrian.mockReset();
  process.env.LIMIT = "10";
});

describe("POST / — membuat penyesuaian stok", () => {
  it("membalas 201 dan mengirim hasil repository", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.create.mockResolvedValue(penyesuaian);

    const res = await request(app(repo))
      .post("/")
      .send({
        date: "2024-03-10T00:00:00.000Z",
        type: 0,
        company_id: 1,
        adjustment_case: [{ product_id: 100, product_unit_id: 5, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(penyesuaian);
  });

  /**
   * Tanda jumlah adalah inti dokumen ini. type 0 berarti barang DITEMUKAN dan
   * jumlahnya dicatat positif; nilai lain berarti barang HILANG dan jumlahnya
   * dibalik menjadi negatif. Kalau tandanya tertukar, stok gudang bergerak ke
   * arah yang berlawanan dari kenyataannya.
   */
  it("type 0 mencatat jumlah sebagai positif (barang ditemukan)", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.create.mockResolvedValue(penyesuaian);

    await request(app(repo))
      .post("/")
      .send({
        date: "2024-03-10",
        type: 0,
        company_id: 1,
        adjustment_case: [{ product_id: 100, product_unit_id: 5, quantity: 2 }],
      });

    expect(repo.adjustmentCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustment_case: [{ product_id: 100, product_unit_id: 5, quantity: 2 }],
      })
    );
  });

  it("type 1 membalik jumlah menjadi negatif (barang hilang)", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.create.mockResolvedValue(penyesuaian);

    await request(app(repo))
      .post("/")
      .send({
        date: "2024-03-10",
        type: 1,
        adjustment_case: [{ product_id: 100, product_unit_id: 5, quantity: 2 }],
      });

    expect(repo.adjustmentCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustment_case: [
          { product_id: 100, product_unit_id: 5, quantity: -2 },
        ],
      })
    );
  });

  it("meneruskan userId dari middleware sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.create.mockResolvedValue(penyesuaian);

    await request(app(repo))
      .post("/")
      .send({
        date: "2024-03-10",
        type: 1,
        userId: 7,
        adjustment_case: [{ product_id: 100, product_unit_id: 5, quantity: 2 }],
      });

    expect(repo.adjustmentCase.create).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 7 })
    );
  });

  /**
   * Nomor dokumen dirakit controller: "ADJ-<tahun>-<delapan angka acak>".
   * Tahunnya diambil dari TANGGAL DOKUMEN, bukan tanggal hari ini, supaya
   * penyesuaian mundur tetap bernomor tahun yang benar.
   */
  it("merakit nomor dokumen dari tahun tanggal dokumen", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.create.mockResolvedValue(penyesuaian);

    await request(app(repo))
      .post("/")
      .send({
        date: "2023-12-31T00:00:00.000Z",
        type: 0,
        company_id: 1,
        adjustment_case: [{ product_id: 100, product_unit_id: 5, quantity: 2 }],
      });

    const [dikirim] = repo.adjustmentCase.create.mock.calls[0] as [
      { name: string },
    ];
    expect(dikirim.name).toMatch(/^ADJ-2023-\d{8}$/);
  });

  /**
   * Penemuan barang harus dibebankan ke perusahaan tertentu karena akan
   * dicatat sebagai stok masuk berharga nol pada perusahaan itu. Tanpa
   * company_id, stok masuknya tidak punya pemilik.
   */
  it("menolak 400 bila type 0 dikirim tanpa company_id", async () => {
    const repo = repositoryTiruan();

    const res = await request(app(repo))
      .post("/")
      .send({
        date: "2024-03-10",
        type: 0,
        adjustment_case: [{ product_id: 100, product_unit_id: 5, quantity: 2 }],
      });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Adjustment case company ID is required"]);
    expect(repo.adjustmentCase.create).not.toHaveBeenCalled();
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .post("/")
      .send({
        date: "2024-03-10",
        type: 1,
        adjustment_case: [{ product_id: 100, product_unit_id: 5, quantity: 2 }],
      });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: type apa pun selain 0 diperlakukan sebagai KEHILANGAN barang.
   *
   * Skema rute (createAdjustmentCaseSchema) hanya mewajibkan type berupa
   * bilangan bulat >= 0 — tanpa batas atas dan tanpa daftar nilai yang sah.
   * Controller memakai `type == 0 ? 1 : -1`, jadi type 2, 7, atau 99 semuanya
   * jatuh ke cabang "hilang" dan jumlahnya dibalik menjadi negatif.
   *
   * Akibatnya salah ketik pada satu angka di frontend mengurangi stok gudang
   * alih-alih menambahnya, dan penjagaan company_id di atas pun ikut terlewat
   * karena hanya berlaku untuk type 0.
   */
  it("CACAT: type 2 diperlakukan sebagai kehilangan barang, bukan ditolak", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.create.mockResolvedValue(penyesuaian);

    const res = await request(app(repo))
      .post("/")
      .send({
        date: "2024-03-10",
        type: 2,
        adjustment_case: [{ product_id: 100, product_unit_id: 5, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(repo.adjustmentCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustment_case: [
          { product_id: 100, product_unit_id: 5, quantity: -2 },
        ],
      })
    );
  });

  /**
   * CACAT: pembuatan penyesuaian TIDAK dikabarkan lewat socket.
   *
   * Dokumen ini menunggu persetujuan, jadi penyelia yang sedang membuka daftar
   * "belum dikonfirmasi" seharusnya langsung melihat pengajuan baru. Karena
   * tidak ada peristiwa socket, ia baru muncul setelah halaman dimuat ulang —
   * persetujuan stok bisa tertunda tanpa ada yang menyadarinya.
   */
  it("CACAT: create tidak mengirim peristiwa socket apa pun", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.create.mockResolvedValue(penyesuaian);

    await request(app(repo))
      .post("/")
      .send({
        date: "2024-03-10",
        type: 1,
        adjustment_case: [{ product_id: 100, product_unit_id: 5, quantity: 2 }],
      });

    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("POST /approve — menyetujui penyesuaian", () => {
  /** Hasil repository approve: dokumen yang sudah berstatus dikonfirmasi. */
  const disetujui = {
    ...penyesuaian,
    is_confirm: true,
    adjustment_case: [
      {
        id: 71,
        product_id: 100,
        product_unit_id: 5,
        quantity: 2,
        product_unit: { conversion: 12 },
      },
    ],
  };

  function repoSetujuSiap() {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchByID.mockResolvedValue(penyesuaian);
    repo.adjustmentCase.approve.mockResolvedValue(disetujui);
    repo.productStock.updateMany.mockResolvedValue(undefined);
    repo.stockIn.createMany.mockResolvedValue(undefined);
    repo.stockOut.create.mockResolvedValue(undefined);
    repo.stockCard.createMany.mockResolvedValue([{ id: 900 }, { id: 901 }]);
    return repo;
  }

  it("membalas 201 dan meneruskan id serta userId ke repository", async () => {
    const repo = repoSetujuSiap();

    const res = await request(app(repo))
      .post("/approve")
      .send({ id: 7, userId: 42 });

    expect(res.status).toBe(201);
    expect(repo.adjustmentCase.approve).toHaveBeenCalledWith(7, 42);
  });

  /**
   * Jumlah pada dokumen ditulis dalam SATUAN TAMPILAN (misal 2 dus), sedangkan
   * stok disimpan dalam satuan terkecil. Karena itu tiap jumlah dikalikan
   * konversi satuannya sebelum menyentuh stok — 2 dus berisi 12 menjadi 24
   * batang. Kalau konversinya terlewat, stok gudang bergeser jauh dari
   * kenyataan dan baru ketahuan saat stok opname.
   */
  it("mengalikan jumlah dengan konversi satuan sebelum mengubah stok", async () => {
    const repo = repoSetujuSiap();

    await request(app(repo)).post("/approve").send({ id: 7 });

    expect(repo.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 100, quantity: 24 }, // 2 dus x konversi 12
    ]);
  });

  it("memakai konversi 1 bila barisnya tidak punya satuan", async () => {
    const repo = repoSetujuSiap();
    repo.adjustmentCase.approve.mockResolvedValue({
      ...disetujui,
      adjustment_case: [
        {
          id: 71,
          product_id: 100,
          product_unit_id: null,
          quantity: 3,
          product_unit: null,
        },
      ],
    });

    await request(app(repo)).post("/approve").send({ id: 7 });

    expect(repo.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 100, quantity: 3 },
    ]);
  });

  /** Semua jumlah positif berarti barang ditemukan: dicatat sebagai stok MASUK. */
  it("mencatat stok masuk berharga nol bila semua jumlah positif", async () => {
    const repo = repoSetujuSiap();

    await request(app(repo)).post("/approve").send({ id: 7 });

    expect(repo.stockIn.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        product_id: 100,
        quantity: 24,
        price: 0,
        adjustment_case_code_id: 7,
        adjustment_case_id: 71,
        good_receipt_code_id: null,
        good_receipt_id: null,
        company_id: 1,
      }),
    ]);
    expect(repo.stockOut.create).not.toHaveBeenCalled();
  });

  /**
   * Semua jumlah negatif berarti barang hilang: dicatat sebagai stok KELUAR
   * dengan kuantitas yang DIMUTLAKKAN. Kasus hilang disimpan negatif di
   * adjustment_case, tetapi stock_out negatif tidak pernah diproses penetapan
   * FIFO (syaratnya quantity > 0) — kerugiannya tidak pernah dinilai dan
   * lapisan yang hilang fisik tidak pernah dikonsumsi. CLI pembangunan ulang
   * sudah menulis positif; kini jalur hidup sejalan.
   */
  it("mencatat stok keluar positif bila semua jumlah negatif", async () => {
    const repo = repoSetujuSiap();
    repo.adjustmentCase.approve.mockResolvedValue({
      ...disetujui,
      adjustment_case: [
        {
          id: 71,
          product_id: 100,
          product_unit_id: 5,
          quantity: -2,
          product_unit: { conversion: 12 },
        },
      ],
    });

    await request(app(repo)).post("/approve").send({ id: 7 });

    expect(repo.stockOut.create).toHaveBeenCalledWith([
      expect.objectContaining({
        product_id: 100,
        quantity: 24,
        price: 0,
        stock_in_id: null,
      }),
    ]);
    expect(repo.stockIn.createMany).not.toHaveBeenCalled();
  });

  it("menuliskan kartu stok dan mengantrikan tiap barisnya", async () => {
    const repo = repoSetujuSiap();

    await request(app(repo)).post("/approve").send({ id: 7 });

    expect(repo.stockCard.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        document_name: "ADJ-2024-12345678",
        product_id: 100,
        quantity: 24, // satuan terkecil
        display_quantity: 2, // satuan tampilan
        adjustment_case_code_id: 7,
        adjustment_case_id: 71,
      }),
    ]);
    expect(tambahAntrian).toHaveBeenCalledWith("stock-card-inserted", {
      id: 900,
    });
    expect(tambahAntrian).toHaveBeenCalledWith("stock-card-inserted", {
      id: 901,
    });
  });

  it("membalas 404 bila dokumennya tidak ada", async () => {
    const repo = repoSetujuSiap();
    repo.adjustmentCase.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).post("/approve").send({ id: 7 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.adjustmentCase.approve).not.toHaveBeenCalled();
  });

  /** Persetujuan ganda ditolak supaya stok tidak bertambah dua kali. */
  it("membalas 404 bila dokumennya sudah dikonfirmasi", async () => {
    const repo = repoSetujuSiap();
    repo.adjustmentCase.fetchByID.mockResolvedValue({
      ...penyesuaian,
      is_confirm: true,
    });

    const res = await request(app(repo)).post("/approve").send({ id: 7 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Adjustment case has been confirmed"]);
    expect(repo.adjustmentCase.approve).not.toHaveBeenCalled();
    expect(repo.productStock.updateMany).not.toHaveBeenCalled();
  });

  it("membalas 404 bila dokumennya sudah dihapus", async () => {
    const repo = repoSetujuSiap();
    repo.adjustmentCase.fetchByID.mockResolvedValue({
      ...penyesuaian,
      is_delete: true,
    });

    const res = await request(app(repo)).post("/approve").send({ id: 7 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Adjustment case has been deleted"]);
    expect(repo.adjustmentCase.approve).not.toHaveBeenCalled();
  });

  it("membalas 500 bila salah satu langkah gagal", async () => {
    const repo = repoSetujuSiap();
    repo.stockCard.createMany.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).post("/approve").send({ id: 7 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT BERAT: approve mengembalikan dokumen SEBELUM disetujui.
   *
   * Setelah semua pekerjaan selesai, handler mengirim `adjustmentCase` — hasil
   * fetchByID yang diambil di awal — bukan `result` dari repository.approve.
   * Jadi badan balasan masih berisi is_confirm: false, tanpa penyetuju maupun
   * waktu persetujuan.
   *
   * Bagi pengguna: setelah menekan "Setujui" layar tetap menampilkan dokumen
   * berstatus MENUNGGU. Ia wajar menyimpulkan persetujuannya gagal dan menekan
   * tombolnya lagi — permintaan kedua barulah ditolak 404 "sudah dikonfirmasi",
   * pesan yang membingungkan karena ia belum pernah melihat status berubah.
   * Stoknya sendiri sudah terlanjur berubah pada permintaan pertama.
   */
  it("CACAT: badan balasan approve masih berstatus belum dikonfirmasi", async () => {
    const repo = repoSetujuSiap();

    const res = await request(app(repo)).post("/approve").send({ id: 7 });

    expect(res.status).toBe(201);
    expect(res.body.is_confirm).toBe(false);
    // Padahal repository sudah mengembalikan dokumen yang dikonfirmasi.
    expect(await repo.adjustmentCase.approve.mock.results[0].value).toEqual(
      expect.objectContaining({ is_confirm: true })
    );
  });

  /**
   * CACAT BERAT: jumlah bertanda campuran mengubah stok tanpa jejak kartu masuk
   * maupun keluar.
   *
   * checkType hanya mengenali dua keadaan: semua positif (ditemukan) atau semua
   * negatif (hilang). Untuk dokumen yang berisi keduanya ia mengembalikan null,
   * dan kedua cabang dilewati — tetapi productStockRepository.updateMany SUDAH
   * dipanggil sebelum pemeriksaan itu.
   *
   * Akibatnya stok produk berubah sementara stock_in dan stock_out tidak
   * mencatat apa pun. Stok di layar tidak lagi bisa direkonstruksi dari
   * riwayatnya, dan perhitungan harga pokok kehilangan bahan — selisihnya
   * permanen sampai ada yang memperbaikinya secara manual.
   */
  it("CACAT: penyesuaian bertanda campuran mengubah stok tanpa mencatat stok masuk/keluar", async () => {
    const repo = repoSetujuSiap();
    repo.adjustmentCase.approve.mockResolvedValue({
      ...disetujui,
      adjustment_case: [
        {
          id: 71,
          product_id: 100,
          product_unit_id: null,
          quantity: 5,
          product_unit: null,
        },
        {
          id: 72,
          product_id: 200,
          product_unit_id: null,
          quantity: -3,
          product_unit: null,
        },
      ],
    });

    const res = await request(app(repo)).post("/approve").send({ id: 7 });

    expect(res.status).toBe(201);
    expect(repo.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 100, quantity: 5 },
      { productID: 200, quantity: -3 },
    ]);
    expect(repo.stockIn.createMany).not.toHaveBeenCalled();
    expect(repo.stockOut.create).not.toHaveBeenCalled();
  });

  /**
   * CACAT: dokumen tanpa satu pun baris tetap disetujui dan dianggap
   * "ditemukan".
   *
   * `[].every(...)` bernilai true, jadi checkType mengembalikan 0 untuk larik
   * kosong dan stockIn.createMany dipanggil dengan larik kosong. Skema rute pun
   * meloloskan adjustment_case kosong. Hasilnya dokumen penyesuaian hampa ikut
   * mengisi arsip dan alur persetujuan tanpa mengubah apa pun.
   */
  it("CACAT: dokumen tanpa baris tetap disetujui sebagai penemuan barang", async () => {
    const repo = repoSetujuSiap();
    repo.adjustmentCase.approve.mockResolvedValue({
      ...disetujui,
      adjustment_case: [],
    });
    repo.stockCard.createMany.mockResolvedValue([]);

    const res = await request(app(repo)).post("/approve").send({ id: 7 });

    expect(res.status).toBe(201);
    expect(repo.stockIn.createMany).toHaveBeenCalledWith([]);
  });

  /**
   * CACAT: pengantrian kartu stok tidak pernah ditunggu.
   *
   * `stockCardResult.forEach(async (x) => { await queue.add(...) })` — forEach
   * MENGABAIKAN promise yang dikembalikan fungsi async, jadi balasan 201 dikirim
   * sebelum pekerjaan antrian benar-benar terdaftar.
   *
   * Dua akibatnya bagi pengguna. Pertama, "berhasil" yang ia baca belum berarti
   * kartu stoknya akan terbentuk. Kedua, kalau Redis sedang bermasalah,
   * penolakan itu tidak tertangkap try/catch mana pun — ia menjadi unhandled
   * rejection yang pada Node 15 ke atas MENGHENTIKAN SELURUH PROSES, beberapa
   * saat setelah pengguna menerima balasan sukses.
   *
   * Tes ini mengunci sebabnya tanpa ikut menjatuhkan proses tesnya: antrian
   * dibuat menggantung, dan balasan 201 terbukti sudah terkirim sementara
   * pekerjaan antriannya masih belum selesai.
   */
  it("CACAT: balasan 201 dikirim sebelum pekerjaan antrian selesai", async () => {
    const repo = repoSetujuSiap();
    let antrianSelesai = false;
    let lanjutkan: (() => void) | undefined;
    /*
      Hanya job kartu stok yang digantung — dialah yang ditembak di dalam
      forEach tanpa ditunggu. Job hpp-assign justru DI-AWAIT oleh handler
      (disengaja: penetapan HPP harus pasti terantre sebelum balasan sukses),
      jadi menggantungkannya ikut menggantung seluruh permintaan.
    */
    tambahAntrian.mockImplementation((nama: string) => {
      if (nama !== "stock-card-inserted") {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        lanjutkan = () => {
          antrianSelesai = true;
          resolve();
        };
      });
    });

    const res = await request(app(repo)).post("/approve").send({ id: 7 });

    expect(res.status).toBe(201);
    expect(antrianSelesai).toBe(false);
    lanjutkan?.();
  });
});

describe("POST /reject — menolak penyesuaian", () => {
  it("membalas 201 dan mengirim hasil repository", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchByID.mockResolvedValue(penyesuaian);
    repo.adjustmentCase.reject.mockResolvedValue({
      ...penyesuaian,
      is_delete: true,
    });

    const res = await request(app(repo))
      .post("/reject")
      .send({ id: 7, userId: 42 });

    expect(res.status).toBe(201);
    expect(res.body.is_delete).toBe(true);
    expect(repo.adjustmentCase.reject).toHaveBeenCalledWith(7, 42);
  });

  it("membalas 404 bila dokumennya tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).post("/reject").send({ id: 7 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Adjustment case not found"]);
    expect(repo.adjustmentCase.reject).not.toHaveBeenCalled();
  });

  /** Dokumen yang sudah disetujui tidak boleh ditolak belakangan. */
  it("membalas 404 bila dokumennya sudah dikonfirmasi", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchByID.mockResolvedValue({
      ...penyesuaian,
      is_confirm: true,
    });

    const res = await request(app(repo)).post("/reject").send({ id: 7 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Adjustment case has been confirmed"]);
    expect(repo.adjustmentCase.reject).not.toHaveBeenCalled();
  });

  it("membalas 404 bila dokumennya sudah dihapus", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchByID.mockResolvedValue({
      ...penyesuaian,
      is_delete: true,
    });

    const res = await request(app(repo)).post("/reject").send({ id: 7 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Adjustment case has been deleted"]);
  });

  /**
   * Dulu CACAT: reject memakai `res.status(500).send(error)` sehingga objek
   * Error dijadikan JSON "{}" — message dan stack bukan properti yang bisa
   * dihitung — dan frontend tidak punya key i18n untuk ditampilkan. Kini
   * reject membalas ErrorList["Internal server error"] seperti tetangganya.
   */
  it("membalas key i18n saat reject gagal, tanpa membocorkan galatnya", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchByID.mockResolvedValue(penyesuaian);
    repo.adjustmentCase.reject.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).post("/reject").send({ id: 7 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("DELETE /:id — membatalkan penyesuaian yang sudah disetujui", () => {
  const sudahDisetujui = { ...penyesuaian, is_confirm: true };

  function repoHapusSiap() {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchByID.mockResolvedValue(sudahDisetujui);
    repo.adjustmentCase.delete.mockResolvedValue({
      ...sudahDisetujui,
      is_delete: true,
    });
    repo.productStock.updateMany.mockResolvedValue(undefined);
    repo.stockIn.deleteMany.mockResolvedValue(undefined);
    repo.stockOut.deleteMany.mockResolvedValue(undefined);
    return repo;
  }

  it("membalas 200 dan meneruskan id serta userId", async () => {
    const repo = repoHapusSiap();

    const res = await request(app(repo)).delete("/7");

    expect(res.status).toBe(200);
    expect(repo.adjustmentCase.delete).toHaveBeenCalledWith(7, 99);
  });

  /**
   * Membatalkan penyesuaian harus MENGEMBALIKAN stok ke keadaan semula, jadi
   * jumlahnya dibalik tandanya (dikali -1) lalu tetap dikali konversi satuan.
   * Kalau pembalikan ini salah, pembatalan justru menggandakan penyesuaiannya.
   */
  it("mengembalikan stok dengan jumlah berlawanan tanda", async () => {
    const repo = repoHapusSiap();

    await request(app(repo)).delete("/7");

    expect(repo.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 100, quantity: -24 }, // kebalikan dari +24 saat disetujui
    ]);
  });

  it("menghapus stok masuk untuk penyesuaian penemuan barang", async () => {
    const repo = repoHapusSiap();

    await request(app(repo)).delete("/7");

    expect(repo.stockIn.deleteMany).toHaveBeenCalledWith([
      {
        good_receipt_id: null,
        good_receipt_code_id: null,
        adjustment_case_id: 71,
        adjustment_case_code_id: 7,
        price: 0,
      },
    ]);
    expect(repo.stockOut.deleteMany).not.toHaveBeenCalled();
  });

  it("menghapus stok keluar untuk penyesuaian kehilangan barang", async () => {
    const repo = repoHapusSiap();
    repo.adjustmentCase.fetchByID.mockResolvedValue({
      ...sudahDisetujui,
      adjustment_case: [
        {
          id: 71,
          product_id: 100,
          product_unit_id: 5,
          quantity: -2,
          product_unit: { conversion: 12 },
        },
      ],
    });

    await request(app(repo)).delete("/7");

    expect(repo.stockOut.deleteMany).toHaveBeenCalledWith([
      {
        sales_invoice_code_id: null,
        sales_invoice_id: null,
        adjustment_case_id: 71,
        adjustment_case_code_id: 7,
      },
    ]);
    expect(repo.stockIn.deleteMany).not.toHaveBeenCalled();
  });

  it("mengantrikan penghapusan kartu stok untuk tiap baris", async () => {
    const repo = repoHapusSiap();

    await request(app(repo)).delete("/7");

    expect(tambahAntrian).toHaveBeenCalledWith("stock-card-deleted", {
      sales_invoice_code_id: null,
      sales_invoice_id: null,
      adjustment_case_code_id: 7,
      adjustment_case_id: 71,
      sales_return_code_id: null,
      sales_return_id: null,
      good_receipt_code_id: null,
      good_receipt_id: null,
    });
  });

  it("membalas 404 bila dokumennya tidak ada", async () => {
    const repo = repoHapusSiap();
    repo.adjustmentCase.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/7");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Adjustment case not found"]);
    expect(repo.adjustmentCase.delete).not.toHaveBeenCalled();
  });

  it("membalas 404 bila dokumennya sudah dihapus", async () => {
    const repo = repoHapusSiap();
    repo.adjustmentCase.fetchByID.mockResolvedValue({
      ...sudahDisetujui,
      is_delete: true,
    });

    const res = await request(app(repo)).delete("/7");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Adjustment case has been deleted"]);
    expect(repo.adjustmentCase.delete).not.toHaveBeenCalled();
  });

  /**
   * Dokumen yang masih menunggu persetujuan belum menyentuh stok, jadi tidak
   * ada yang perlu dikembalikan. Penolakannya memakai 400 — bukan 404 seperti
   * dua keadaan di atas — karena ini penolakan aturan bisnis. Alur yang benar
   * untuk dokumen semacam itu adalah menolaknya lewat /reject.
   */
  it("membalas 400 bila dokumennya belum dikonfirmasi", async () => {
    const repo = repoHapusSiap();
    repo.adjustmentCase.fetchByID.mockResolvedValue(penyesuaian);

    const res = await request(app(repo)).delete("/7");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Adjustment case has not been confirmed"]);
    expect(repo.adjustmentCase.delete).not.toHaveBeenCalled();
    expect(repo.productStock.updateMany).not.toHaveBeenCalled();
  });

  it("membalas 500 bila salah satu langkah gagal", async () => {
    const repo = repoHapusSiap();
    repo.stockIn.deleteMany.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).delete("/7");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: penghapusan penyesuaian bertanda campuran juga mengembalikan stok
   * tanpa menghapus catatan stok masuk maupun keluar — kebalikan persis dari
   * cacat pada approve, dan menambah selisih yang sama.
   */
  it("CACAT: penghapusan bertanda campuran tidak menghapus stok masuk maupun keluar", async () => {
    const repo = repoHapusSiap();
    repo.adjustmentCase.fetchByID.mockResolvedValue({
      ...sudahDisetujui,
      adjustment_case: [
        {
          id: 71,
          product_id: 100,
          product_unit_id: null,
          quantity: 5,
          product_unit: null,
        },
        {
          id: 72,
          product_id: 200,
          product_unit_id: null,
          quantity: -3,
          product_unit: null,
        },
      ],
    });

    const res = await request(app(repo)).delete("/7");

    expect(res.status).toBe(200);
    expect(repo.productStock.updateMany).toHaveBeenCalledWith([
      { productID: 100, quantity: -5 },
      { productID: 200, quantity: 3 },
    ]);
    expect(repo.stockIn.deleteMany).not.toHaveBeenCalled();
    expect(repo.stockOut.deleteMany).not.toHaveBeenCalled();
  });

  /**
   * CACAT: pembatalan TIDAK dikabarkan lewat socket, padahal ia mengubah stok
   * gudang. Layar pengguna lain tetap menampilkan stok lama sampai dimuat
   * ulang, dan penjualan bisa dilakukan atas angka stok yang sudah tidak
   * berlaku.
   */
  it("CACAT: delete tidak mengirim peristiwa socket apa pun", async () => {
    const repo = repoHapusSiap();

    await request(app(repo)).delete("/7");

    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("GET /:id, /unconfirmed, /archives", () => {
  it("fetchByID membalas 200 untuk dokumen yang ada", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchByID.mockResolvedValue(penyesuaian);

    const res = await request(app(repo)).get("/7");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(penyesuaian);
    expect(repo.adjustmentCase.fetchByID).toHaveBeenCalledWith(7);
  });

  it("fetchByID membalas 404 untuk dokumen yang tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/7");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchByID.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/7");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchUnconfirmed meneruskan halaman dan ukuran halaman", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchUnconfirmed.mockResolvedValue({
      data: [],
      count: 0,
    });

    await request(app(repo)).get("/unconfirmed?page=3");

    expect(repo.adjustmentCase.fetchUnconfirmed).toHaveBeenCalledWith({
      page: 3,
      pageSize: 10,
      keyword: "",
    });
  });

  it("fetchUnconfirmed memakai halaman 1 untuk parameter yang tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchUnconfirmed.mockResolvedValue({
      data: [],
      count: 0,
    });

    await request(app(repo)).get("/unconfirmed?page=abc");

    expect(repo.adjustmentCase.fetchUnconfirmed).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it("fetchAnnualArchives meneruskan hasil repository apa adanya", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchAnnualArchives.mockResolvedValue([
      { year: 2024, count: 12 },
    ]);

    const res = await request(app(repo)).get("/archives");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ year: 2024, count: 12 }]);
  });

  it("fetchAnnualArchives membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchAnnualArchives.mockRejectedValue(
      new Error("gagal")
    );

    const res = await request(app(repo)).get("/archives");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchArchives meneruskan seluruh penyaring apa adanya", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).post("/archives").send({
      year: 2024,
      month: 3,
      keyword: "adj",
      page: 2,
      pageSize: 25,
      startDate: "2024-03-01T00:00:00.000Z",
      endDate: "2024-03-31T00:00:00.000Z",
      isConfirm: true,
      isReject: false,
      isPending: false,
      isLost: true,
      isFound: true,
      sortBy: "date",
      sortDirection: "desc",
    });

    expect(repo.adjustmentCase.fetchArchives).toHaveBeenCalledWith({
      year: 2024,
      month: 3,
      keyword: "adj",
      page: 2,
      pageSize: 25,
      startDate: new Date("2024-03-01T00:00:00.000Z"),
      endDate: new Date("2024-03-31T00:00:00.000Z"),
      isConfirm: true,
      isReject: false,
      isPending: false,
      isLost: true,
      isFound: true,
      sortBy: "date",
      sortDirection: "desc",
    });
  });

  /**
   * Kata kunci berisi "%" dulu MEMATIKAN PROSES: translateKeyword melempar
   * URIError di luar blok try. Kini kata kuncinya dipakai apa adanya dan
   * pencariannya berjalan seperti biasa.
   */
  it("fetchArchives menerima kata kunci berisi persen tanpa menggagalkan permintaan", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(repo))
      .post("/archives")
      .send({ year: 2024, month: 3, keyword: "%" });

    expect(res.status).toBe(200);
    expect(repo.adjustmentCase.fetchArchives).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "%" })
    );
  });

  it("fetchArchives membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchArchives.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo))
      .post("/archives")
      .send({ year: 2024, month: 3 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: tanggal arsip yang tidak dikirim diam-diam menjadi HARI INI.
   *
   * translateDate mengembalikan `new Date()` untuk nilai kosong maupun teks
   * yang bukan tanggal. Jadi permintaan arsip tanpa startDate/endDate dijawab
   * dengan rentang hari ini saja, bukan sebulan penuh sesuai year dan month
   * yang dikirim bersamanya — pengguna melihat arsip nyaris kosong dan mengira
   * datanya hilang.
   */
  it("CACAT: startDate dan endDate yang kosong menjadi tanggal hari ini", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchArchives.mockResolvedValue({ data: [], count: 0 });
    const sebelum = Date.now();

    await request(app(repo))
      .post("/archives")
      .send({ year: 2024, month: 3, sortBy: "date", sortDirection: "desc" });

    const [dikirim] = repo.adjustmentCase.fetchArchives.mock.calls[0] as [
      { startDate: Date; endDate: Date },
    ];
    expect(dikirim.startDate.getTime()).toBeGreaterThanOrEqual(sebelum);
    expect(dikirim.endDate.getTime()).toBeGreaterThanOrEqual(sebelum);
  });

  /**
   * CACAT: pageSize arsip diteruskan mentah tanpa batas atas.
   *
   * fetchUnconfirmed memakai process.env.LIMIT, dan controller lain memakai
   * translatePageSize yang membatasi 1..100. fetchArchives justru memakai
   * `req.body.pageSize` apa adanya, dan skema rutenya tidak memvalidasi bidang
   * itu sama sekali. Satu permintaan bisa meminta jutaan baris sekaligus dan
   * membebani basis data.
   */
  it("CACAT: pageSize sangat besar diteruskan tanpa dibatasi", async () => {
    const repo = repositoryTiruan();
    repo.adjustmentCase.fetchArchives.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo))
      .post("/archives")
      .send({ year: 2024, month: 3, pageSize: 1000000 });

    expect(repo.adjustmentCase.fetchArchives).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 1000000 })
    );
  });
});
