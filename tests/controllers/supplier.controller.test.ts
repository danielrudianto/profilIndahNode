import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku SupplierController.
 *
 * Bentuknya mengikuti tests/controllers/company.controller.test.ts. Bedanya,
 * controller ini menerima DUA repository: supplier dan good receipt. Yang
 * kedua dipakai untuk memutuskan apakah sebuah pemasok masih boleh dihapus,
 * jadi keduanya ditiru dan disuntikkan lewat konstruktor.
 *
 * SocketHelper ikut ditiru karena aslinya memanggil getIO() yang MELEMPAR bila
 * initIO belum pernah dipanggil.
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

import SupplierController from "../../src/controllers/supplier.controller";

function repositoryTiruan() {
  return {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    fetch: jest.fn(),
    fetchByID: jest.fn(),
    fetchAutocomplete: jest.fn(),
  };
}

/** Hanya method yang benar-benar dipakai controller yang perlu ditiru. */
function goodReceiptTiruan() {
  return {
    countBySupplierID: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;
type GrRepo = ReturnType<typeof goodReceiptTiruan>;

function app(repo: Repo, gr: GrRepo = goodReceiptTiruan()) {
  const c = new SupplierController(repo as never, gr as never);
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
  a.delete("/:id", c.delete);
  a.get("/autocomplete", c.fetchAutocomplete);
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  return a;
}

/** Balasan res tiruan untuk memanggil handler langsung tanpa lewat HTTP. */
function resTiruan() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
}

const pemasok = {
  id: 8,
  name: "CV Sumber",
  address: "Jl. Pabrik 3",
  npwp: "123456789012345",
  is_delete: false,
  can_delete: true,
};

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST / — membuat pemasok", () => {
  it("membalas 201, mengirim hasil repository, dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pemasok);

    const res = await request(app(repo)).post("/").send({
      name: "CV Sumber",
      address: "Jl. Pabrik 3",
      npwp: "123456789012345",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(pemasok);
    expect(kirimSocket).toHaveBeenCalledWith("createSupplier", pemasok);
  });

  it("meneruskan isian dan userId sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pemasok);

    await request(app(repo)).post("/").send({
      name: "CV Sumber",
      address: "Jl. Pabrik 3",
      npwp: "123456789012345",
      userId: 7,
    });

    expect(repo.create).toHaveBeenCalledWith({
      name: "CV Sumber",
      address: "Jl. Pabrik 3",
      npwp: "123456789012345",
      created_by: 7,
      created_at: expect.any(Date),
    });
  });

  /**
   * CACAT: create menolak NPWP 16 digit, padahal update menerimanya.
   *
   * Syaratnya ditulis tangan sebagai `length == 15`, sementara update memakai
   * translateNPWP yang menerima 15 MAUPUN 16 digit. NPWP badan usaha kini
   * berbentuk 16 digit. Akibatnya pemasok baru yang diisi NPWP 16 digit
   * tersimpan dengan npwp KOSONG tanpa peringatan apa pun — pengguna mengira
   * datanya masuk, lalu faktur pajak untuk pemasok itu terbit tanpa NPWP.
   */
  it.each([
    ["15 digit diterima", "123456789012345", "123456789012345"],
    ["16 digit justru dibuang", "1234567890123456", null],
    ["panjang lain dibuang", "12345", null],
  ])("CACAT: npwp %s pada create", async (_nama, masukan, harapan) => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pemasok);

    await request(app(repo))
      .post("/")
      .send({ name: "CV Sumber", address: "Jl. A", npwp: masukan });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ npwp: harapan })
    );
  });

  /**
   * CACAT BERAT: create tidak punya penanganan galat sama sekali.
   *
   * Semua handler lain di berkas ini membungkus pemanggilan repository dengan
   * try/catch dan membalas 500 berisi key i18n. create tidak. Karena ia
   * `async`, penolakan dari repository menjadi promise yang ditolak dan tidak
   * ada yang menangkapnya — Express 4 tidak menangani penolakan promise, dan
   * Node 15 ke atas menghentikan proses pada unhandled rejection.
   *
   * Jadi satu galat basis data sesaat saat menyimpan pemasok tidak berujung
   * 500 bagi satu pemanggil, melainkan MEMATIKAN SELURUH server: semua kasir
   * yang sedang bekerja ikut terputus.
   *
   * Diuji dengan memanggil handler langsung, sebab lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu.
   */
  it("CACAT: create menolak tanpa membalas apa pun saat repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.create.mockRejectedValue(new Error("koneksi putus"));
    const c = new SupplierController(
      repo as never,
      goodReceiptTiruan() as never
    );

    const req = {
      body: { name: "CV Sumber", address: "Jl. A", npwp: "123456789012345" },
      params: {},
      query: {},
    } as never;
    const res = resTiruan();

    await expect(c.create(req, res as never)).rejects.toThrow("koneksi putus");
    expect(res.status).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT BERAT: create membaca req.body.npwp.toString() tanpa memeriksa
   * apakah npwp diisi.
   *
   * NPWP bersifat opsional pada pemasok — customer dan company memakai
   * translateNPWP yang aman terhadap nilai kosong. Di sini, permintaan yang
   * tidak menyertakan npwp langsung melempar TypeError SEBELUM repository
   * disentuh. Karena handler-nya async tanpa try/catch, lemparannya kembali
   * menjadi unhandled rejection yang menghentikan server.
   *
   * Artinya siapa pun yang bisa memanggil endpoint ini dapat mematikan
   * backend hanya dengan mengirim pemasok tanpa NPWP.
   */
  it("CACAT: create melempar TypeError bila npwp tidak diisi", async () => {
    const repo = repositoryTiruan();
    const c = new SupplierController(
      repo as never,
      goodReceiptTiruan() as never
    );

    const req = {
      body: { name: "CV Sumber", address: "Jl. A" },
      params: {},
      query: {},
    } as never;
    const res = resTiruan();

    await expect(c.create(req, res as never)).rejects.toThrow(TypeError);
    // Repository tidak pernah dipanggil: permintaannya mati sebelum menyimpan.
    expect(repo.create).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("PUT / — mengubah pemasok", () => {
  it("membalas 200 dan meneruskan id sebagai angka", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(pemasok);

    const res = await request(app(repo)).put("/").send({
      id: "8",
      name: "CV Sumber Jaya",
      address: "Jl. Pabrik 3",
      npwp: "1234567890123456",
      userId: 7,
    });

    expect(res.status).toBe(200);
    expect(repo.update).toHaveBeenCalledWith({
      id: 8,
      name: "CV Sumber Jaya",
      address: "Jl. Pabrik 3",
      npwp: "1234567890123456",
      created_by: 7,
      created_at: expect.any(Date),
    });
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send({ id: 8, name: "X" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: update tidak memeriksa apakah pemasoknya ada atau sudah dihapus.
   *
   * delete memanggil fetchByID lebih dulu dan membalas 404; update langsung
   * menembak repository. Akibatnya penyuntingan pemasok yang sudah dihapus
   * rekan kerja tetap dilaporkan BERHASIL kepada pengguna, padahal barisnya
   * tidak lagi muncul di daftar mana pun — perubahan yang ia ketik hilang
   * tanpa jejak, dan id yang tidak ada pun tetap dibalas 200.
   */
  it("CACAT: update tidak pernah membalas 404 karena tidak memeriksa keberadaan", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(pemasok);

    const res = await request(app(repo))
      .put("/")
      .send({ id: 999999, name: "Tidak Ada" });

    expect(res.status).toBe(200);
    expect(repo.fetchByID).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 999999 })
    );
  });

  /**
   * CACAT: perubahan pemasok tidak dikabarkan lewat socket.
   *
   * create dan delete keduanya mengirim peristiwa socket, update tidak.
   * Akibatnya nama atau alamat pemasok yang baru diperbaiki tidak menyebar ke
   * layar pengguna lain: penerimaan barang yang sedang dibuat rekan kerja
   * masih memakai alamat lama sampai halamannya disegarkan manual.
   */
  it("CACAT: update tidak mengirim peristiwa socket", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(pemasok);

    await request(app(repo)).put("/").send({ id: 8, name: "CV Sumber Jaya" });

    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: setiap penyuntingan menimpa jejak pembuatan.
   *
   * created_by diisi userId PENYUNTING dan created_at diisi waktu SEKARANG.
   * Kolom itu seharusnya merekam siapa yang mendaftarkan pemasok dan kapan.
   * Setelah satu kali koreksi alamat, riwayat pendaftaran hilang permanen.
   */
  it("CACAT: update menimpa created_by dan created_at", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(pemasok);

    await request(app(repo))
      .put("/")
      .send({ id: 8, name: "CV Sumber Jaya", userId: 55 });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 55, created_at: expect.any(Date) })
    );
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus dan mengabarkan lewat socket bila belum pernah dipakai", async () => {
    const repo = repositoryTiruan();
    const gr = goodReceiptTiruan();
    repo.fetchByID.mockResolvedValue(pemasok);
    gr.countBySupplierID.mockResolvedValue(0);
    repo.delete.mockResolvedValue({ ...pemasok, is_delete: true });

    const res = await request(app(repo, gr)).delete("/8");

    expect(res.status).toBe(201);
    expect(gr.countBySupplierID).toHaveBeenCalledWith(8);
    expect(repo.delete).toHaveBeenCalledWith(8, 99);
    expect(kirimSocket).toHaveBeenCalledWith(
      "deleteSupplier",
      expect.objectContaining({ is_delete: true })
    );
  });

  /**
   * CACAT: penghapusan yang berhasil dibalas 201 Created.
   *
   * 201 berarti "sumber daya baru dibuat" — di sini justru sebaliknya. Klien
   * yang memakai pustaka HTTP dengan aturan ketat, atau cache perantara yang
   * memperlakukan 201 secara khusus, bisa salah menyimpulkan hasilnya. Bandingkan
   * dengan delete pada customer dan company yang memakai 200.
   */
  it("CACAT: delete berhasil memakai status 201, bukan 200", async () => {
    const repo = repositoryTiruan();
    const gr = goodReceiptTiruan();
    repo.fetchByID.mockResolvedValue(pemasok);
    gr.countBySupplierID.mockResolvedValue(0);
    repo.delete.mockResolvedValue(pemasok);

    expect((await request(app(repo, gr)).delete("/8")).status).toBe(201);
  });

  it("membalas 404 bila pemasok tidak ada", async () => {
    const repo = repositoryTiruan();
    const gr = goodReceiptTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo, gr)).delete("/8");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(gr.countBySupplierID).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 404 bila pemasok sudah terhapus", async () => {
    const repo = repositoryTiruan();
    const gr = goodReceiptTiruan();
    repo.fetchByID.mockResolvedValue({ ...pemasok, is_delete: true });

    const res = await request(app(repo, gr)).delete("/8");

    expect(res.status).toBe(404);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 400 bila pemasok sudah dipakai penerimaan barang", async () => {
    const repo = repositoryTiruan();
    const gr = goodReceiptTiruan();
    repo.fetchByID.mockResolvedValue(pemasok);
    gr.countBySupplierID.mockResolvedValue(3);

    const res = await request(app(repo, gr)).delete("/8");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Supplier has been used"]);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  it("membalas 500 dan tidak mengirim socket bila penghapusan gagal", async () => {
    const repo = repositoryTiruan();
    const gr = goodReceiptTiruan();
    repo.fetchByID.mockResolvedValue(pemasok);
    gr.countBySupplierID.mockResolvedValue(0);
    repo.delete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo, gr)).delete("/8");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("GET / — daftar dan pencarian", () => {
  it("menerjemahkan halaman, kata kunci, dan ukuran halaman", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=2&keyword=sumber&pageSize=50");

    expect(repo.fetch).toHaveBeenCalledWith({
      keyword: "sumber",
      page: 2,
      pageSize: 50,
    });
  });

  it("memakai nilai bawaan bila parameternya tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=-5&pageSize=abc");

    expect(repo.fetch).toHaveBeenCalledWith({
      keyword: "",
      page: 1,
      pageSize: 10,
    });
  });

  it("kata kunci berisi persen tetap dicari, tidak menggagalkan permintaan", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(repo)).get("/?keyword=%25");

    expect(res.status).toBe(200);
    expect(repo.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "%" })
    );
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockRejectedValue(new Error("gagal"));

    expect((await request(app(repo)).get("/")).status).toBe(500);
  });
});

