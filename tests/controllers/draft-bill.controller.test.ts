import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku DraftBillController.
 *
 * Draft bill adalah keranjang belanja kasir: barang dikumpulkan dulu, lalu
 * DIKONFIRMASI menjadi faktur penjualan sungguhan. Karena konfirmasi itulah
 * yang melahirkan tagihan, yang paling penting diuji di berkas ini adalah
 * NILAI APA yang diteruskan ke `confirm` — daftar barang, biaya layanan,
 * ongkos kirim, dan diskon.
 *
 * Controller ini satu-satunya di bagian ini yang benar-benar mengirim
 * peristiwa socket, jadi tiruan SocketHelper di sini bukan sekadar pengaman:
 * ia yang diperiksa. Aslinya SocketHelper memanggil getIO(), yang MELEMPAR
 * bila initIO belum dipanggil — dan di dalam tes memang tidak pernah
 * dipanggil.
 *
 * Handler di controller ini memakai rantai .then()/.catch(), bukan async/await.
 * Bedanya terasa pada jalur galat: satu rantai yang lupa .catch() tidak
 * berujung 500 melainkan tidak membalas apa pun.
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

import DraftBillController from "../../src/controllers/draft-bill.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
function repositoryTiruan() {
  return {
    create: jest.fn(),
    fetchByID: jest.fn(),
    fetchByName: jest.fn(),
    fetchByOTC: jest.fn(),
    confirm: jest.fn(),
    deleteByID: jest.fn(),
    fetchArchiveYears: jest.fn(),
    fetchArchiveMonths: jest.fn(),
    fetchArchive: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo) {
  const c = new DraftBillController(repo as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
    next();
  });
  a.post("/confirm", c.confirmByID);
  a.post("/delete", c.deleteByID);
  a.post("/", c.create);
  a.get("/archives", c.fetchArchives);
  a.get("/name/:name", c.fetchByName);
  a.get("/otc/:otc", c.fetchByOTC);
  return a;
}

