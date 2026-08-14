import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ExpenseTypeController (jenis pengeluaran).
 *
 * Bentuknya mengikuti tests/controllers/company.controller.test.ts: repository
 * ditiru dan disuntikkan lewat konstruktor, lalu handler dipanggil melalui app
 * express kecil.
 *
 * Jenis pengeluaran bersusun dua tingkat: baris ber-parent_id null adalah
 * induk, sisanya anak. Penjagaan penghapusan bergantung pada hubungan itu,
 * jadi countByParentID ikut ditiru.
 *
 * SocketHelper ikut ditiru karena aslinya memanggil getIO() yang MELEMPAR bila
 * initIO belum pernah dipanggil.
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

import ExpenseTypeController from "../../src/controllers/expense-type.controller";

function repositoryTiruan() {
  return {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    fetch: jest.fn(),
    fetchByID: jest.fn(),
    fetchAutocomplete: jest.fn(),
    countByParentID: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo) {
  const c = new ExpenseTypeController(repo as never);
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
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  return a;
}

/** Induk: parent_id null. */
const induk = {
  id: 2,
  name: "Operasional",
  description: "Biaya operasional",
  parent_id: null as number | null,
  is_delete: false,
};

/** Anak: menunjuk ke induk lewat parent_id. */
const anak = {
  id: 11,
  name: "Listrik",
  description: "Tagihan listrik",
  parent_id: 2 as number | null,
  is_delete: false,
};

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST / — membuat jenis pengeluaran", () => {
  it("membalas 201, mengirim hasil repository, dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(anak);

    const res = await request(app(repo))
      .post("/")
      .send({ name: "Listrik", description: "Tagihan listrik", parent_id: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(anak);
    expect(kirimSocket).toHaveBeenCalledWith("createExpenseType", anak);
  });

  it("meneruskan nama, keterangan, parent_id, dan userId sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(anak);

    await request(app(repo)).post("/").send({
      name: "Listrik",
      description: "Tagihan listrik",
      parent_id: 2,
      userId: 7,
    });

    expect(repo.create).toHaveBeenCalledWith({
      name: "Listrik",
      description: "Tagihan listrik",
      parent_id: 2,
      created_by: 7,
      created_at: expect.any(Date),
    });
  });

  it("membalas 500 dan tidak mengirim socket bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).post("/").send({ name: "Listrik" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: parent_id diteruskan tanpa diperiksa sama sekali.
   *
   * Tidak ada pemeriksaan bahwa induknya benar-benar ada, masih aktif, atau
   * bahkan bahwa ia memang sebuah induk. Sebuah jenis pengeluaran bisa
   * digantungkan pada id yang tidak ada, sehingga barisnya tidak pernah muncul
   * di pohon jenis pengeluaran mana pun — pengguna melihat "berhasil disimpan"
   * lalu datanya seolah lenyap.
   */
  it("CACAT: create menerima parent_id yang tidak ada tanpa memeriksanya", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(anak);

    const res = await request(app(repo))
      .post("/")
      .send({ name: "Listrik", description: "X", parent_id: 999999 });

    expect(res.status).toBe(201);
    expect(repo.fetchByID).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: 999999 })
    );
  });
});

