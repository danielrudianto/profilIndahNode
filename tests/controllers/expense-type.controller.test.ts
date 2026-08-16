import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ExpenseTypeController setelah tipe pengeluaran menjadi dua
 * tingkat dengan INDUK BAKU: induk (parent_id null) lahir dari seeder dan
 * tidak bisa disunting maupun dihapus lewat API; anak bebas dikelola dan
 * wajib menunjuk salah satu induk yang hidup.
 *
 * Bentuknya mengikuti tests/controllers/company.controller.test.ts:
 * repository ditiru dan disuntikkan lewat konstruktor, lalu handler
 * dipanggil melalui app express kecil.
 *
 * SocketHelper ikut ditiru karena aslinya memanggil getIO() yang MELEMPAR
 * bila initIO belum pernah dipanggil.
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

/** Induk baku: parent_id null. */
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

describe("POST / — membuat anak di bawah induk baku", () => {
  it("memeriksa induknya dulu, lalu membalas 201 dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(induk);
    repo.create.mockResolvedValue(anak);

    const res = await request(app(repo))
      .post("/")
      .send({ name: "Listrik", description: "Tagihan listrik", parent_id: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(anak);
    expect(repo.fetchByID).toHaveBeenCalledWith(2);
    expect(kirimSocket).toHaveBeenCalledWith("createExpenseType", anak);
  });

  it("meneruskan nama, keterangan, parent_id, dan userId sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(induk);
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

  /**
   * SEMBUH: parent_id kini diperiksa. Dulu ia diteruskan mentah, sehingga
   * anak bisa menggantung pada id yang tidak ada dan lenyap dari pohon.
   */
  it("membalas 400 bila induknya tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo))
      .post("/")
      .send({ name: "Listrik", description: "X", parent_id: 999999 });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Expense type parent invalid"]);
    expect(repo.create).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  it("membalas 400 bila induknya sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...induk, is_delete: true });

    const res = await request(app(repo))
      .post("/")
      .send({ name: "Listrik", description: "X", parent_id: 2 });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Expense type parent invalid"]);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("membalas 400 bila 'induknya' sendiri seorang anak — pohon tidak boleh liar", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(anak);

    const res = await request(app(repo))
      .post("/")
      .send({ name: "Cucu", description: "X", parent_id: 11 });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Expense type parent invalid"]);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("membalas 500 dan tidak mengirim socket bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(induk);
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .post("/")
      .send({ name: "Listrik", parent_id: 2 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("PUT / — mengubah anak", () => {
  it("membalas 201, meneruskan id sebagai angka, tanpa menyentuh parent_id", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(anak);
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
      created_by: 7,
      created_at: expect.any(Date),
    });
    // Induk anak tidak ikut berpindah — update tidak membawa parent_id.
    expect(repo.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: expect.anything() })
    );
  });

  /** SEMBUH: update kini memeriksa keberadaan dan membalas 404. */
  it("membalas 404 bila anaknya tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo))
      .put("/")
      .send({ id: 999999, name: "Tidak Ada" });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("membalas 400 bila targetnya induk baku", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(induk);

    const res = await request(app(repo))
      .put("/")
      .send({ id: 2, name: "Operasional Baru" });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Expense type is fixed"]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  /**
   * CACAT WARISAN: perubahan tidak dikabarkan lewat socket — create dan
   * delete mengirim peristiwa, update tidak. Layar pengguna lain memakai
   * nama lama sampai disegarkan manual.
   */
  it("CACAT: update tidak mengirim peristiwa socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(anak);
    repo.update.mockResolvedValue(anak);

    await request(app(repo)).put("/").send({ id: 11, name: "Listrik & Air" });

    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT WARISAN: repository jalur update memakai bidang created_by /
   * created_at untuk membawa identitas PENYUNTING (ditulis ke updated_by /
   * updated_at di repository). Penamaan yang menyesatkan itu dipertahankan
   * seragam di seluruh repo — lihat catatan di repository-nya.
   */
  it("meneruskan penyunting lewat bidang created_by", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(anak);
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
    repo.fetchByID.mockResolvedValue(anak);
    repo.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send({ id: 11, name: "X" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus anak lalu mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(anak);
    repo.delete.mockResolvedValue({ ...anak, is_delete: true });

    const res = await request(app(repo)).delete("/11");

    expect(res.status).toBe(201);
    expect(repo.delete).toHaveBeenCalledWith(11, 99);
    expect(kirimSocket).toHaveBeenCalledWith(
      "deleteExpenseType",
      expect.anything()
    );
  });

  it("membalas 400 bila targetnya induk baku — kategori tidak bisa dihapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(induk);

    const res = await request(app(repo)).delete("/2");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Expense type is fixed"]);
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
   * CACAT WARISAN: delete tidak memeriksa is_delete, jadi penghapusan kedua
   * tetap diproses dan jejak deleted_by/deleted_at penghapus pertama
   * tertimpa. Controller sejenis lainnya menolak baris terhapus dengan 404.
   */
  it("CACAT: delete tetap memproses anak yang sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...anak, is_delete: true });
    repo.delete.mockResolvedValue({ ...anak, is_delete: true });

    const res = await request(app(repo)).delete("/11");

    expect(res.status).toBe(201);
    expect(repo.delete).toHaveBeenCalledWith(11, 99);
  });
});

describe("GET / — daftar", () => {
  it("mengambil seluruh pohon tanpa parameter apa pun", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue([{ ...induk, children: [anak] }]);

    const res = await request(app(repo)).get("/?page=3&keyword=listrik");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ ...induk, children: [anak] }]);
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
   * CACAT WARISAN: fetchByID tetap membalas 200 untuk jenis yang sudah
   * terhapus — masih bisa dibuka lewat tautan langsung.
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