/** Draft berisi satu baris: 3 x (5.000 - 500) = 13.500. */
function draft(ubah: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "INV-2024-12345678",
    customer_id: 5,
    created_at: "2024-05-01T00:00:00.000Z",
    is_delete: false,
    draft_bill: [
      {
        product_id: 10,
        product_unit_id: 2,
        quantity: 3,
        price: 5000,
        discount: 500,
      },
    ],
    ...ubah,
  };
}

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST / — membuat draft", () => {
  it("membalas 201 dan mengirim hasil repository", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(draft());

    const res = await request(app(repo))
      .post("/")
      .send({ customer_id: 5, items: [], note: "catatan", otc: "OTC-1" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(draft());
  });

  it("meneruskan biaya layanan dan ongkos kirim apa adanya", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(draft());

    await request(app(repo))
      .post("/")
      .send({
        customer_id: 5,
        items: [{ item_id: 10, quantity: 3, price: 5000, discount: 500 }],
        note: "catatan",
        otc: "OTC-1",
        service: 7500,
        delivery: 12500,
        userId: 42,
      });

    const arg = repo.create.mock.calls[0][0];
    expect(arg.service).toBe(7500);
    expect(arg.delivery).toBe(12500);
    expect(arg.customer_id).toBe(5);
    expect(arg.otc).toBe("OTC-1");
    expect(arg.note).toBe("catatan");
    expect(arg.created_by).toBe(42);
    // Daftar barang diteruskan tanpa disentuh sama sekali.
    expect(arg.items).toEqual([
      { item_id: 10, quantity: 3, price: 5000, discount: 500 },
    ]);
  });

  it("memberi nama berawalan INV- dan tahun berjalan", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(draft());

    await request(app(repo)).post("/").send({ customer_id: 5, items: [] });

    const nama: string = repo.create.mock.calls[0][0].name;
    expect(nama).toMatch(
      new RegExp(`^INV-${new Date().getFullYear()}-\\d{8}$`)
    );
  });

  it("membalas 500 berisi key i18n bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .post("/")
      .send({ customer_id: 5, items: [] });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("POST /confirm — mengubah draft menjadi faktur", () => {
  it("membalas 201 dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(draft());
    repo.confirm.mockResolvedValue([{}, { id: 77, name: "INV-2024-12345678" }]);

    const res = await request(app(repo))
      .post("/confirm")
      .send({ id: 1, items: [], payment_methods: [] });

    expect(res.status).toBe(201);
    // Muatan socket adalah faktur yang baru lahir, bukan draftnya.
    expect(kirimSocket).toHaveBeenCalledWith("confirm-draft-bill", {
      id: 77,
      name: "INV-2024-12345678",
    });
  });

  it("meneruskan biaya layanan, ongkos kirim, dan diskon dari badan permintaan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(draft());
    repo.confirm.mockResolvedValue([{}, { id: 77 }]);

    await request(app(repo))
      .post("/confirm")
      .send({
        id: 1,
        service: 7500,
        delivery: 12500,
        discount: 2500,
        payment_methods: [{ payment_method_id: 1, amount: 20000 }],
        items: [],
        userId: 42,
      });

    const arg = repo.confirm.mock.calls[0][0];
    expect(arg.service).toBe(7500);
    expect(arg.delivery).toBe(12500);
    expect(arg.discount).toBe(2500);
    expect(arg.payment_methods).toEqual([
      { payment_method_id: 1, amount: 20000 },
    ]);
    expect(arg.userID).toBe(42);
  });

  it("memakai nama, tanggal, dan pelanggan dari draft yang tersimpan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(draft());
    repo.confirm.mockResolvedValue([{}, { id: 77 }]);

    await request(app(repo))
      .post("/confirm")
      .send({ id: 1, items: [], payment_methods: [] });

    const arg = repo.confirm.mock.calls[0][0];
    expect(arg.id).toBe(1);
    expect(arg.name).toBe("INV-2024-12345678");
    expect(arg.customer_id).toBe(5);
    expect(arg.date).toBeInstanceOf(Date);
    expect(arg.date.toISOString()).toBe("2024-05-01T00:00:00.000Z");
  });

  it("membalas 404 bila draft tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo))
      .post("/confirm")
      .send({ id: 1, items: [], payment_methods: [] });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.confirm).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  it("membalas 404 bila draft sudah dihapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(draft({ is_delete: true }));

    const res = await request(app(repo))
      .post("/confirm")
      .send({ id: 1, items: [], payment_methods: [] });

    expect(res.status).toBe(404);
    expect(repo.confirm).not.toHaveBeenCalled();
  });

  it("membalas 500 dan tidak mengirim socket bila confirm gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(draft());
    repo.confirm.mockRejectedValue(new Error("gagal simpan"));

    const res = await request(app(repo))
      .post("/confirm")
      .send({ id: 1, items: [], payment_methods: [] });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT PALING BERAT DI BERKAS INI: faktur hasil konfirmasi SELALU KOSONG.
   *
   * Handler menyusun `bills` dengan menelusuri `items` dari permintaan dan
   * mencocokkannya ke baris draft, tetapi seluruh badan perulangan yang
   * mengisi `bills` sudah dikomentari (src/controllers/draft-bill.controller.ts
   * baris 115-125). Yang tersisa hanya pencarian indeks yang hasilnya dibuang.
   * Jadi `items: []` selalu yang sampai ke repository.confirm.
   *
   * Akibatnya bagi pengguna: kasir mengumpulkan barang, menekan Konfirmasi,
   * lalu menerima faktur TANPA SATU BARIS BARANG PUN. Nilai faktur hanya
   * biaya layanan + ongkos kirim - diskon, sementara barangnya sudah diserahkan
   * ke pelanggan. Perusahaan menagih jauh di bawah nilai barang yang keluar,
   * dan stok maupun kartu stok tidak pernah menyesuaikan.
   *
   * Cacat ini DIKUNCI apa adanya: sengaja tidak diperbaiki di src/.
   */
  it("CACAT: daftar barang yang dikonfirmasi selalu kosong", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(draft());
    repo.confirm.mockResolvedValue([{}, { id: 77 }]);

    await request(app(repo))
      .post("/confirm")
      .send({
        id: 1,
        service: 0,
        delivery: 0,
        discount: 0,
        payment_methods: [],
        // Barang yang benar-benar ada di draft dan cocok product_unit_id-nya.
        items: [{ item_id: 10, product_unit_id: 2, quantity: 3 }],
      });

    expect(repo.confirm.mock.calls[0][0].items).toEqual([]);
  });

  /**
   * CACAT: balasan berisi DRAFT-nya, bukan faktur yang baru dibuat.
   *
   * `confirm` memberi dua nilai; yang kedua adalah faktur baru dan dipakai
   * untuk muatan socket. Tetapi balasan HTTP-nya justru mengirim `result`,
   * yaitu draft hasil fetchByID.
   *
   * Akibatnya bagi pengguna: setelah konfirmasi, frontend memegang id draft
   * dan bukan id faktur. Tombol "Cetak faktur" atau "Buka faktur" mengarah ke
   * dokumen yang salah, atau ke id yang tidak ada sama sekali.
   */
  it("CACAT: balasan 201 berisi draft, bukan faktur yang baru dibuat", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(draft());
    repo.confirm.mockResolvedValue([{}, { id: 77, name: "FAKTUR-BARU" }]);

    const res = await request(app(repo))
      .post("/confirm")
      .send({ id: 1, items: [], payment_methods: [] });

    expect(res.body.id).toBe(1);
    expect(res.body.name).toBe("INV-2024-12345678");
    expect(res.body.id).not.toBe(77);
  });

  /**
   * CACAT: draft yang SUDAH dikonfirmasi bisa dikonfirmasi lagi.
   *
   * Penjagaannya hanya "tidak ada" dan "sudah dihapus". Tidak ada pemeriksaan
   * apakah draft ini sudah pernah melahirkan faktur.
   *
   * Akibatnya bagi pengguna: satu klik ganda — atau satu permintaan yang
   * diulang karena jaringan lambat — menghasilkan DUA faktur untuk barang yang
   * sama. Pelanggan tertagih dua kali dan stok berkurang dua kali.
   */
  it("CACAT: draft yang sudah dikonfirmasi tetap diteruskan ke confirm", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(draft({ is_confirm: true }));
    repo.confirm.mockResolvedValue([{}, { id: 77 }]);

    const res = await request(app(repo))
      .post("/confirm")
      .send({ id: 1, items: [], payment_methods: [] });

    expect(res.status).toBe(201);
    expect(repo.confirm).toHaveBeenCalledTimes(1);
  });

  /**
   * CACAT: rantai fetchByID tidak punya .catch().
   *
   * `this.draftBillRepository.fetchByID(id).then(...)` berdiri sendiri tanpa
   * penanganan galat. Bila pencarian draft gagal — koneksi basis data putus
   * sesaat — penolakannya menjadi unhandled rejection: tidak ada balasan yang
   * dikirim, permintaannya MENGGANTUNG sampai klien menyerah, dan Node 15 ke
   * atas menghentikan seluruh proses.
   *
   * Jadi satu galat sesaat pada konfirmasi draft bukan berujung 500 bagi satu
   * kasir, melainkan mematikan server bagi semua orang.
   *
   * Diuji dengan memanggil handler langsung memakai promise tiruan yang
   * mencatat penangan apa saja yang dipasang controller. Memakai promise yang
   * benar-benar ditolak tidak bisa: penolakannya tidak tertangani siapa pun,
   * jadi ia bocor ke tes berikutnya persis seperti bocor ke proses sungguhan.
   */
  it("CACAT: fetchByID yang gagal tidak punya penangan galat sama sekali", async () => {
    const repo = repositoryTiruan();
    const argumenThen: unknown[][] = [];
    const rantai: { then: (...args: unknown[]) => unknown; catch: jest.Mock } =
      {
        then: (...args: unknown[]) => {
          argumenThen.push(args);
          return rantai;
        },
        catch: jest.fn(() => rantai),
      };
    repo.fetchByID.mockReturnValue(rantai);
    const c = new DraftBillController(repo as never);

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    c.confirmByID(
      { body: { id: 1, items: [], payment_methods: [] } } as never,
      res as never
    );

    // then() dipanggil sekali dan HANYA dengan penangan keberhasilan; tidak ada
    // argumen kedua dan tidak ada catch() di ujung rantai.
    expect(argumenThen).toHaveLength(1);
    expect(argumenThen[0]).toHaveLength(1);
    expect(rantai.catch).not.toHaveBeenCalled();
    // Tidak ada balasan yang pernah dikirim — itulah sebabnya permintaannya
    // menggantung alih-alih menerima 500.
    expect(res.status).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("POST /delete — menghapus draft", () => {
  it("membalas 201 dan mengabarkan penghapusan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.deleteByID.mockResolvedValue({ id: 1, is_delete: true });

    const res = await request(app(repo)).post("/delete").send({ id: 1 });

    expect(res.status).toBe(201);
    expect(repo.deleteByID).toHaveBeenCalledWith(1, 99);
    // Muatannya hanya id, bukan seluruh draft.
    expect(kirimSocket).toHaveBeenCalledWith("delete-draft-bill", { id: 1 });
  });

  it("membalas 500 dan tidak mengirim socket bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.deleteByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).post("/delete").send({ id: 1 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: penghapusan tidak memeriksa apa pun sebelum menghapus.
   *
   * Tidak ada pencarian draft lebih dulu, jadi tidak ada penolakan untuk draft
   * yang tidak ada, yang sudah dihapus, atau yang sudah dikonfirmasi menjadi
   * faktur. Apa pun yang dikembalikan repository dianggap berhasil dan
   * peristiwa socket tetap dikirim.
   *
   * Akibatnya bagi pengguna: draft yang sudah menjadi faktur bisa ditandai
   * terhapus, sehingga faktur yang sudah ditagihkan kehilangan dokumen asalnya.
   */
  it("CACAT: menghapus id yang tidak ada tetap dibalas 201 dan menyiarkan socket", async () => {
    const repo = repositoryTiruan();
    repo.deleteByID.mockResolvedValue({ id: undefined });

    const res = await request(app(repo)).post("/delete").send({ id: 99999 });

    expect(res.status).toBe(201);
    expect(kirimSocket).toHaveBeenCalledWith("delete-draft-bill", {
      id: undefined,
    });
  });
});

describe("GET /archives — tiga bentuk balasan", () => {
  it("tanpa tahun: mengubah count menjadi angka", async () => {
    const repo = repositoryTiruan();
    repo.fetchArchiveYears.mockResolvedValue([
      { year: 2024, count: "12" },
      { year: 2023, count: 5 },
    ]);

    const res = await request(app(repo)).get("/archives");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { year: 2024, count: 12 },
      { year: 2023, count: 5 },
    ]);
    expect(repo.fetchArchiveYears).toHaveBeenCalledWith(0);
  });

  it("dengan tahun saja: mengisi dua belas bulan, nol untuk bulan tanpa data", async () => {
    const repo = repositoryTiruan();
    repo.fetchArchiveMonths.mockResolvedValue([
      { month: 1, count: "3" },
      { month: 12, count: "7" },
    ]);

    const res = await request(app(repo)).get("/archives?year=2024&mode=1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7]);
    expect(repo.fetchArchiveMonths).toHaveBeenCalledWith(2024, 1);
  });

  it("dengan tahun dan bulan: memetakan data dan jumlah", async () => {
    const repo = repositoryTiruan();
    repo.fetchArchive.mockResolvedValue([
      [
        {
          id: 1,
          name: "INV-2024-1",
          created_at: "2024-05-01",
          is_delete: 0,
        },
        {
          id: 2,
          name: "INV-2024-2",
          created_at: "2024-05-02",
          is_delete: 1,
        },
      ],
      [{ count: "2" }],
    ]);

    const res = await request(app(repo)).get(
      "/archives?year=2024&month=5&page=3"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        { id: 1, name: "INV-2024-1", date: "2024-05-01", is_delete: false },
        { id: 2, name: "INV-2024-2", date: "2024-05-02", is_delete: true },
      ],
      count: 2,
    });
    expect(repo.fetchArchive).toHaveBeenCalledWith(2024, 5, 3, 0);
  });

  it("jumlah nol bila kueri hitungan tidak memberi baris", async () => {
    const repo = repositoryTiruan();
    repo.fetchArchive.mockResolvedValue([[], []]);

    const res = await request(app(repo)).get("/archives?year=2024&month=5");

    expect(res.body.count).toBe(0);
    // page bawaan 1 bila tidak dikirim.
    expect(repo.fetchArchive).toHaveBeenCalledWith(2024, 5, 1, 0);
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchArchiveYears.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/archives");
    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: cabang 404 "Parameter error" TIDAK PERNAH bisa tercapai.
   *
   * Ketiga cabang sebelumnya sudah menghabiskan semua kemungkinan: cabang
   * pertama menangkap seluruh permintaan tanpa `year`, dan dua cabang
   * berikutnya membagi sisanya berdasarkan ada tidaknya `month`. Baris
   * `else` di ujungnya adalah kode mati.
   *
   * Akibatnya bagi pengguna: bulan yang dikirim TANPA tahun tidak ditolak,
   * melainkan diam-diam dilayani sebagai permintaan daftar tahun. Pengguna
   * meminta arsip satu bulan dan menerima rekap seluruh tahun tanpa
   * penjelasan apa pun.
   */
  it("CACAT: bulan tanpa tahun dilayani sebagai daftar tahun, bukan ditolak", async () => {
    const repo = repositoryTiruan();
    repo.fetchArchiveYears.mockResolvedValue([{ year: 2024, count: "12" }]);

    const res = await request(app(repo)).get("/archives?month=5");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ year: 2024, count: 12 }]);
    expect(repo.fetchArchiveYears).toHaveBeenCalledWith(0);
    expect(res.text).not.toBe(ErrorList["Parameter error"]);
  });
});