describe("GET /:id dan /autocomplete", () => {
  it("fetchByID menghitung can_delete dari jumlah penerimaan barang", async () => {
    const repo = repositoryTiruan();
    const gr = goodReceiptTiruan();
    repo.fetchByID.mockResolvedValue({ ...pemasok });
    gr.countBySupplierID.mockResolvedValue(0);

    const res = await request(app(repo, gr)).get("/8");

    expect(res.status).toBe(200);
    expect(res.body.can_delete).toBe(true);
  });

  it("fetchByID menandai tidak boleh dihapus bila sudah dipakai", async () => {
    const repo = repositoryTiruan();
    const gr = goodReceiptTiruan();
    repo.fetchByID.mockResolvedValue({ ...pemasok });
    gr.countBySupplierID.mockResolvedValue(2);

    const res = await request(app(repo, gr)).get("/8");

    expect(res.body.can_delete).toBe(false);
  });

  it("fetchByID membalas 404 bila pemasok tidak ada", async () => {
    const repo = repositoryTiruan();
    const gr = goodReceiptTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo, gr)).get("/8");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(gr.countBySupplierID).not.toHaveBeenCalled();
  });

  /**
   * CACAT: fetchByID tetap membalas 200 untuk pemasok yang sudah dihapus.
   *
   * delete menolak pemasok ber-is_delete, tetapi pembacaan tunggal tidak
   * memeriksanya. Pemasok yang sudah dihapus masih bisa dibuka lewat tautan
   * langsung dan halamannya tampil normal, sehingga pengguna bisa
   * memilihnya sebagai acuan padahal data itu sudah dianggap tidak ada.
   */
  it("CACAT: fetchByID membalas 200 untuk pemasok yang sudah terhapus", async () => {
    const repo = repositoryTiruan();
    const gr = goodReceiptTiruan();
    repo.fetchByID.mockResolvedValue({ ...pemasok, is_delete: true });
    gr.countBySupplierID.mockResolvedValue(0);

    const res = await request(app(repo, gr)).get("/8");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ is_delete: true }));
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/8");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchAutocomplete meneruskan kata kunci yang sudah diterjemahkan", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockResolvedValue([]);

    await request(app(repo)).get("/autocomplete?keyword=sum");

    expect(repo.fetchAutocomplete).toHaveBeenCalledWith("sum");
  });

  it("fetchAutocomplete membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/autocomplete?keyword=sum");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});