describe("PUT / — mengubah jenis pengeluaran", () => {
  it("membalas 201 dan meneruskan id sebagai angka", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(anak);

    const res = await request(app(repo)).put("/").send({
      id: "11",
      name: "Listrik & Air",
      description: "Tagihan utilitas",
      userId: 7,
    });

    expect(res.status).toBe(201);
    expect(repo.update).toHaveBeenCalledWith({
      id: 11,
      name: "Listrik & Air",
      description: "Tagihan utilitas",
      parent_id: null,
      created_by: 7,
      created_at: expect.any(Date),
    });
  });

  /**
   * CACAT BERAT: update memaksa parent_id menjadi null.
   *
   * Nilai parent_id ditulis mati sebagai null dan permintaan pengguna tidak
   * pernah dibaca. Padahal jenis pengeluaran bersusun dua tingkat: hanya baris
   * ber-parent_id null yang dianggap induk.
   *
   * Akibatnya, cukup memperbaiki SATU huruf pada nama sebuah sub-jenis untuk
   * mencabutnya dari induknya. "Listrik" yang semula berada di bawah
   * "Operasional" tiba-tiba menjadi kategori tingkat atas tersendiri.
   * Rekapitulasi biaya per kategori induk langsung berkurang senilai seluruh
   * pengeluaran sub-jenis itu, tanpa peringatan apa pun kepada pengguna, dan
   * tidak ada cara mengembalikannya lewat layar sunting yang sama.
   */
  it("CACAT: update mencabut sub-jenis dari induknya dengan memaksa parent_id null", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(anak);

    await request(app(repo)).put("/").send({
      id: 11,
      name: "Listrik",
      description: "Tagihan listrik",
      parent_id: 2, // dikirim pengguna, tetapi diabaikan sepenuhnya
    });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: null })
    );
  });

  /**
   * CACAT: update tidak memeriksa keberadaan sama sekali.
   *
   * delete dan fetchByID memanggil fetchByID lebih dulu dan membalas 404 untuk
   * jenis yang tidak ada; update langsung menembak repository. Penyuntingan
   * jenis pengeluaran yang sudah dihapus rekan kerja tetap dilaporkan
   * BERHASIL, padahal barisnya tidak muncul di daftar mana pun.
   */
  it("CACAT: update tidak pernah membalas 404 karena tidak memeriksa keberadaan", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(anak);

    const res = await request(app(repo))
      .put("/")
      .send({ id: 999999, name: "Tidak Ada" });

    expect(res.status).toBe(201);
    expect(repo.fetchByID).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 999999 })
    );
  });

  /**
   * CACAT: perubahan jenis pengeluaran tidak dikabarkan lewat socket.
   *
   * create mengirim "createExpenseType" dan delete mengirim
   * "deleteExpenseType", tetapi update tidak mengirim apa pun. Daftar jenis
   * pengeluaran di layar pengguna lain tetap memakai nama lama sampai
   * halamannya disegarkan manual.
   */
  it("CACAT: update tidak mengirim peristiwa socket", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(anak);

    await request(app(repo)).put("/").send({ id: 11, name: "Listrik & Air" });

    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: setiap penyuntingan menimpa jejak pembuatan.
   *
   * created_by diisi userId PENYUNTING dan created_at diisi waktu SEKARANG,
   * sehingga catatan siapa yang membuat jenis pengeluaran dan kapan hilang
   * permanen setelah satu kali koreksi.
   */
  it("CACAT: update menimpa created_by dan created_at", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue(anak);

    await request(app(repo))
      .put("/")
      .send({ id: 11, name: "Listrik & Air", userId: 55 });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 55, created_at: expect.any(Date) })
    );
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send({ id: 11, name: "X" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus sub-jenis tanpa memeriksa anak, lalu mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(anak);
    repo.delete.mockResolvedValue({ ...anak, is_delete: true });

    const res = await request(app(repo)).delete("/11");

    expect(res.status).toBe(201);
    // Sub-jenis tidak mungkin punya anak, jadi pemeriksaannya dilewati.
    expect(repo.countByParentID).not.toHaveBeenCalled();
    expect(repo.delete).toHaveBeenCalledWith(11, 99);
    expect(kirimSocket).toHaveBeenCalledWith(
      "deleteExpenseType",
      expect.objectContaining({ is_delete: true })
    );
  });

  it("menghapus induk yang belum punya sub-jenis", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(induk);
    repo.countByParentID.mockResolvedValue(0);
    repo.delete.mockResolvedValue({ ...induk, is_delete: true });

    const res = await request(app(repo)).delete("/2");

    expect(res.status).toBe(201);
    expect(repo.countByParentID).toHaveBeenCalledWith(2);
    expect(repo.delete).toHaveBeenCalledWith(2, 99);
  });

  it("membalas 400 bila induk masih punya sub-jenis", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(induk);
    repo.countByParentID.mockResolvedValue(3);

    const res = await request(app(repo)).delete("/2");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Expense type has child"]);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  it("membalas 404 bila jenis pengeluaran tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/11");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 500 dan tidak mengirim socket bila penghapusan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(anak);
    repo.delete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).delete("/11");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: delete tidak memeriksa is_delete.
   *
   * Semua controller sejenis — customer, supplier, payment method, product
   * brand, product type — menolak baris ber-is_delete dengan 404. Di sini
   * penghapusan kedua tetap diproses dan tetap mengirim peristiwa socket
   * "deleteExpenseType".
   *
   * Akibatnya kolom deleted_by dan deleted_at ditimpa oleh penghapus KEDUA,
   * sehingga catatan siapa yang sebenarnya menghapus jenis pengeluaran itu
   * hilang — persis catatan yang dicari saat menelusuri kembali perubahan
   * kategori biaya.
   */
  it("CACAT: delete tetap memproses jenis pengeluaran yang sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...anak, is_delete: true });
    repo.delete.mockResolvedValue({ ...anak, is_delete: true });

    const res = await request(app(repo)).delete("/11");

    expect(res.status).toBe(201);
    expect(repo.delete).toHaveBeenCalledWith(11, 99);
    expect(kirimSocket).toHaveBeenCalledWith(
      "deleteExpenseType",
      expect.anything()
    );
  });

  /**
   * CACAT: penjagaan anak memakai id dari baris hasil pembacaan, bukan id yang
   * diminta.
   *
   * countByParentID dipanggil dengan expenseType.id!, bukan dengan `id` dari
   * parameter URL. Selama repository jujur keduanya sama, tetapi tanda seru itu
   * menutupi kemungkinan id bernilai undefined: bila terjadi, jumlah anak
   * dihitung untuk induk yang salah dan sebuah kategori beserta seluruh
   * sub-jenisnya bisa terhapus.
   */
  it("CACAT: penjagaan anak memakai id dari hasil pembacaan, bukan dari URL", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...induk, id: 77 });
    repo.countByParentID.mockResolvedValue(0);
    repo.delete.mockResolvedValue(induk);

    await request(app(repo)).delete("/2");

    expect(repo.countByParentID).toHaveBeenCalledWith(77);
    // Sementara penghapusannya tetap memakai id dari URL.
    expect(repo.delete).toHaveBeenCalledWith(2, 99);
  });
});

