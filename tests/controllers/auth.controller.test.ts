import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku AuthController.
 *
 * Sama seperti acuan di company.controller.test.ts: repository disuntikkan
 * lewat konstruktor, jadi yang diuji adalah keputusan controller-nya —
 * status mana untuk keadaan mana, nilai apa yang diteruskan ke repository,
 * dan apa saja yang ikut terkirim ke pemanggil.
 *
 * bcryptjs dan jsonwebtoken ditiru. Alasannya dua:
 *
 *   1. hash bcrypt dengan cost 12 memakan ratusan milidetik per pemanggilan;
 *      tanpa tiruan berkas ini butuh puluhan detik untuk sesuatu yang bukan
 *      pokok pengujian.
 *   2. dengan tiruan, nilai token dan hasil perbandingan sandi bisa
 *      ditentukan — sehingga "sandi salah" bisa diuji tanpa perlu tahu hash
 *      aslinya.
 *
 * Yang ditiru hanyalah pustaka kriptografinya; keputusan controller tetap
 * berjalan apa adanya.
 */

const compareTiruan = jest.fn();
const hashTiruan = jest.fn();
jest.mock("bcryptjs", () => ({
  __esModule: true,
  compare: (...a: unknown[]) => compareTiruan(...a),
  hash: (...a: unknown[]) => hashTiruan(...a),
}));

const signTiruan = jest.fn();
const verifyTiruan = jest.fn();
jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  sign: (...a: unknown[]) => signTiruan(...a),
  verify: (...a: unknown[]) => verifyTiruan(...a),
}));

import AuthController from "../../src/controllers/auth.controller";

