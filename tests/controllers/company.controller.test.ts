import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku CompanyController.
 *
 * Controller di repo ini tidak menyentuh basis data langsung: ia menerima
 * repository lewat konstruktor. Karena itu ia bisa diuji utuh dengan
 * repository tiruan — yang diperiksa adalah keputusan controller-nya, bukan
 * kuerinya:
 *
 *   status HTTP mana yang dipilih untuk tiap keadaan,
 *   nilai apa yang diteruskan ke repository,
 *   dan kapan peristiwa socket dikirim.
 *
 * SocketHelper ikut ditiru. Aslinya ia memanggil getIO(), yang MELEMPAR bila
 * initIO belum dipanggil — dan di dalam tes memang tidak pernah dipanggil.
 * Tanpa tiruan, setiap handler yang berhasil justru berakhir sebagai galat.
 *
 * Berkas ini dipakai sebagai acuan bentuk untuk tes controller lainnya.
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

import CompanyController from "../../src/controllers/company.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
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
  const c = new CompanyController(repo as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
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

const perusahaan = {
  id: 4,
  name: "PT Indah",
  address: "Jl. Industri 1",
  npwp: "123456789012345",
  is_delete: false,
  can_delete: true,
};

beforeEach(() => {
  kirimSocket.mockClear();
  process.env.LIMIT = "10";
});

describe("POST / — membuat perusahaan", () => {
  it("membalas 201 dan mengirim hasil repository", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(perusahaan);

    const res = await request(app(repo)).post("/").send({
      name: "PT Indah",
      address: "Jl. Industri 1",
      npwp: "123456789012345",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(perusahaan);
  });

  it("meneruskan userId dari middleware sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(perusahaan);

    await request(app(repo))
      .post("/")
      .send({ name: "PT Indah", address: "Jl. A", userId: 7 });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 7 })
    );
  });

  it("mengabarkan pembuatan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(perusahaan);

    await request(app(repo))
      .post("/")
      .send({ name: "PT Indah", address: "Jl. A" });

    expect(kirimSocket).toHaveBeenCalledWith("createCompany", perusahaan);
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .post("/")
      .send({ name: "PT Indah", address: "Jl. A" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  describe("penyaringan NPWP", () => {
    it.each([
      ["15 digit diterima", "123456789012345", "123456789012345"],
      ["16 digit diterima", "1234567890123456", "1234567890123456"],
      ["panjang lain dibuang", "12345", null],
      ["null tetap null", null, null],
    ])("%s", async (_nama, masukan, harapan) => {
      const repo = repositoryTiruan();
      repo.create.mockResolvedValue(perusahaan);

      await request(app(repo))
        .post("/")
        .send({ name: "PT Indah", address: "Jl. A", npwp: masukan });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ npwp: harapan })
      );
    });
  });
});

