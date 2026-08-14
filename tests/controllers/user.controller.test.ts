import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku UserController.
 *
 * Bentuknya mengikuti acuan di company.controller.test.ts: ketiga repository
 * disuntikkan lewat konstruktor sebagai objek berisi jest.fn(), lalu handler
 * dipanggil melalui express kecil dengan supertest.
 *
 * Tiga modul luar ikut ditiru:
 *
 *   SocketHelper — aslinya memanggil getIO() yang MELEMPAR bila initIO belum
 *     dijalankan, dan di dalam tes memang tidak pernah dijalankan.
 *   redisClient  — aslinya membuka koneksi TCP ke Redis. Selain lambat, tanpa
 *     Redis yang hidup tesnya jadi bergantung pada layanan luar.
 *   bcryptjs     — hash dengan cost 12 memakan ratusan milidetik per panggilan.
 *
 * Dengan tiruan itu yang tersisa untuk diuji adalah keputusan controller-nya:
 * status apa untuk keadaan apa, nilai apa yang diteruskan, dan apa saja yang
 * ikut tersiar lewat socket maupun tersimpan di Redis.
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

const redisSet = jest.fn();
const redisDel = jest.fn();
jest.mock("../../src/utils/redis.helper", () => ({
  __esModule: true,
  redisClient: {
    set: (...a: unknown[]) => redisSet(...a),
    del: (...a: unknown[]) => redisDel(...a),
  },
  connectRedis: jest.fn(),
  REDIS_URL: "redis://tiruan",
}));

const hashTiruan = jest.fn();
jest.mock("bcryptjs", () => ({
  __esModule: true,
  hash: (...a: unknown[]) => hashTiruan(...a),
}));

import UserController from "../../src/controllers/user.controller";

function repositoryTiruan() {
  return {
    create: jest.fn(),
    check: jest.fn(),
    // Bawaannya lolos validasi; tes yang perlu menguji penolakan menimpanya.
    validateCreate: jest.fn().mockReturnValue([]),
    update: jest.fn(),
    updatePassword: jest.fn(),
    toggleActive: jest.fn(),
    delete: jest.fn(),
    fetch: jest.fn(),
    fetchByID: jest.fn(),
  };
}

function repositoryFakturTiruan() {
  return { fetchSalesStatistics: jest.fn() };
}

function repositoryPelangganTiruan() {
  return { fetchSalesStatistics: jest.fn() };
}

type Repo = ReturnType<typeof repositoryTiruan>;
type RepoFaktur = ReturnType<typeof repositoryFakturTiruan>;
type RepoPelanggan = ReturnType<typeof repositoryPelangganTiruan>;

function app(repo: Repo, faktur?: RepoFaktur, pelanggan?: RepoPelanggan) {
  const c = new UserController(
    repo as never,
    (faktur ?? repositoryFakturTiruan()) as never,
    (pelanggan ?? repositoryPelangganTiruan()) as never
  );
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
    next();
  });
  a.post("/", c.create);
  a.post("/changePassword", c.updatePassword);
  a.put("/", c.update);
  a.delete("/:id", c.delete);
  a.patch("/:id", c.toggleActive);
  a.get("/statistics", c.fetchStatistics);
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  return a;
}

const pengguna = {
  id: 12,
  name: "Budi",
  username: "budi",
  nik: "3201",
  role: 5,
  is_active: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.LIMIT = "10";
  hashTiruan.mockResolvedValue("hash-tersimpan");
});