/** Repository tiruan: hanya method yang benar-benar dipakai controller ini. */
function repositoryTiruan() {
  return {
    fetchByUsername: jest.fn(),
    fetchByID: jest.fn(),
    updatePassword: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo) {
  const c = new AuthController(repo as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.post("/login", c.login);
  a.post("/refresh-token", c.refreshToken);
  a.put("/password", c.updatePassword);
  a.get("/profile", c.fetchProfile);
  return a;
}

/**
 * Bentuk pengguna sebagaimana dikembalikan fetchByUsername: LENGKAP dengan
 * kolom password berisi hash. Sengaja demikian, supaya bisa dibuktikan bahwa
 * hash itu tidak ikut terkirim ke pemanggil.
 */
const hashSandi = "$2a$12$hashRahasiaYangTidakBolehBocor";
const pengguna = {
  id: 7,
  name: "Budi",
  username: "budi",
  nik: "3201",
  role: 5,
  roleText: "Administrator",
  password: hashSandi,
  is_active: true,
  user_avatar: { top: "hat", color: "blue" },
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.TOKEN_KEY = "kunci-akses";
  process.env.REFRESH_TOKEN_KEY = "kunci-segar";
  process.env.EXPIRATION = "1d";
  process.env.REFRESH_EXPIRATION = "7d";
  signTiruan.mockImplementation((_muatan, kunci) => `token(${kunci})`);
});

describe("POST /login — masuk", () => {
  it("membalas 200 berisi data pengguna, token, dan refresh token", async () => {
    const repo = repositoryTiruan();
    repo.fetchByUsername.mockResolvedValue(pengguna);
    compareTiruan.mockResolvedValue(true);

    const res = await request(app(repo))
      .post("/login")
      .send({ username: "budi", password: "rahasia" });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 7,
      name: "Budi",
      role: 5,
      roleText: "Administrator",
    });
    expect(res.body.token).toBe("token(kunci-akses)");
    expect(res.body.refreshToken).toBe("token(kunci-segar)");
    expect(res.body.user_avatar).toEqual({ top: "hat", color: "blue" });
  });

  it("mencari pengguna berdasarkan username yang dikirim", async () => {
    const repo = repositoryTiruan();
    repo.fetchByUsername.mockResolvedValue(pengguna);
    compareTiruan.mockResolvedValue(true);

    await request(app(repo))
      .post("/login")
      .send({ username: "budi", password: "rahasia" });

    expect(repo.fetchByUsername).toHaveBeenCalledWith("budi");
    // Sandi mentah dibandingkan dengan hash milik pengguna, bukan sebaliknya.
    expect(compareTiruan).toHaveBeenCalledWith("rahasia", hashSandi);
  });

  it("menandatangani token dengan id pengguna dan kunci dari env", async () => {
    const repo = repositoryTiruan();
    repo.fetchByUsername.mockResolvedValue(pengguna);
    compareTiruan.mockResolvedValue(true);

    await request(app(repo))
      .post("/login")
      .send({ username: "budi", password: "rahasia" });

    expect(signTiruan).toHaveBeenNthCalledWith(1, { id: 7 }, "kunci-akses", {
      expiresIn: "1d",
    });
    expect(signTiruan).toHaveBeenNthCalledWith(2, { id: 7 }, "kunci-segar", {
      expiresIn: "7d",
    });
  });

  /**
   * Balasan login dibangun bidang per bidang, bukan dengan menyalin seluruh
   * objek pengguna. Itu yang menjaga hash sandi tetap di server. Diuji
   * eksplisit karena kalau suatu saat baris-baris itu diganti menjadi
   * `...user`, hash bcrypt setiap pengguna akan terkirim ke browser pada
   * setiap login — dan dari sana bisa diserang offline sepuasnya.
   */
  it("tidak pernah mengirim hash sandi di badan balasan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByUsername.mockResolvedValue(pengguna);
    compareTiruan.mockResolvedValue(true);

    const res = await request(app(repo))
      .post("/login")
      .send({ username: "budi", password: "rahasia" });

    expect(res.body.user.password).toBeUndefined();
    expect(res.body.password).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(hashSandi);
    // Kolom lain yang tidak perlu diketahui browser juga tidak ikut.
    expect(res.body.user.nik).toBeUndefined();
    expect(res.body.user.username).toBeUndefined();
  });

  it("membalas 400 dengan pesan umum bila username tidak terdaftar", async () => {
    const repo = repositoryTiruan();
    repo.fetchByUsername.mockResolvedValue(null);

    const res = await request(app(repo))
      .post("/login")
      .send({ username: "tidakada", password: "rahasia" });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Auth error"]);
    // Sandi tidak pernah dibandingkan — tidak ada kerja sia-sia.
    expect(compareTiruan).not.toHaveBeenCalled();
  });

  it("membalas 400 dengan pesan umum bila sandi salah", async () => {
    const repo = repositoryTiruan();
    repo.fetchByUsername.mockResolvedValue(pengguna);
    compareTiruan.mockResolvedValue(false);

    const res = await request(app(repo))
      .post("/login")
      .send({ username: "budi", password: "salah" });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["Auth error"]);
    expect(signTiruan).not.toHaveBeenCalled();
  });

  /**
   * Yang BENAR pada controller ini: username tidak terdaftar dan sandi salah
   * membalas persis sama — status 400 dengan key "error.auth". Penyerang yang
   * mencoba daftar username curian tidak bisa memisahkan "akun ini ada, sandinya
   * saja yang salah" dari "akun ini tidak ada".
   */
  it("username tidak terdaftar dan sandi salah tidak bisa dibedakan", async () => {
    const repoTanpaPengguna = repositoryTiruan();
    repoTanpaPengguna.fetchByUsername.mockResolvedValue(null);
    const a = await request(app(repoTanpaPengguna))
      .post("/login")
      .send({ username: "tidakada", password: "x" });

    const repoSandiSalah = repositoryTiruan();
    repoSandiSalah.fetchByUsername.mockResolvedValue(pengguna);
    compareTiruan.mockResolvedValue(false);
    const b = await request(app(repoSandiSalah))
      .post("/login")
      .send({ username: "budi", password: "x" });

    expect(a.status).toBe(b.status);
    expect(a.text).toBe(b.text);
  });

  /**
   * CACAT KEAMANAN: pengguna nonaktif membocorkan bahwa akunnya ADA.
   *
   * Pemeriksaan is_active dijalankan SEBELUM sandi dibandingkan, dan
   * balasannya memakai key sendiri ("user.notActive") yang berbeda dari
   * "error.auth". Akibatnya siapa pun — tanpa perlu tahu sandi sama sekali —
   * bisa menembak daftar username dan memisahkan tiga golongan:
   *
   *   "user.notActive" -> username ini terdaftar, akunnya dinonaktifkan
   *   "error.auth"     -> username tidak ada, ATAU ada tetapi sandinya salah
   *
   * Untuk perusahaan ini artinya daftar mantan karyawan bisa dipanen dari luar
   * hanya dengan menebak-nebak username, karena akun yang keluar dinonaktifkan
   * dan bukan dihapus. Nama-nama itu lalu jadi bahan phishing yang meyakinkan.
   *
   * Perilakunya dikunci apa adanya: memperbaikinya berarti menyeragamkan pesan
   * menjadi "error.auth", dan pengguna nonaktif yang sah kehilangan petunjuk
   * mengapa ia tidak bisa masuk — keputusan produk, bukan sekadar perbaikan tes.
   */
  it("CACAT: pengguna nonaktif dibalas pesan berbeda tanpa memeriksa sandi", async () => {
    const repo = repositoryTiruan();
    repo.fetchByUsername.mockResolvedValue({ ...pengguna, is_active: false });

    const res = await request(app(repo))
      .post("/login")
      .send({ username: "budi", password: "sandi-asal-asalan" });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["User not active"]);
    expect(res.text).not.toBe(ErrorList["Auth error"]);
    // Inilah bagian yang membuatnya bisa dipakai memanen username: sandi yang
    // dikirim tidak pernah diperiksa, jadi jawabannya sama untuk sandi apa pun.
    expect(compareTiruan).not.toHaveBeenCalled();
  });

  /**
   * CACAT: `exp` yang dikirim ke klien tidak sesuai masa berlaku token.
   *
   * Token ditandatangani dengan `expiresIn: process.env.EXPIRATION` — pada
   * server ini "1d", yakni satu HARI. Tetapi `exp` dihitung sebagai
   *
   *     new Date().getTime() + parseInt("1d".replace("d", "")) * 1000
   *
   * yaitu waktu sekarang + 1 * 1000 milidetik = satu DETIK dari sekarang.
   * Faktor 24 * 60 * 60 hilang — padahal handler refresh-token di berkas yang
   * sama menghitungnya lengkap. Jadi dua endpoint melaporkan masa berlaku yang
   * berbeda 86.400 kali untuk token yang sama.
   *
   * Akibat bagi pengguna: frontend yang mempercayai `exp` menganggap token
   * kedaluwarsa satu detik setelah login, lalu langsung menembak
   * /refresh-token pada tiap permintaan berikutnya — atau, kalau tidak ada
   * jalur refresh di layar itu, melempar pengguna kembali ke halaman login
   * seketika setelah ia berhasil masuk.
   */
  it("CACAT: exp pada login satu detik dari sekarang, bukan satu hari", async () => {
    const repo = repositoryTiruan();
    repo.fetchByUsername.mockResolvedValue(pengguna);
    compareTiruan.mockResolvedValue(true);

    const sebelum = Date.now();
    const res = await request(app(repo))
      .post("/login")
      .send({ username: "budi", password: "rahasia" });

    const selisih = res.body.exp - sebelum;
    // Satu hari = 86.400.000 ms. Yang dikirim justru sekitar 1.000 ms.
    expect(selisih).toBeLessThan(5000);
    expect(selisih).toBeGreaterThanOrEqual(1000);
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByUsername.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .post("/login")
      .send({ username: "budi", password: "rahasia" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * EXPIRATION yang belum diisi membuat `process.env.EXPIRATION!.toString()`
   * melempar TypeError. Untungnya baris itu berada DI DALAM blok try, jadi
   * hasilnya 500 dan bukan proses yang mati. Dikunci supaya kalau kelak
   * perhitungan exp dipindahkan ke luar try, tes ini yang gagal lebih dulu.
   */
  it("membalas 500 bila EXPIRATION belum diatur", async () => {
    delete process.env.EXPIRATION;
    const repo = repositoryTiruan();
    repo.fetchByUsername.mockResolvedValue(pengguna);
    compareTiruan.mockResolvedValue(true);

    const res = await request(app(repo))
      .post("/login")
      .send({ username: "budi", password: "rahasia" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("POST /refresh-token — memperbarui token", () => {
  it("membalas 200 berisi token baru bila refresh token sah", async () => {
    const repo = repositoryTiruan();
    verifyTiruan.mockImplementation((_token, _kunci, cb) =>
      cb(null, { id: 7 })
    );

    const res = await request(app(repo))
      .post("/refresh-token")
      .set("x-access-token", "Bearer token-segar")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("token(kunci-akses)");
    // Diperiksa memakai kunci refresh, bukan kunci akses.
    expect(verifyTiruan).toHaveBeenCalledWith(
      "token-segar",
      "kunci-segar",
      expect.any(Function)
    );
    // Token baru ditandatangani dengan kunci akses dan id dari token lama.
    expect(signTiruan).toHaveBeenCalledWith({ id: 7 }, "kunci-akses", {
      expiresIn: "1d",
    });
  });

  it("menghitung exp satu hari penuh di endpoint ini", async () => {
    const repo = repositoryTiruan();
    verifyTiruan.mockImplementation((_token, _kunci, cb) =>
      cb(null, { id: 7 })
    );

    const sebelum = Date.now();
    const res = await request(app(repo))
      .post("/refresh-token")
      .set("x-access-token", "Bearer token-segar")
      .send({});

    const selisih = res.body.exp - sebelum;
    // 24 * 60 * 60 * 1000 = 86.400.000 — bandingkan dengan exp saat login yang
    // hanya sekitar 1.000. Dua endpoint, satu token, dua jawaban berbeda.
    expect(selisih).toBeGreaterThanOrEqual(86_400_000);
    expect(selisih).toBeLessThan(86_405_000);
  });

  it("membalas 400 bila header token tidak berawalan Bearer", async () => {
    const repo = repositoryTiruan();

    const res = await request(app(repo))
      .post("/refresh-token")
      .set("x-access-token", "token-tanpa-skema")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      auth: false,
      message: "Format token tidak sesuai. Mohon coba login ulang.",
    });
    expect(verifyTiruan).not.toHaveBeenCalled();
  });

  it("membalas 400 bila header token tidak dikirim sama sekali", async () => {
    const repo = repositoryTiruan();

    const res = await request(app(repo)).post("/refresh-token").send({});

    expect(res.status).toBe(400);
    expect(res.body.auth).toBe(false);
    expect(verifyTiruan).not.toHaveBeenCalled();
  });

  it("membalas 400 bila setelah Bearer tidak ada tokennya", async () => {
    const repo = repositoryTiruan();

    const res = await request(app(repo))
      .post("/refresh-token")
      .set("x-access-token", "Bearer")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      auth: false,
      message: "Token tidak tersedia. Mohon coba login ulang.",
    });
  });

  /**
   * CACAT: token tidak sah dibalas dengan objek galat pustaka JWT apa adanya.
   *
   * `res.status(400).send(err)` mengirim objek Error milik jsonwebtoken apa
   * adanya. Express menyerialkannya sebagai JSON biasa, dan `message` milik
   * Error bersifat non-enumerable — jadi justru penjelasannya yang HILANG.
   * Yang sampai ke pengguna hanya sisa properti seperti `name`, tanpa kalimat
   * apa pun. Bandingkan dengan dua cabang di atasnya yang mengirim pesan utuh
   * berbahasa Indonesia.
   *
   * Akibat bagi pengguna: saat sesi habis, layar hanya diam. Frontend menerima
   * bentuk balasan yang sama sekali berbeda (JSON tanpa `message`, bukan key
   * i18n seperti balasan galat lain), jadi tidak ada yang bisa ditampilkan —
   * pengguna tersangkut di halaman yang tidak memuat data tanpa tahu bahwa ia
   * hanya perlu masuk ulang.
   */
  it("CACAT: token tidak sah dibalas 400 tanpa pesan yang bisa ditampilkan", async () => {
    const repo = repositoryTiruan();
    const galat = new Error("jwt expired");
    galat.name = "TokenExpiredError";
    verifyTiruan.mockImplementation((_token, _kunci, cb) => cb(galat, null));

    const res = await request(app(repo))
      .post("/refresh-token")
      .set("x-access-token", "Bearer token-basi")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBeUndefined();
    expect(res.text).not.toContain("jwt expired");
    // Tidak ada key i18n seperti pada balasan galat lain di aplikasi ini.
    expect(res.text).not.toContain("error.");
    expect(signTiruan).not.toHaveBeenCalled();
  });
});

describe("GET /profile — profil pemanggil", () => {
  const profil = {
    id: 7,
    name: "Budi",
    username: "budi",
    nik: "3201",
    role: 5,
    roleText: "Administrator",
    is_active: true,
  };

  it("membalas 200 berisi profil pengguna yang sedang masuk", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(profil);

    const res = await request(app(repo)).get("/profile");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(profil);
    // userId dari middleware, bukan dari parameter — pengguna hanya bisa
    // membaca profilnya sendiri.
    expect(repo.fetchByID).toHaveBeenCalledWith(99);
  });

  it("membalas 404 bila pengguna tidak ditemukan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/profile");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["User not found"]);
  });

  it("membalas 400 bila pengguna sudah dinonaktifkan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...profil, is_active: false });

    const res = await request(app(repo)).get("/profile");

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["User not active"]);
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/profile");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("PUT /password — mengubah sandi sendiri", () => {
  const sasaran = { id: 99, name: "Budi", is_active: true };
  const hasilRepo = { id: 99, name: "Budi", username: "budi", nik: "3201" };

  it("membalas 201 dan menyimpan sandi dalam bentuk hash", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(sasaran);
    repo.updatePassword.mockResolvedValue(hasilRepo);
    hashTiruan.mockResolvedValue("hash-baru");

    const res = await request(app(repo))
      .put("/password")
      .send({ password: "sandiBaru123" });

    expect(res.status).toBe(201);
    // Yang masuk ke basis data adalah hash, bukan teks aslinya.
    expect(repo.updatePassword).toHaveBeenCalledWith(99, "hash-baru");
    expect(hashTiruan).toHaveBeenCalledWith("sandiBaru123", 12);
  });

  it("hanya bisa mengubah sandi pemilik token, bukan id kiriman klien", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(sasaran);
    repo.updatePassword.mockResolvedValue(hasilRepo);
    hashTiruan.mockResolvedValue("hash-baru");

    // `id` di badan permintaan sengaja diisi milik orang lain.
    await request(app(repo))
      .put("/password")
      .send({ password: "sandiBaru123", id: 1 });

    // Tetap 99, yaitu userId yang ditulis middleware autentikasi.
    expect(repo.fetchByID).toHaveBeenCalledWith(99);
    expect(repo.updatePassword).toHaveBeenCalledWith(99, "hash-baru");
  });

  it("membalas 404 bila pengguna tidak ditemukan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo))
      .put("/password")
      .send({ password: "sandiBaru123" });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["User not found"]);
    expect(repo.updatePassword).not.toHaveBeenCalled();
  });

  it("membalas 400 bila pengguna sudah dinonaktifkan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue({ ...sasaran, is_active: false });

    const res = await request(app(repo))
      .put("/password")
      .send({ password: "sandiBaru123" });

    expect(res.status).toBe(400);
    expect(res.text).toBe(ErrorList["User not active"]);
    expect(repo.updatePassword).not.toHaveBeenCalled();
  });

  it("membalas 500 bila penyimpanan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(sasaran);
    hashTiruan.mockResolvedValue("hash-baru");
    repo.updatePassword.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .put("/password")
      .send({ password: "sandiBaru123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  describe("tanpa mengirim sandi — sandi acak dibuatkan", () => {
    it("membuat sandi acak 8 aksara, menyimpan hash-nya, mengirim teks aslinya", async () => {
      const repo = repositoryTiruan();
      repo.fetchByID.mockResolvedValue(sasaran);
      repo.updatePassword.mockResolvedValue(hasilRepo);
      hashTiruan.mockResolvedValue("hash-acak");

      const res = await request(app(repo)).put("/password").send({});

      expect(res.status).toBe(201);
      expect(repo.updatePassword).toHaveBeenCalledWith(99, "hash-acak");
      // Sandi acak inilah satu-satunya cara pengguna tahu sandi barunya, jadi
      // ia memang harus ikut di balasan.
      expect(typeof res.body.password).toBe("string");
      expect(res.body.password).toHaveLength(8);
      expect(res.body.password).toMatch(/^[A-Za-z0-9]{8}$/);
      // Yang di-hash adalah sandi acak yang sama dengan yang dikirim balik.
      expect(hashTiruan).toHaveBeenCalledWith(res.body.password, 12);
    });

    it.each([
      ["sandi kosong", ""],
      ["sandi null", null],
    ])("%s juga memicu pembuatan sandi acak", async (_nama, nilai) => {
      const repo = repositoryTiruan();
      repo.fetchByID.mockResolvedValue(sasaran);
      repo.updatePassword.mockResolvedValue(hasilRepo);
      hashTiruan.mockResolvedValue("hash-acak");

      const res = await request(app(repo))
        .put("/password")
        .send({ password: nilai });

      expect(res.status).toBe(201);
      expect(res.body.password).toHaveLength(8);
    });

    it("membalas 500 bila penyimpanan sandi acak gagal", async () => {
      const repo = repositoryTiruan();
      repo.fetchByID.mockResolvedValue(sasaran);
      hashTiruan.mockResolvedValue("hash-acak");
      repo.updatePassword.mockRejectedValue(new Error("koneksi putus"));

      const res = await request(app(repo)).put("/password").send({});

      expect(res.status).toBe(500);
      expect(res.text).toBe(ErrorList["Internal server error"]);
    });
  });

  /**
   * CACAT: sandi baru dikirim balik dalam bentuk teks terang.
   *
   * Ketika klien mengirim sandi pilihannya sendiri, balasannya berisi
   * `password: <sandi itu juga>`. Klien sudah tahu sandinya — mengirimnya
   * kembali tidak menambah apa pun, tetapi menambah tempat sandi itu tercecer:
   * badan balasan HTTP masuk ke log akses proxy, ke cache, ke panel Network
   * peramban, dan ke laporan galat frontend yang lazim ikut menyertakan
   * badan balasan.
   *
   * Untuk sandi acak yang dibuatkan server, mengirim teks terang memang tidak
   * terhindarkan. Untuk sandi yang dipilih sendiri oleh pengguna, tidak.
   */
  it("CACAT: sandi pilihan pengguna dipantulkan kembali sebagai teks terang", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(sasaran);
    repo.updatePassword.mockResolvedValue(hasilRepo);
    hashTiruan.mockResolvedValue("hash-baru");

    const res = await request(app(repo))
      .put("/password")
      .send({ password: "sandiRahasiaSaya" });

    expect(res.body.password).toBe("sandiRahasiaSaya");
  });

  /**
   * CACAT BERAT: fetchByID di updatePassword berada DI LUAR blok try.
   *
   * Kedua cabang penyimpanan sandi punya try/catch sendiri, tetapi pengambilan
   * penggunanya tidak. Karena handler ini `async`, penolakan dari repository
   * menjadi promise yang ditolak dan tidak ada yang menangkapnya — Express 4
   * tidak menangani penolakan promise, dan Node 15 ke atas menghentikan proses
   * pada unhandled rejection.
   *
   * Jadi satu gangguan basis data sesaat pada PUT /auth/password tidak berujung
   * 500 bagi satu pemanggil, melainkan MEMATIKAN SELURUH SERVER — dan endpoint
   * ini terbuka bagi setiap pengguna yang sudah masuk.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu.
   */
  it("CACAT: updatePassword menolak tanpa membalas saat pengambilan pengguna gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));
    const c = new AuthController(repo as never);

    const req = { body: { userId: 99, password: "x" }, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.updatePassword(req, res)).rejects.toThrow("koneksi putus");
    expect((res as any).status).not.toHaveBeenCalled();
  });
});
