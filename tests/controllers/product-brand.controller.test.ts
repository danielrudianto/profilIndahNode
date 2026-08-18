import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ProductBrandController.
 *
 * Bentuknya mengikuti tests/controllers/company.controller.test.ts: repository
 * ditiru dan disuntikkan lewat konstruktor, lalu handler dipanggil melalui app
 * express kecil.
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

import { ProductBrandController } from "../../src/controllers/product-brand.controller";

function repositoryTiruan() {
  return {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    fetch: jest.fn(),
    fetchByID: jest.fn(),
    fetchByName: jest.fn(),
    fetchAutocomplete: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo) {
  const c = new ProductBrandController(repo as never);
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

const merek = {
  id: 3,
  name: "Indah",
  is_delete: false,
  can_delete: true,
};

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST / — membuat merek", () => {
  it("membalas 201, mengirim hasil repository, dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByName.mockResolvedValue(null);
    repo.create.mockResolvedValue(merek);

    const res = await request(app(repo)).post("/").send({ name: "Indah" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(merek);
    expect(kirimSocket).toHaveBeenCalledWith("createBrand", merek);
  });

  it("memeriksa nama ganda lebih dulu, lalu meneruskan userId sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.fetchByName.mockResolvedValue(null);
    repo.create.mockResolvedValue(merek);

    await request(app(repo)).post("/").send({ name: "Indah", userId: 7 });

    expect(repo.fetchByName).toHaveBeenCalledWith("Indah");
    expect(repo.create).toHaveBeenCalledWith({
      name: "Indah",
      created_by: 7,
      created_at: expect.any(Date),
    });
  });

  it("membalas 400 bila nama merek sudah dipakai", async () => {
    const repo = repositoryTiruan();
    repo.fetchByName.mockResolvedValue(merek);

    const res = await request(app(repo)).post("/").send({ name: "Indah" });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Brand unique constraint"]);
    expect(repo.create).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT BERAT: create tidak punya penanganan galat sama sekali.
   *
   * Handler lain di berkas ini membungkus pemanggilan repository dengan
   * try/catch dan membalas 500 berisi key i18n. create tidak. Karena ia
   * `async`, penolakan dari repository menjadi promise yang ditolak dan tidak
   * ada yang menangkapnya — Express 4 tidak menangani penolakan promise, dan
   * Node 15 ke atas menghentikan proses pada unhandled rejection.
   *
   * Jadi satu galat basis data sesaat saat menyimpan merek tidak berujung 500
   * bagi satu pemanggil, melainkan MEMATIKAN SELURUH server.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu — persis yang dialami
   * pemanggil sungguhan sebelum prosesnya tumbang.
   */
  it("CACAT: create menolak tanpa membalas apa pun saat penyimpanan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByName.mockResolvedValue(null);
    repo.create.mockRejectedValue(new Error("koneksi putus"));
    const c = new ProductBrandController(repo as never);

    const req = { body: { name: "Indah", userId: 7 }, params: {}, query: {} };
    const res = resTiruan();

    await expect(c.create(req as never, res as never)).rejects.toThrow(
      "koneksi putus"
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /** Pemeriksaan nama ganda pun berada di luar try — galatnya sama fatalnya. */
  it("CACAT: create menolak tanpa membalas apa pun saat pemeriksaan nama gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByName.mockRejectedValue(new Error("koneksi putus"));
    const c = new ProductBrandController(repo as never);

    const req = { body: { name: "Indah", userId: 7 }, params: {}, query: {} };
    const res = resTiruan();

    await expect(c.create(req as never, res as never)).rejects.toThrow(
      "koneksi putus"
    );
    expect(repo.create).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("PUT / — mengubah merek", () => {
  it("membalas 201 dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(merek);
    repo.update.mockResolvedValue({ ...merek, name: "Indah Jaya" });

    const res = await request(app(repo))
      .put("/")
      .send({ id: 3, name: "Indah Jaya" });

    expect(res.status).toBe(201);
    expect(kirimSocket).toHaveBeenCalledWith(
      "updateBrand",
      expect.objectContaining({ name: "Indah Jaya" })
    );
  });

  it("meneruskan id, nama, dan userId sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(merek);
    repo.update.mockResolvedValue(merek);

    await request(app(repo))
      .put("/")
      .send({ id: 3, name: "Indah Jaya", userId: 7 });

    expect(repo.update).toHaveBeenCalledWith({
      id: 3,
      name: "Indah Jaya",
      created_by: 7,
      created_at: expect.any(Date),
    });
  });

  /**
   * CACAT: merek yang tidak ada dibalas 400, bukan 404.
   *
   * Handler delete pada berkas yang sama memakai 404 untuk keadaan yang persis
   * sama, bahkan dengan pesan ErrorList["Not found"] yang sama. Frontend yang
   * memetakan 404 menjadi "data tidak ditemukan" akan menampilkan 400 sebagai
   * galat generik "permintaan tidak valid", sehingga pengguna tidak paham
   * bahwa merek yang ia sunting sudah dihapus orang lain.
   */
  it.each([
    ["tidak ada", null],
    ["sudah terhapus", { ...merek, is_delete: true }],
  ])(
    "CACAT: merek %s dibalas 400, padahal delete memakai 404",
    async (_nama, hasil) => {
      const repo = repositoryTiruan();
      repo.fetchByID.mockResolvedValue(hasil);

      const res = await request(app(repo)).put("/").send({ id: 3, name: "X" });

      expect(res.status).toBe(400);
      expect(res.text).toBe(ErrorList["Not found"]);
      expect(repo.update).not.toHaveBeenCalled();
      expect(kirimSocket).not.toHaveBeenCalled();
    }
  );

  /**
   * CACAT: update tidak memeriksa nama ganda.
   *
   * create menolak nama yang sudah dipakai dengan 400 dan
   * ErrorList["Brand unique constraint"], tetapi update tidak memanggil
   * fetchByName sama sekali. Aturan "nama merek harus unik" karena itu bisa
   * ditembus lewat jalur belakang: buat merek dengan nama lain, lalu ubah
   * namanya menjadi nama yang sudah ada.
   *
   * Akibatnya daftar merek memuat dua baris bernama sama, dan pengguna yang
   * memilih merek pada produk tidak punya cara membedakan keduanya — laporan
   * penjualan per merek ikut terpecah menjadi dua baris identik.
   */
  it("CACAT: update membiarkan nama merek menjadi ganda", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...merek, id: 9, name: "Lama" });
    repo.update.mockResolvedValue({ ...merek, id: 9, name: "Indah" });

    const res = await request(app(repo))
      .put("/")
      .send({ id: 9, name: "Indah" });

    expect(res.status).toBe(201);
    expect(repo.fetchByName).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Indah" })
    );
  });

  /**
   * CACAT: setiap penyuntingan menimpa jejak pembuatan.
   *
   * created_by diisi userId PENYUNTING dan created_at diisi waktu SEKARANG,
   * sehingga catatan siapa yang mendaftarkan merek dan kapan hilang permanen
   * setelah satu kali koreksi nama.
   */
  it("CACAT: update menimpa created_by dan created_at", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(merek);
    repo.update.mockResolvedValue(merek);

    await request(app(repo))
      .put("/")
      .send({ id: 3, name: "Indah Jaya", userId: 55 });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 55, created_at: expect.any(Date) })
    );
  });

  it("membalas 500 dan tidak mengirim socket bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(merek);
    repo.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send({ id: 3, name: "X" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus dan mengabarkan lewat socket bila boleh", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(merek);
    repo.delete.mockResolvedValue({ ...merek, is_delete: true });

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(201);
    expect(repo.fetchByID).toHaveBeenCalledWith(3);
    expect(repo.delete).toHaveBeenCalledWith(3, 99);
    expect(kirimSocket).toHaveBeenCalledWith(
      "deleteBrand",
      expect.objectContaining({ is_delete: true })
    );
  });

  it("membalas 404 bila merek tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 404 bila merek sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...merek, is_delete: true });

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(404);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 400 bila merek masih dipakai produk", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...merek, can_delete: false });

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Unable to delete"]);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  it("membalas 500 bila penghapusan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(merek);
    repo.delete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("GET / — daftar dan pencarian", () => {
  it("menerjemahkan halaman, kata kunci, dan ukuran halaman", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=2&keyword=indah&pageSize=25");

    expect(repo.fetch).toHaveBeenCalledWith({
      keyword: "indah",
      page: 2,
      pageSize: 25,
    });
  });

  it("memakai nilai bawaan bila parameternya tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=0&pageSize=0");

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
  it("fetchByID membalas 200 dan meneruskan id sebagai angka", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(merek);

    const res = await request(app(repo)).get("/3");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(merek);
    expect(repo.fetchByID).toHaveBeenCalledWith(3);
  });

  /**
   * CACAT: fetchByID membalas 200 dengan badan KOSONG untuk merek yang tidak
   * ada.
   *
   * Semua handler pembacaan tunggal lain — payment method, product type,
   * expense type, customer — membalas 404 dan ErrorList["Not found"] bila
   * repository mengembalikan null. Di sini nilai null diteruskan begitu saja
   * ke res.send().
   *
   * Akibatnya frontend menganggap permintaannya BERHASIL lalu mencoba membaca
   * properti dari data kosong: formulir sunting merek terbuka dalam keadaan
   * blank, atau halamannya galat, alih-alih menampilkan pesan "merek tidak
   * ditemukan" yang jelas.
   */
  it("CACAT: fetchByID membalas 200 kosong, bukan 404, saat merek tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/3");

    expect(res.status).toBe(200);
    expect(res.text).toBe("");
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/3");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchAutocomplete meneruskan kata kunci yang sudah diterjemahkan", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockResolvedValue([]);

    await request(app(repo)).get("/autocomplete?keyword=ind");

    expect(repo.fetchAutocomplete).toHaveBeenCalledWith("ind");
  });

  it("fetchAutocomplete membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/autocomplete?keyword=ind");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});