describe("POST / — membuat pengguna", () => {
  it("membalas 201 berisi identitas pengguna baru dan sandi awalnya", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(0);
    repo.create.mockResolvedValue(pengguna);

    const res = await request(app(repo))
      .post("/")
      .send({ username: "budi", name: "Budi", nik: "3201", role: 5 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 12,
      name: "Budi",
      nik: "3201",
      username: "budi",
      password: expect.stringMatching(/^[A-Za-z0-9]{8}$/),
      role_id: 5,
      role: "Administrator",
    });
  });

  it("memeriksa duplikat memakai username dan NIK sekaligus", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(0);
    repo.create.mockResolvedValue(pengguna);

    await request(app(repo))
      .post("/")
      .send({ username: "budi", name: "Budi", nik: "3201", role: 5 });

    expect(repo.check).toHaveBeenCalledWith("budi", "3201");
  });

  it("menyimpan sandi dalam bentuk hash, bukan teks terang", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(0);
    repo.create.mockResolvedValue(pengguna);

    const res = await request(app(repo))
      .post("/")
      .send({
        username: "budi",
        name: "Budi",
        nik: "3201",
        role: 5,
        user_sales: [{ product_type_id: 2 }],
      });

    expect(repo.create).toHaveBeenCalledWith({
      name: "Budi",
      username: "budi",
      nik: "3201",
      created_by: 99,
      role: 5,
      user_sales: [{ product_type_id: 2 }],
      is_active: true,
      password: "hash-tersimpan",
    });
    // Sandi acak yang di-hash adalah sandi yang sama dengan yang dikirim balik.
    expect(hashTiruan).toHaveBeenCalledWith(res.body.password, 12);
  });

  it("membalas 404 bila username atau NIK sudah dipakai", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(1);

    const res = await request(app(repo))
      .post("/")
      .send({ username: "budi", name: "Budi", nik: "3201", role: 5 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["User already exist"]);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("membalas 400 berisi galat validasi pertama dari repository", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(0);
    repo.validateCreate.mockReturnValue([
      "Name is required.",
      "NIK is required.",
    ]);

    const res = await request(app(repo))
      .post("/")
      .send({ username: "budi", nik: "3201", role: 5 });

    expect(res.status).toBe(400);
    expect(res.text).toBe("Name is required.");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("membalas 500 bila penyimpanan gagal, tanpa mengabarkan apa pun", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(0);
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .post("/")
      .send({ username: "budi", name: "Budi", nik: "3201", role: 5 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it("role yang tidak dikenal menghasilkan nama role null", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(0);
    repo.create.mockResolvedValue({ ...pengguna, role: 99 });

    const res = await request(app(repo))
      .post("/")
      .send({ username: "budi", name: "Budi", nik: "3201", role: 99 });

    expect(res.status).toBe(201);
    expect(res.body.role).toBeNull();
    expect(res.body.role_id).toBe(99);
  });

  /**
   * CACAT BERAT: sandi awal pengguna baru DISIARKAN ke semua klien socket.
   *
   * Muatan peristiwa "createUser" adalah objek `result` yang sama persis
   * dengan yang dikirim ke administrator — termasuk `password` berisi sandi
   * acak dalam TEKS TERANG. SocketHelper memanggil `getIO().emit(...)`, yaitu
   * siaran ke SELURUH klien yang tersambung, tanpa penyaringan role sama
   * sekali.
   *
   * Akibatnya: setiap pengguna yang sedang membuka aplikasi — termasuk staf
   * gudang atau sales yang tidak berhak menyentuh manajemen pengguna —
   * menerima username beserta sandi awal rekan barunya di peramban masing-
   * masing. Karena pengguna baru lazimnya belum sempat mengganti sandinya,
   * sandi itu masih berlaku saat diterima.
   *
   * Dikunci apa adanya. Perbaikannya adalah menyiarkan bentuk tanpa sandi,
   * tetapi frontend mungkin sudah membaca bidang itu, jadi bukan perubahan
   * yang boleh dilakukan diam-diam.
   */
  it("CACAT: peristiwa socket createUser memuat sandi teks terang", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(0);
    repo.create.mockResolvedValue(pengguna);

    const res = await request(app(repo))
      .post("/")
      .send({ username: "budi", name: "Budi", nik: "3201", role: 5 });

    expect(kirimSocket).toHaveBeenCalledWith(
      "createUser",
      expect.objectContaining({
        username: "budi",
        password: res.body.password,
      })
    );
  });

  /**
   * CACAT: salah ketik `pasword` membuat sandi teks terang ikut tersimpan
   * di Redis.
   *
   * Baris penyimpanannya berbunyi `{ ...result, pasword: undefined }` — huruf
   * "s"-nya kurang satu. Maksudnya jelas: membuang sandi sebelum disimpan.
   * Yang terjadi justru menambahkan bidang baru bernama `pasword` bernilai
   * undefined (yang lalu hilang saat JSON.stringify), sedangkan `password`
   * yang asli tetap utuh.
   *
   * Akibatnya sandi awal setiap pengguna tersimpan sebagai teks terang di
   * Redis tanpa masa kedaluwarsa — Redis di sini dipakai sebagai cache, bukan
   * brankas: isinya tidak dienkripsi dan ikut masuk ke dump maupun cadangan.
   */
  it("CACAT: sandi teks terang ikut tersimpan di Redis karena salah ketik", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(0);
    repo.create.mockResolvedValue(pengguna);

    const res = await request(app(repo))
      .post("/")
      .send({ username: "budi", name: "Budi", nik: "3201", role: 5 });

    expect(redisSet).toHaveBeenCalledWith("user:12", expect.any(String));
    const tersimpan = JSON.parse(redisSet.mock.calls[0][1] as string);
    expect(tersimpan.password).toBe(res.body.password);
    // Bidang salah ketiknya sendiri hilang saat diserialkan, jadi tidak ada
    // jejak di Redis yang menunjukkan bahwa pembuangan sandi pernah diniatkan.
    expect(Object.keys(tersimpan)).not.toContain("pasword");
  });

  /**
   * CACAT: penjagaan duplikat hanya mengenali hitungan tepat 1.
   *
   * `check` mengembalikan `count` dari kueri `OR: [{username}, {nik}]`.
   * Bila username yang diminta dipakai pengguna A dan NIK-nya dipakai
   * pengguna B, hitungannya 2 — dan `checkResult == 1` bernilai salah,
   * sehingga pembuatan diteruskan.
   *
   * Akibat bagi pengguna: alih-alih pesan "pengguna sudah ada" yang bisa
   * dipahami administrator, permintaannya menabrak unique constraint di basis
   * data dan berakhir sebagai 500 tanpa penjelasan. Administrator tidak tahu
   * bidang mana yang bentrok.
   */
  it("CACAT: hitungan duplikat 2 lolos dari penjagaan", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(2);
    repo.create.mockRejectedValue(new Error("Unique constraint failed"));

    const res = await request(app(repo))
      .post("/")
      .send({ username: "budi", name: "Budi", nik: "3201", role: 5 });

    // Bukan 404 "pengguna sudah ada", melainkan 500 dari basis data.
    expect(repo.create).toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT ringan: validateCreate dijalankan dua kali.
   *
   * Hasilnya disimpan ke `validationErrors`, lalu pemanggilannya diulang di
   * dalam syarat `if`. Untuk repository yang sekarang — pemeriksaan murni atas
   * objek di memori — akibatnya hanya kerja ganda. Yang membuatnya layak
   * dikunci: kalau kelak validasi ditambah pemeriksaan ke basis data, tiap
   * pembuatan pengguna akan menembak kueri itu dua kali diam-diam.
   */
  it("CACAT: validateCreate dipanggil dua kali untuk satu permintaan", async () => {
    const repo = repositoryTiruan();
    repo.check.mockResolvedValue(0);
    repo.create.mockResolvedValue(pengguna);

    await request(app(repo))
      .post("/")
      .send({ username: "budi", name: "Budi", nik: "3201", role: 5 });

    expect(repo.validateCreate).toHaveBeenCalledTimes(2);
  });
});

describe("GET /:id dan GET / — membaca pengguna", () => {
  it("fetchByID membalas 200 dan meneruskan id sebagai angka", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pengguna);

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(pengguna);
    expect(repo.fetchByID).toHaveBeenCalledWith(12);
  });

  it("fetchByID membalas 404 bila tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  it("fetchByID membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  it("fetch menerjemahkan halaman dan kata kunci sebelum meneruskannya", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=3&keyword=budi");

    expect(repo.fetch).toHaveBeenCalledWith({
      page: 3,
      keyword: "budi",
      pageSize: 10,
    });
  });

  it("fetch memakai halaman 1 bila parameternya tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=abc");

    expect(repo.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, keyword: "" })
    );
  });

  it("fetch membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("GET /statistics — pencapaian salesman", () => {
  it("menghitung pencapaian dari dua repository memakai userId pemanggil", async () => {
    const repo = repositoryTiruan();
    const faktur = repositoryFakturTiruan();
    const pelanggan = repositoryPelangganTiruan();
    pelanggan.fetchSalesStatistics.mockResolvedValue(0);
    faktur.fetchSalesStatistics.mockResolvedValue(150_000_000);

    const res = await request(app(repo, faktur, pelanggan)).get("/statistics");

    expect(res.status).toBe(200);
    expect(pelanggan.fetchSalesStatistics).toHaveBeenCalledWith(99);
    expect(faktur.fetchSalesStatistics).toHaveBeenCalledWith(99);
    // 150 juta melewati ambang 10 juta dan 100 juta, belum 1 miliar.
    expect(res.body.map((x: { shortName: string }) => x.shortName)).toEqual([
      "OrdinarySales",
      "ExtraordinarySales",
    ]);
  });

  it("membalas daftar kosong bila belum ada pencapaian", async () => {
    const repo = repositoryTiruan();
    const faktur = repositoryFakturTiruan();
    const pelanggan = repositoryPelangganTiruan();
    pelanggan.fetchSalesStatistics.mockResolvedValue(0);
    faktur.fetchSalesStatistics.mockResolvedValue(0);

    const res = await request(app(repo, faktur, pelanggan)).get("/statistics");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("membalas 500 bila salah satu repository gagal", async () => {
    const repo = repositoryTiruan();
    const faktur = repositoryFakturTiruan();
    const pelanggan = repositoryPelangganTiruan();
    pelanggan.fetchSalesStatistics.mockRejectedValue(new Error("gagal"));
    faktur.fetchSalesStatistics.mockResolvedValue(0);

    const res = await request(app(repo, faktur, pelanggan)).get("/statistics");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("PUT / — mengubah pengguna", () => {
  it("membalas 200 dan mengabarkan perubahan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pengguna);
    repo.update.mockResolvedValue({ ...pengguna, name: "Budi Baru" });

    const res = await request(app(repo))
      .put("/")
      .send({ id: 12, name: "Budi Baru", role: 5 });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Budi Baru");
    expect(kirimSocket).toHaveBeenCalledWith(
      "updateUser",
      expect.objectContaining({ name: "Budi Baru" })
    );
  });

  it("mempertahankan username dan NIK lama, hanya nama dan role yang diubah", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pengguna);
    repo.update.mockResolvedValue(pengguna);

    // username dan nik di badan permintaan sengaja diisi nilai lain.
    await request(app(repo))
      .put("/")
      .send({
        id: 12,
        name: "Budi Baru",
        role: 2,
        username: "penyusup",
        nik: "9999",
        user_sales: [{ product_type_id: 4 }],
      });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        username: "budi",
        nik: "3201",
        name: "Budi Baru",
        role: 2,
        user_sales: [{ product_type_id: 4 }],
        // created_by/created_at di sini dipetakan repository menjadi
        // updated_by/updated_at, jadi jejak penyuntingnya tercatat.
        created_by: 99,
        is_active: true,
      })
    );
  });

  it("membalas 400 bila role tidak dikenal, sebelum menyentuh basis data", async () => {
    const repo = repositoryTiruan();

    const res = await request(app(repo))
      .put("/")
      .send({ id: 12, name: "Budi", role: 99 });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Role not found"]);
    expect(repo.fetchByID).not.toHaveBeenCalled();
  });

  it("membalas 404 bila pengguna tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo))
      .put("/")
      .send({ id: 12, name: "Budi", role: 5 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("membalas 400 bila pengguna sudah dinonaktifkan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...pengguna, is_active: false });

    const res = await request(app(repo))
      .put("/")
      .send({ id: 12, name: "Budi", role: 5 });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["User not active"]);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("membalas 500 bila penyimpanan gagal dan tidak mengabarkan apa pun", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pengguna);
    repo.update.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .put("/")
      .send({ id: 12, name: "Budi", role: 5 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("PATCH /:id — menyalakan dan mematikan pengguna", () => {
  it("menonaktifkan pengguna aktif, mengabarkan socket, dan membuang cache", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pengguna);
    repo.toggleActive.mockResolvedValue({ ...pengguna, is_active: false });

    const res = await request(app(repo)).patch("/12");

    expect(res.status).toBe(201);
    expect(repo.toggleActive).toHaveBeenCalledWith(12, false);
    expect(kirimSocket).toHaveBeenCalledWith(
      "deleteUser",
      expect.objectContaining({ id: 12, is_active: false })
    );
    expect(redisDel).toHaveBeenCalledWith("user:12");
    expect(redisSet).not.toHaveBeenCalled();
  });

  it("mengaktifkan kembali pengguna nonaktif tanpa mengabarkan socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...pengguna, is_active: false });
    repo.toggleActive.mockResolvedValue({ ...pengguna, is_active: true });

    const res = await request(app(repo)).patch("/12");

    expect(res.status).toBe(201);
    expect(repo.toggleActive).toHaveBeenCalledWith(12, true);
    // Tidak ada peristiwa socket untuk pengaktifan kembali — daftar pengguna
    // di layar klien lain tidak ikut menyegarkan diri.
    expect(kirimSocket).not.toHaveBeenCalled();
    expect(redisSet).toHaveBeenCalledWith(
      "user:12",
      JSON.stringify({ ...pengguna, is_active: true })
    );
    expect(redisDel).not.toHaveBeenCalled();
  });

  it("membalas 400 bila id bukan angka", async () => {
    const repo = repositoryTiruan();

    const res = await request(app(repo)).patch("/abc");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Parameter error"]);
    expect(repo.fetchByID).not.toHaveBeenCalled();
  });

  it("membalas 404 bila pengguna tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).patch("/12");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.toggleActive).not.toHaveBeenCalled();
  });

  /**
   * CACAT: galat dikirim sebagai objek Error, bukan key i18n.
   *
   * Penangkapnya berbunyi `res.status(500).send(err)`. Express menyerialkan
   * objek Error menjadi JSON, dan `message` milik Error bersifat
   * non-enumerable — sehingga yang sampai ke pengguna adalah badan JSON tanpa
   * pesan apa pun, berbeda dari seluruh handler lain di berkas ini yang
   * mengirim key "error.internalServer".
   *
   * Akibat bagi pengguna: kegagalan menonaktifkan pengguna muncul sebagai
   * galat kosong di layar. Frontend tidak punya key untuk diterjemahkan, jadi
   * administrator tidak tahu apakah perintahnya berhasil atau tidak.
   */
  it("CACAT: kegagalan dibalas 500 tanpa pesan yang bisa ditampilkan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pengguna);
    repo.toggleActive.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).patch("/12");

    expect(res.status).toBe(500);
    expect(res.text).not.toContain(ErrorList["Internal server error"]);
    expect(res.text).not.toContain("koneksi putus");
  });
});

