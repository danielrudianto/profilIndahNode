import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku PaymentMethodController.
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
    constructor(public nama: string, public data: unknown) {}
    create() {
      kirimSocket(this.nama, this.data);
    }
  },
}));

import PaymentMethodController from "../../src/controllers/payment-method.controller";

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
  const c = new PaymentMethodController(repo as never);
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

const metode = {
  id: 5,
  name: "Transfer BCA",
  description: "Rekening 123",
  is_delete: false,
  can_delete: true,
};

beforeEach(() => {
  kirimSocket.mockClear();
  process.env.LIMIT = "10";
});

describe("POST / — membuat metode pembayaran", () => {
  it("membalas 201, mengirim hasil repository, dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(metode);

    const res = await request(app(repo))
      .post("/")
      .send({ name: "Transfer BCA", description: "Rekening 123" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(metode);
    expect(kirimSocket).toHaveBeenCalledWith("createPaymentMethod", metode);
  });

  it("meneruskan nama, keterangan, dan userId sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(metode);

    await request(app(repo))
      .post("/")
      .send({ name: "Transfer BCA", description: "Rekening 123", userId: 7 });

    expect(repo.create).toHaveBeenCalledWith({
      name: "Transfer BCA",
      description: "Rekening 123",
      created_by: 7,
    });
  });

  it("membalas 500 dan tidak mengirim socket bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).post("/").send({ name: "Transfer" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("PUT / — mengubah metode pembayaran", () => {
  it("membalas 200 dan meneruskan id sebagai angka", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(metode);
    repo.update.mockResolvedValue({ ...metode, name: "Transfer Mandiri" });

    const res = await request(app(repo)).put("/").send({
      id: "5",
      name: "Transfer Mandiri",
      description: "Rekening 456",
      userId: 7,
    });

    expect(res.status).toBe(200);
    expect(repo.fetchByID).toHaveBeenCalledWith(5);
    expect(repo.update).toHaveBeenCalledWith({
      id: 5,
      name: "Transfer Mandiri",
      description: "Rekening 456",
      created_by: 7,
      created_at: expect.any(Date),
    });
  });

  it("membalas 404 bila metode tidak ada, tanpa menyentuh update", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).put("/").send({ id: 5, name: "X" });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("membalas 404 bila metode sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...metode, is_delete: true });

    const res = await request(app(repo)).put("/").send({ id: 5, name: "X" });

    expect(res.status).toBe(404);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(metode);
    repo.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send({ id: 5, name: "X" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: perubahan metode pembayaran tidak dikabarkan lewat socket.
   *
   * create mengirim "createPaymentMethod", tetapi update tidak mengirim apa
   * pun. Akibatnya kasir yang sedang membuka formulir pembayaran masih melihat
   * nama dan nomor rekening LAMA setelah rekannya memperbaikinya — pembayaran
   * bisa diarahkan ke rekening yang sudah tidak dipakai.
   */
  it("CACAT: update tidak mengirim peristiwa socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(metode);
    repo.update.mockResolvedValue(metode);

    await request(app(repo)).put("/").send({ id: 5, name: "Transfer Mandiri" });

    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: setiap penyuntingan menimpa jejak pembuatan.
   *
   * created_by diisi userId PENYUNTING dan created_at diisi waktu SEKARANG,
   * sehingga catatan siapa yang mendaftarkan metode pembayaran dan kapan
   * hilang permanen setelah satu kali koreksi.
   */
  it("CACAT: update menimpa created_by dan created_at", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(metode);
    repo.update.mockResolvedValue(metode);

    await request(app(repo))
      .put("/")
      .send({ id: 5, name: "Transfer Mandiri", userId: 55 });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 55, created_at: expect.any(Date) })
    );
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus bila metode ada dan belum terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(metode);
    repo.delete.mockResolvedValue(undefined);

    const res = await request(app(repo)).delete("/5");

    expect(res.status).toBe(200);
    expect(repo.delete).toHaveBeenCalledWith(5, 99);
  });

  it("membalas 404 bila metode tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/5");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 404 bila metode sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...metode, is_delete: true });

    const res = await request(app(repo)).delete("/5");

    expect(res.status).toBe(404);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 500 bila penghapusan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(metode);
    repo.delete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).delete("/5");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: delete mengabaikan can_delete.
   *
   * Repository dan handler fetch sama-sama menghitung can_delete dari ada
   * tidaknya transaksi yang memakai metode pembayaran itu, tetapi delete tidak
   * pernah membacanya — bandingkan dengan customer, company, dan product brand
   * yang menolak dengan 400 bila can_delete bernilai false.
   *
   * Akibatnya metode pembayaran yang MASIH DIPAKAI faktur dan penerimaan uang
   * bisa dihapus. Tombol hapusnya memang disembunyikan frontend, tetapi
   * penjagaan di server tidak ada, sehingga panggilan langsung tetap berhasil
   * dan dokumen lama kehilangan acuan metode pembayarannya.
   */
  it("CACAT: delete tetap menghapus metode yang sudah dipakai transaksi", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...metode, can_delete: false });
    repo.delete.mockResolvedValue(undefined);

    const res = await request(app(repo)).delete("/5");

    expect(res.status).toBe(200);
    expect(repo.delete).toHaveBeenCalledWith(5, 99);
  });

  /**
   * CACAT: penghapusan metode pembayaran tidak dikabarkan lewat socket.
   *
   * Sama seperti update: daftar metode pembayaran di layar pengguna lain tetap
   * menampilkan metode yang sudah dihapus sampai halamannya disegarkan, dan
   * memilihnya akan gagal tanpa penjelasan yang jelas.
   */
  it("CACAT: delete tidak mengirim peristiwa socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(metode);
    repo.delete.mockResolvedValue(undefined);

    await request(app(repo)).delete("/5");

    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("GET / — daftar dan pencarian", () => {
  it("menerjemahkan halaman dan kata kunci sebelum meneruskannya", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=3&keyword=bca");

    expect(repo.fetch).toHaveBeenCalledWith({
      keyword: "bca",
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

  it("kata kunci berisi persen tetap dicari, tidak menggagalkan permintaan", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(repo)).get("/?keyword=%25");

    expect(res.status).toBe(200);
    expect(repo.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "%" })
    );
  });

  /**
   * CACAT: ukuran halaman diambil dari process.env.LIMIT, bukan dari
   * permintaan, dan menjadi NaN bila variabel itu tidak diatur.
   *
   * Controller lain sudah beralih ke translatePageSize yang membaca
   * req.query.pageSize dan punya nilai bawaan 10. Di sini nilainya
   * parseInt(process.env.LIMIT!) — tanda seru itu hanya membungkam TypeScript,
   * bukan jaminan bahwa variabelnya ada.
   *
   * Dua akibatnya: pilihan "tampilkan 50 baris" di layar tidak berpengaruh
   * sama sekali; dan pada lingkungan yang lupa memasang LIMIT, repository
   * menerima pageSize NaN sehingga daftar metode pembayaran tampil KOSONG
   * atau kuerinya gagal — padahal datanya ada.
   */
  it("CACAT: pageSize dari kueri diabaikan, memakai process.env.LIMIT", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });
    process.env.LIMIT = "10";

    await request(app(repo)).get("/?pageSize=50");

    expect(repo.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 10 })
    );
  });

  it("CACAT: pageSize menjadi NaN bila process.env.LIMIT tidak diatur", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });
    delete process.env.LIMIT;

    const res = await request(app(repo)).get("/");

    expect(res.status).toBe(200);
    expect(repo.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: NaN })
    );
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockRejectedValue(new Error("gagal"));

    expect((await request(app(repo)).get("/")).status).toBe(500);
  });
});