describe("GET / — daftar", () => {
  it("mengambil seluruh jenis pengeluaran tanpa parameter apa pun", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue([induk, anak]);

    const res = await request(app(repo)).get("/?page=3&keyword=listrik");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([induk, anak]);
    // Berbeda dari controller master lain: tidak ada halaman maupun pencarian,
    // seluruh pohon jenis pengeluaran selalu dikirim sekaligus.
    expect(repo.fetch).toHaveBeenCalledWith();
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("GET /:id dan /autocomplete", () => {
  it("fetchByID membalas 200 dan meneruskan id sebagai angka", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(anak);

    const res = await request(app(repo)).get("/11");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(anak);
    expect(repo.fetchByID).toHaveBeenCalledWith(11);
  });

  it("fetchByID membalas 404 bila jenis pengeluaran tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/11");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  /**
   * CACAT: fetchByID tetap membalas 200 untuk jenis pengeluaran yang sudah
   * dihapus.
   *
   * Jenis yang sudah dihapus masih bisa dibuka lewat tautan langsung dan
   * halamannya tampil normal, sehingga pengguna bisa memakainya sebagai acuan
   * saat mencatat pengeluaran padahal data itu sudah dianggap tidak ada.
   */
  it("CACAT: fetchByID membalas 200 untuk jenis yang sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...anak, is_delete: true });

    const res = await request(app(repo)).get("/11");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ is_delete: true }));
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/11");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchAutocomplete meneruskan kata kunci yang sudah diterjemahkan", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockResolvedValue([]);

    await request(app(repo)).get("/autocomplete?keyword=lis");

    expect(repo.fetchAutocomplete).toHaveBeenCalledWith("lis");
  });

  it("fetchAutocomplete memakai string kosong bila kata kunci tidak diberikan", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockResolvedValue([]);

    await request(app(repo)).get("/autocomplete");

    expect(repo.fetchAutocomplete).toHaveBeenCalledWith("");
  });

  it("fetchAutocomplete membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/autocomplete?keyword=lis");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});
