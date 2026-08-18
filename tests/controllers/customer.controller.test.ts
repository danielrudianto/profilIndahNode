import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku CustomerController.
 *
 * Bentuknya mengikuti tests/controllers/company.controller.test.ts: repository
 * ditiru dan disuntikkan lewat konstruktor, lalu handler dipanggil melalui app
 * express kecil. Yang diperiksa adalah keputusan controller — status HTTP,
 * nilai yang diteruskan ke repository, dan kapan peristiwa socket dikirim.
 *
 * SocketHelper ikut ditiru karena aslinya memanggil getIO() yang MELEMPAR bila
 * initIO belum pernah dipanggil. Tanpa tiruan, justru jalur yang BERHASIL yang
 * akan gagal.
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

import CustomerController from "../../src/controllers/customer.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
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
  const c = new CustomerController(repo as never);
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

const pelanggan = {
  id: 12,
  name: "Toko Maju",
  address: "Jl. Merdeka 9",
  pic: "Budi",
  phone_number: "0811222333",
  npwp: "123456789012345",
  is_delete: false,
  can_delete: true,
  created_by: 3,
};

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST / — membuat pelanggan", () => {
  it("membalas 201 dan mengirim hasil repository", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pelanggan);

    const res = await request(app(repo)).post("/").send({
      name: "Toko Maju",
      address: "Jl. Merdeka 9",
      pic: "Budi",
      phone_number: "0811222333",
      npwp: "123456789012345",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(pelanggan);
  });

  it("meneruskan seluruh bidang isian dan userId sebagai created_by", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pelanggan);

    await request(app(repo)).post("/").send({
      name: "Toko Maju",
      address: "Jl. Merdeka 9",
      pic: "Budi",
      phone_number: "0811222333",
      npwp: "123456789012345",
      userId: 7,
    });

    expect(repo.create).toHaveBeenCalledWith({
      name: "Toko Maju",
      address: "Jl. Merdeka 9",
      pic: "Budi",
      phone_number: "0811222333",
      npwp: "123456789012345",
      created_by: 7,
      created_at: expect.any(Date),
      can_delete: false,
      is_delete: false,
      deleted_at: null,
      deleted_by: null,
    });
  });

  it.each([
    ["15 digit diterima", "123456789012345", "123456789012345"],
    ["16 digit diterima", "1234567890123456", "1234567890123456"],
    ["panjang lain dibuang", "12345", null],
    ["kosong menjadi null", undefined, null],
  ])("npwp %s", async (_nama, masukan, harapan) => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pelanggan);

    await request(app(repo))
      .post("/")
      .send({ name: "Toko Maju", address: "Jl. A", npwp: masukan });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ npwp: harapan })
    );
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .post("/")
      .send({ name: "Toko Maju", address: "Jl. A" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: pembuatan pelanggan tidak mengabarkan apa pun lewat socket.
   *
   * update dan handler sejenis di controller lain mengirim peristiwa socket
   * supaya daftar di layar pengguna lain ikut segar. create tidak. Akibatnya
   * kasir yang sedang membuka daftar pelanggan tidak melihat pelanggan yang
   * baru saja didaftarkan rekannya sampai ia menyegarkan halaman sendiri —
   * dan pada alur penjualan, pelanggan itu seolah belum ada.
   */
  it("CACAT: create tidak mengirim peristiwa socket apa pun", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pelanggan);

    await request(app(repo))
      .post("/")
      .send({ name: "Toko Maju", address: "Jl. A" });

    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("PUT / — mengubah pelanggan", () => {
  it("membalas 200 dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pelanggan);
    repo.update.mockResolvedValue({ ...pelanggan, name: "Toko Jaya" });

    const res = await request(app(repo))
      .put("/")
      .send({ id: 12, name: "Toko Jaya", address: "Jl. Merdeka 9" });

    expect(res.status).toBe(200);
    expect(kirimSocket).toHaveBeenCalledWith(
      "updateCustomer",
      expect.objectContaining({ name: "Toko Jaya" })
    );
  });

  it("membalas 404 bila pelanggan tidak ada, tanpa menyentuh update", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).put("/").send({ id: 12, name: "X" });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.update).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: pelanggan yang sudah terhapus dibalas 400, bukan 404.
   *
   * Keadaannya sama persis dengan "tidak ada" — bahkan pesannya pun
   * ErrorList["Not found"] yang sama — tetapi statusnya berbeda dari handler
   * delete di berkas ini yang memakai 404 untuk keadaan serupa. Frontend yang
   * memetakan 404 menjadi "data tidak ditemukan" akan menampilkan 400 sebagai
   * galat generik "permintaan tidak valid", sehingga pengguna tidak paham
   * bahwa pelanggan yang ia buka sudah dihapus orang lain.
   */
  it("CACAT: pelanggan terhapus dibalas 400, padahal delete memakai 404", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...pelanggan, is_delete: true });

    const res = await request(app(repo)).put("/").send({ id: 12, name: "X" });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  /**
   * CACAT: setiap penyuntingan menimpa jejak pembuatan.
   *
   * update meneruskan created_by berisi userId PENYUNTING dan created_at
   * berisi waktu SEKARANG. Kolom itu seharusnya merekam siapa yang mendaftarkan
   * pelanggan dan kapan. Akibatnya, setelah satu kali koreksi nomor telepon,
   * riwayat "didaftarkan oleh siapa" hilang permanen dan pelanggan lama tampak
   * seolah baru dibuat hari ini — laporan pelanggan baru per periode ikut
   * salah hitung.
   */
  it("CACAT: update menimpa created_by dan created_at dengan penyunting dan waktu kini", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pelanggan);
    repo.update.mockResolvedValue(pelanggan);

    await request(app(repo))
      .put("/")
      .send({ id: 12, name: "Toko Jaya", address: "Jl. B", userId: 55 });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 55, created_at: expect.any(Date) })
    );
  });

  /**
   * CACAT: update selalu mengirim can_delete: false.
   *
   * can_delete adalah nilai TURUNAN — repository menghitungnya dari ada
   * tidaknya transaksi milik pelanggan. Mengirimnya sebagai isian update
   * berarti nilai hitungan itu ditimpa paksa menjadi false. Pelanggan yang
   * belum punya transaksi dan semestinya masih boleh dihapus menjadi tidak
   * bisa dihapus lagi hanya karena namanya pernah diperbaiki.
   */
  it("CACAT: update memaksa can_delete menjadi false", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pelanggan);
    repo.update.mockResolvedValue(pelanggan);

    await request(app(repo)).put("/").send({ id: 12, name: "Toko Jaya" });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ can_delete: false })
    );
  });

  it.each([
    ["15 digit dipertahankan", "123456789012345", "123456789012345"],
    ["16 digit dipertahankan", "1234567890123456", "1234567890123456"],
    ["panjang lain dibuang", "12345", null],
  ])("npwp %s", async (_nama, masukan, harapan) => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pelanggan);
    repo.update.mockResolvedValue(pelanggan);

    await request(app(repo))
      .put("/")
      .send({ id: 12, name: "Toko Jaya", npwp: masukan });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ npwp: harapan })
    );
  });

  it("membalas 500 dan tidak mengirim socket bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pelanggan);
    repo.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send({ id: 12, name: "X" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus bila pelanggan ada, aktif, dan boleh dihapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pelanggan);
    repo.delete.mockResolvedValue({ ...pelanggan, is_delete: true });

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(200);
    expect(repo.delete).toHaveBeenCalledWith(12, 99);
  });

  it("membalas 404 bila pelanggan tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 404 bila pelanggan sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...pelanggan, is_delete: true });

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(404);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 400 bila pelanggan sudah dipakai transaksi", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...pelanggan, can_delete: false });

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Delete error"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  /**
   * CACAT: penghapusan yang gagal mengirim objek galat mentah ke klien.
   *
   * Handler lain membalas ErrorList["Internal server error"], sebuah key i18n.
   * Di sini yang dikirim adalah `error` itu sendiri. Dua akibatnya sekaligus:
   * pesan galat basis data — termasuk nama tabel dan potongan kueri — bisa
   * bocor ke layar pengguna; dan karena Error tidak punya properti yang bisa
   * diserialkan, badan balasannya justru KOSONG, sehingga frontend tidak punya
   * apa pun untuk ditampilkan dan pengguna hanya melihat galat tanpa
   * keterangan.
   */
  it("CACAT: delete membalas 500 dengan badan kosong, bukan key i18n", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pelanggan);
    repo.delete.mockRejectedValue(new Error("Table 'customer' doesn't exist"));

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(500);
    expect(res.text).not.toBe(ErrorList["Internal server error"]);
    expect(res.text).toBe("{}");
  });

  it("delete tidak mengirim peristiwa socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pelanggan);
    repo.delete.mockResolvedValue(pelanggan);

    await request(app(repo)).delete("/12");

    // Berbeda dengan update, penghapusan tidak dikabarkan ke klien lain.
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("GET / — daftar dan pencarian", () => {
  it("menerjemahkan halaman, kata kunci, dan ukuran halaman", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=3&keyword=maju&pageSize=25");

    expect(repo.fetch).toHaveBeenCalledWith({
      keyword: "maju",
      page: 3,
      pageSize: 25,
    });
  });

  it("memakai halaman 1 dan ukuran 10 bila parameternya tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=abc&pageSize=9999");

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

    const res = await request(app(repo)).get("/");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("GET /:id dan /autocomplete", () => {
  it("fetchByID membalas 200 dan meneruskan id sebagai angka", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pelanggan);

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(pelanggan);
    expect(repo.fetchByID).toHaveBeenCalledWith(12);
  });

  it("fetchByID membalas 404 bila pelanggan tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  /**
   * CACAT: fetchByID tetap membalas 200 untuk pelanggan yang sudah dihapus.
   *
   * Handler delete dan update sama-sama menolak pelanggan ber-is_delete, tetapi
   * pembacaan tunggal tidak memeriksanya. Pelanggan yang sudah dihapus masih
   * bisa dibuka lewat tautan langsung dan halamannya tampil normal — pengguna
   * bisa memakainya sebagai acuan padahal data itu sudah dianggap tidak ada.
   */
  it("CACAT: fetchByID membalas 200 untuk pelanggan yang sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...pelanggan, is_delete: true });

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ is_delete: true }));
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetchAutocomplete meneruskan kata kunci yang sudah diterjemahkan", async () => {
    const repo = repositoryTiruan();
    repo.fetchAutocomplete.mockResolvedValue([]);

    await request(app(repo)).get("/autocomplete?keyword=maj");

    expect(repo.fetchAutocomplete).toHaveBeenCalledWith("maj");
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

    const res = await request(app(repo)).get("/autocomplete?keyword=maj");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});
