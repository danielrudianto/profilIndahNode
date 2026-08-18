import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ProductTypeController (jenis barang).
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

import { ProductTypeController } from "../../src/controllers/product-type.controller";

function repositoryTiruan() {
  return {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    fetch: jest.fn(),
    fetchAll: jest.fn(),
    fetchByID: jest.fn(),
    fetchAutocomplete: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo) {
  const c = new ProductTypeController(repo as never);
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
  a.get("/all", c.fetchAll);
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  return a;
}

const jenis = {
  id: 6,
  name: "Besi Beton",
  is_delete: false,
  can_delete: true,
};

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST / — membuat jenis barang", () => {
  it("membalas 201, mengirim hasil repository, dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(jenis);

    const res = await request(app(repo)).post("/").send({ name: "Besi Beton" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(jenis);
    // Nama peristiwanya "createItemType", bukan "createProductType".
    expect(kirimSocket).toHaveBeenCalledWith("createItemType", jenis);
  });

  it("meneruskan nama dan userId sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(jenis);

    await request(app(repo)).post("/").send({ name: "Besi Beton", userId: 7 });

    expect(repo.create).toHaveBeenCalledWith({
      name: "Besi Beton",
      created_by: 7,
      created_at: expect.any(Date),
    });
  });

  it("membalas 500 dan tidak mengirim socket bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).post("/").send({ name: "Besi Beton" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: create tidak memeriksa nama ganda.
   *
   * ProductBrandController memanggil fetchByName lebih dulu dan menolak nama
   * merek yang sudah dipakai. Jenis barang tidak punya penjagaan apa pun,
   * sehingga daftar jenis barang bisa memuat beberapa baris bernama sama.
   * Pengguna yang memilih jenis pada produk tidak punya cara membedakannya,
   * dan laporan stok per jenis terpecah menjadi beberapa baris identik.
   */
  it("CACAT: create menyimpan nama ganda tanpa pemeriksaan", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(jenis);

    const res = await request(app(repo)).post("/").send({ name: "Besi Beton" });

    expect(res.status).toBe(201);
    expect(repo.fetchByID).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledTimes(1);
  });
});