describe("PUT / — mengubah perusahaan", () => {
  it("membalas 201 dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(perusahaan);

    const res = await request(app(repo))
      .put("/")
      .send({ id: 4, name: "PT Indah", address: "Jl. B" });

    expect(res.status).toBe(201);
    expect(kirimSocket).toHaveBeenCalledWith("updateCompany", perusahaan);
  });

  /**
   * Syaratnya dulu ditulis `panjang != 15 || panjang != 16`, yang selalu benar
   * karena satu bilangan tidak mungkin sekaligus bukan 15 dan bukan 16.
   * Akibatnya npwp SELALU dibuang: mengubah nama atau alamat perusahaan ikut
   * menghapus NPWP-nya tanpa peringatan apa pun. Kini sama dengan create.
   */
  it.each([
    ["15 digit dipertahankan", "123456789012345", "123456789012345"],
    ["16 digit dipertahankan", "1234567890123456", "1234567890123456"],
    ["panjang lain dibuang", "12345", null],
    ["null tetap null", null, null],
  ])("npwp %s", async (_nama, masukan, harapan) => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(perusahaan);

    await request(app(repo))
      .put("/")
      .send({ id: 4, name: "PT Indah", address: "Jl. B", npwp: masukan });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ npwp: harapan })
    );
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo))
      .put("/")
      .send({ id: 4, name: "A", address: "B" });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus dan mengabarkan lewat socket bila boleh", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(perusahaan);
    repo.delete.mockResolvedValue({ ...perusahaan, is_delete: true });

    const res = await request(app(repo)).delete("/4");

    expect(res.status).toBe(200);
    expect(repo.delete).toHaveBeenCalledWith(4, 99);
    expect(kirimSocket).toHaveBeenCalledWith(
      "deleteCompany",
      expect.objectContaining({ is_delete: true })
    );
  });

  it("membalas 404 bila perusahaan tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/4");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 404 bila perusahaan sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...perusahaan, is_delete: true });

    const res = await request(app(repo)).delete("/4");

    expect(res.status).toBe(404);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  /**
   * Perusahaan yang sudah dipakai transaksi tidak boleh dihapus. Pesannya
   * berbeda dari dua keadaan di atas, tetapi statusnya sama-sama 404 —
   * padahal ini penolakan aturan bisnis, bukan "tidak ditemukan". Perilaku
   * itu dipertahankan apa adanya; menaikkannya ke 409 akan mengubah cara
   * frontend membedakan keduanya.
   */
  it("membalas 404 dengan pesan berbeda bila tidak boleh dihapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...perusahaan, can_delete: false });

    const res = await request(app(repo)).delete("/4");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Unable to delete"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

describe("GET / — daftar", () => {
  it("menerjemahkan halaman dan kata kunci sebelum meneruskannya", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=3&keyword=indah");

    expect(repo.fetch).toHaveBeenCalledWith({
      keyword: "indah",
      page: 3,
      pageSize: 10,
    });
  });

  it("memakai halaman 1 bila parameternya tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=abc");

    expect(repo.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, keyword: "" })
    );
  });

  /**
   * Kata kunci berisi "%" dulu MEMATIKAN PROSES: translateKeyword melempar
   * URIError di luar blok try, lemparannya menjadi promise yang ditolak, dan
   * Node menghentikan seluruh server. Kini kata kuncinya dipakai apa adanya
   * dan pencariannya berjalan seperti biasa.
   */
  it("keyword berisi persen tetap dicari, tidak menggagalkan permintaan", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(repo)).get("/?keyword=%25");

    expect(res.status).toBe(200);
    expect(repo.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "%" })
    );
  });
});

describe("GET /:id, /all, /autocomplete", () => {
  it("fetchByID membalas 200 untuk perusahaan aktif", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(perusahaan);

    const res = await request(app(repo)).get("/4");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(perusahaan);
  });

  it("fetchByID membalas 404 untuk perusahaan terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...perusahaan, is_delete: true });

    expect((await request(app(repo)).get("/4")).status).toBe(404);
  });

  it("fetchAll meneruskan hasil repository apa adanya", async () => {
    const repo = repositoryTiruan();
    repo.fetchAll.mockResolvedValue([perusahaan]);

    const res = await request(app(repo)).get("/all");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([perusahaan]);
  });

  it("fetchAutocomplete meneruskan kata kunci", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockResolvedValue([]);

    await request(app(repo)).get("/autocomplete?keyword=ind");
    expect(repo.fetchAutocomplete).toHaveBeenCalledWith("ind");
  });

  /**
   * CACAT BERAT: fetchByID tidak punya penanganan galat sama sekali.
   *
   * Handler lain di berkas ini membungkus pemanggilan repository dengan
   * try/catch dan membalas 500 berisi key i18n. fetchByID tidak. Karena ia
   * `async`, penolakan dari repository menjadi promise yang ditolak dan tidak
   * ada yang menangkapnya — Express 4 tidak menangani penolakan promise, dan
   * Node 15 ke atas menghentikan proses pada unhandled rejection.
   *
   * Jadi satu galat basis data sesaat pada GET /company/:id tidak berujung 500
   * bagi satu pemanggil, melainkan mematikan SELURUH server.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu — persis yang dialami
   * pemanggil sungguhan sebelum prosesnya tumbang.
   */
  it("CACAT: fetchByID menolak tanpa membalas apa pun saat repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));
    const c = new CompanyController(repo as never);

    const req = { params: { id: "4" }, body: {}, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.fetchByID(req, res)).rejects.toThrow("koneksi putus");
    // Tidak ada balasan yang pernah dikirim — itulah sebabnya permintaannya
    // menggantung alih-alih menerima 500.
    expect((res as any).status).not.toHaveBeenCalled();
  });
});