describe("GET /name/:name dan GET /otc/:otc", () => {
  it("fetchByName meneruskan nama dari badan permintaan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByName.mockResolvedValue(draft());

    const res = await request(app(repo))
      .get("/name/INV-2024-12345678")
      .send({ name: "INV-2024-12345678" });

    expect(res.status).toBe(200);
    expect(repo.fetchByName).toHaveBeenCalledWith("INV-2024-12345678");
  });

  /**
   * CACAT: nama dibaca dari req.body, sedangkan rutenya GET /name/:name.
   *
   * Rutenya menaruh nama di parameter jalur, tetapi handler membacanya dari
   * badan permintaan. Permintaan GET biasanya tidak berbadan, jadi yang sampai
   * ke repository adalah undefined dan pencariannya selalu gagal menemukan
   * draft — berapa pun nama yang diketik pengguna.
   */
  it("CACAT: nama pada parameter jalur diabaikan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByName.mockResolvedValue(null);

    await request(app(repo)).get("/name/INV-2024-12345678");

    expect(repo.fetchByName).toHaveBeenCalledWith(undefined);
  });

  it("fetchByName membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByName.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/name/apa-saja");
    expect(res.status).toBe(500);
  });

  it("fetchByOTC mencari memakai tanggal hari ini", async () => {
    const repo = repositoryTiruan();
    repo.fetchByOTC.mockResolvedValue(draft());

    const res = await request(app(repo)).get("/otc/OTC-1");

    expect(res.status).toBe(200);
    const arg = repo.fetchByOTC.mock.calls[0][0];
    expect(arg.otc).toBe("OTC-1");
    expect(arg.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("fetchByOTC membalas 404 bila tidak ada draft berjalan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByOTC.mockResolvedValue(null);

    const res = await request(app(repo)).get("/otc/OTC-1");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  it("fetchByOTC membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByOTC.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/otc/OTC-1");
    expect(res.status).toBe(500);
  });
});