describe("PUT / — mengubah jenis barang", () => {
  it("membalas 201 dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue({ ...jenis, name: "Besi Siku" });

    const res = await request(app(repo))
      .put("/")
      .send({ id: 6, name: "Besi Siku" });

    expect(res.status).toBe(201);
    expect(kirimSocket).toHaveBeenCalledWith(
      "updateItemType",
      expect.objectContaining({ name: "Besi Siku" })
    );
  });

  it("meneruskan id, nama, dan userId sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(jenis);

    await request(app(repo))
      .put("/")
      .send({ id: 6, name: "Besi Siku", userId: 7 });

    expect(repo.update).toHaveBeenCalledWith({
      id: 6,
      name: "Besi Siku",
      created_by: 7,
      created_at: expect.any(Date),
    });
  });

  /**
   * CACAT: update tidak memeriksa keberadaan sama sekali.
   *
   * delete dan fetchByID di berkas ini memanggil fetchByID lebih dulu dan
   * membalas 404 untuk jenis yang tidak ada atau sudah dihapus. update
   * langsung menembak repository.
   *
   * Akibatnya penyuntingan jenis barang yang sudah dihapus rekan kerja tetap
   * dilaporkan BERHASIL — lengkap dengan peristiwa socket "updateItemType"
   * yang menyebarkan data jenis terhapus itu ke layar semua orang. Pengguna
   * mengira perubahannya tersimpan, padahal barisnya tidak muncul di daftar
   * mana pun.
   */
  it("CACAT: update tidak pernah membalas 404 karena tidak memeriksa keberadaan", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue({ ...jenis, id: 999999 });

    const res = await request(app(repo))
      .put("/")
      .send({ id: 999999, name: "Tidak Ada" });

    expect(res.status).toBe(201);
    expect(repo.fetchByID).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 999999 })
    );
    expect(kirimSocket).toHaveBeenCalledWith(
      "updateItemType",
      expect.anything()
    );
  });

  /**
   * CACAT: setiap penyuntingan menimpa jejak pembuatan.
   *
   * created_by diisi userId PENYUNTING dan created_at diisi waktu SEKARANG,
   * sehingga catatan siapa yang mendaftarkan jenis barang dan kapan hilang
   * permanen setelah satu kali koreksi nama.
   */
  it("CACAT: update menimpa created_by dan created_at", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(jenis);

    await request(app(repo))
      .put("/")
      .send({ id: 6, name: "Besi Siku", userId: 55 });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 55, created_at: expect.any(Date) })
    );
  });

  it("membalas 500 dan tidak mengirim socket bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send({ id: 6, name: "X" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus dan mengabarkan lewat socket bila jenis masih aktif", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(jenis);
    repo.delete.mockResolvedValue({ ...jenis, is_delete: true });

    const res = await request(app(repo)).delete("/6");

    expect(res.status).toBe(201);
    expect(repo.delete).toHaveBeenCalledWith(6, 99);
    expect(kirimSocket).toHaveBeenCalledWith(
      "deleteItemType",
      expect.objectContaining({ is_delete: true })
    );
  });

  it("membalas 404 bila jenis tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/6");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 404 bila jenis sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...jenis, is_delete: true });

    const res = await request(app(repo)).delete("/6");

    expect(res.status).toBe(404);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  it("membalas 500 dan tidak mengirim socket bila penghapusan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(jenis);
    repo.delete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).delete("/6");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: delete mengabaikan can_delete.
   *
   * Repository menghitung can_delete dari jumlah produk yang memakai jenis
   * tersebut, dan ProductBrandController menolak dengan 400 dan
   * ErrorList["Unable to delete"] bila nilainya false. Jenis barang tidak
   * memeriksanya sama sekali.
   *
   * Akibatnya jenis barang yang MASIH DIPAKAI ratusan produk bisa dihapus.
   * Produk-produk itu kehilangan acuan jenisnya, dan penyaringan serta laporan
   * stok per jenis tidak lagi menemukan mereka.
   */
  it("CACAT: delete tetap menghapus jenis yang masih dipakai produk", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...jenis, can_delete: false });
    repo.delete.mockResolvedValue({ ...jenis, is_delete: true });

    const res = await request(app(repo)).delete("/6");

    expect(res.status).toBe(201);
    expect(repo.delete).toHaveBeenCalledWith(6, 99);
  });

  it("meneruskan userId sebagai angka ke repository", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(jenis);
    repo.delete.mockResolvedValue(jenis);

    // Handler membungkus userId dengan Number(), berbeda dari controller lain
    // yang meneruskannya apa adanya.
    const a = express();
    a.use(express.json());
    a.use((req, _res, next) => {
      req.body.userId = "42";
      next();
    });
    a.delete("/:id", new ProductTypeController(repo as never).delete);

    await request(a).delete("/6").send({});

    expect(repo.delete).toHaveBeenCalledWith(6, 42);
  });
});

describe("GET / — daftar dan pencarian", () => {
  it("menerjemahkan halaman, kata kunci, dan ukuran halaman", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=4&keyword=besi&pageSize=20");

    expect(repo.fetch).toHaveBeenCalledWith({
      keyword: "besi",
      page: 4,
      pageSize: 20,
    });
  });

  it("memakai nilai bawaan bila parameternya tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=abc&pageSize=101");

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

describe("GET /all, /:id, dan /autocomplete", () => {
  it("fetchAll meneruskan hasil repository apa adanya", async () => {
    const repo = repositoryTiruan();
    repo.fetchAll.mockResolvedValue([jenis]);

    const res = await request(app(repo)).get("/all");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([jenis]);
  });

  it("fetchAll membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchAll.mockRejectedValue(new Error("gagal"));

    expect((await request(app(repo)).get("/all")).status).toBe(500);
  });

  it("fetchByID membalas 200 dan meneruskan id sebagai angka", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(jenis);

    const res = await request(app(repo)).get("/6");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(jenis);
    expect(repo.fetchByID).toHaveBeenCalledWith(6);
  });

  it("fetchByID membalas 404 bila jenis tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/6");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  it("fetchByID membalas 404 bila jenis sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...jenis, is_delete: true });

    const res = await request(app(repo)).get("/6");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/6");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchAutocomplete meneruskan kata kunci yang sudah diterjemahkan", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockResolvedValue([]);

    await request(app(repo)).get("/autocomplete?keyword=bes");

    expect(repo.fetchAutocomplete).toHaveBeenCalledWith("bes");
  });

  it("fetchAutocomplete membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/autocomplete?keyword=bes");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});