describe("DELETE /:id — menghapus pengguna", () => {
  it("menghapus, membuang cache Redis, dan membalas 200", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pengguna);
    repo.delete.mockResolvedValue({ ...pengguna, is_active: false });

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(200);
    expect(repo.delete).toHaveBeenCalledWith(12, 99);
    expect(redisDel).toHaveBeenCalledWith("user:12");
  });

  it("membalas 400 bila id bukan angka", async () => {
    const repo = repositoryTiruan();

    const res = await request(app(repo)).delete("/abc");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Parameter error"]);
    expect(repo.fetchByID).not.toHaveBeenCalled();
  });

  it("membalas 404 bila pengguna tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 400 bila pengguna sudah nonaktif", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...pengguna, is_active: false });

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["User not active"]);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("membalas 500 bila penghapusan gagal dan cache tidak ikut dibuang", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pengguna);
    repo.delete.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(redisDel).not.toHaveBeenCalled();
  });
});

describe("POST /changePassword — mengganti sandi sendiri", () => {
  it("membalas 200 dan menyimpan hash sandi baru", async () => {
    const repo = repositoryTiruan();
    repo.updatePassword.mockResolvedValue({ id: 99, name: "Budi" });

    const res = await request(app(repo))
      .post("/changePassword")
      .send({ password: "sandiBaru" });

    expect(res.status).toBe(200);
    expect(hashTiruan).toHaveBeenCalledWith("sandiBaru", 12);
    // Sandi hanya bisa diganti untuk pemilik token, bukan id kiriman klien.
    expect(repo.updatePassword).toHaveBeenCalledWith(99, "hash-tersimpan");
  });

  it("tidak memantulkan sandi baru di badan balasan", async () => {
    const repo = repositoryTiruan();
    repo.updatePassword.mockResolvedValue({ id: 99, name: "Budi" });

    const res = await request(app(repo))
      .post("/changePassword")
      .send({ password: "sandiBaru" });

    expect(res.text).not.toContain("sandiBaru");
    expect(res.text).not.toContain("hash-tersimpan");
  });

  it("membalas 500 bila penyimpanan gagal", async () => {
    const repo = repositoryTiruan();
    repo.updatePassword.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .post("/changePassword")
      .send({ password: "sandiBaru" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});