describe("GET /all, /:id, dan /autocomplete", () => {
  /**
   * "Cash" bukan baris basis data melainkan entri buatan yang selalu
   * disisipkan di depan daftar, dengan id null. Pemanggil yang mengirim
   * balik id itu akan mengirim null, bukan angka.
   */
  it("fetchAll menyisipkan entri Cash ber-id null di depan hasil repository", async () => {
    const repo = repositoryTiruan();
    repo.fetchAll.mockResolvedValue([metode]);

    const res = await request(app(repo)).get("/all");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: null,
        name: "Cash",
        description: "Cash payment",
        can_delete: false,
      },
      metode,
    ]);
  });

  it("fetchAll membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchAll.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/all");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchByID membalas 200 dan meneruskan id sebagai angka", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(metode);

    const res = await request(app(repo)).get("/5");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(metode);
    expect(repo.fetchByID).toHaveBeenCalledWith(5);
  });

  it("fetchByID membalas 404 bila metode tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/5");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  /**
   * CACAT: fetchByID tetap membalas 200 untuk metode yang sudah dihapus.
   *
   * update dan delete sama-sama menolak metode ber-is_delete dengan 404,
   * tetapi pembacaan tunggal tidak memeriksanya. Metode yang sudah dihapus
   * masih bisa dibuka lewat tautan langsung dan tampak seperti metode aktif.
   */
  it("CACAT: fetchByID membalas 200 untuk metode yang sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...metode, is_delete: true });

    const res = await request(app(repo)).get("/5");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ is_delete: true }));
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/5");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchAutocomplete meneruskan kata kunci yang sudah diterjemahkan", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockResolvedValue([]);

    await request(app(repo)).get("/autocomplete?keyword=bca");

    expect(repo.fetchAutocomplete).toHaveBeenCalledWith("bca");
  });

  it("fetchAutocomplete membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/autocomplete?keyword=bca");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});
