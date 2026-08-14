import express from "express";
import request from "supertest";

/**
 * Perilaku UserAvatarController.
 *
 * Bentuknya mengikuti acuan di company.controller.test.ts: repository
 * disuntikkan lewat konstruktor sebagai objek berisi jest.fn().
 *
 * Controller ini tidak memakai SocketHelper, tetapi tiruannya tetap dipasang
 * mengikuti pola berkas acuan — supaya kalau kelak avatar ikut dikabarkan ke
 * klien lain, tesnya tidak mendadak mati karena getIO() melempar.
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

import UserAvatarController from "../../src/controllers/user-avatar.controller";

function repositoryTiruan() {
  return { create: jest.fn() };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo) {
  const c = new UserAvatarController(repo as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    if (req.body && typeof req.body === "object") req.body.userId ??= 99;
    next();
  });
  a.post("/", c.updateAvatar);
  return a;
}

const avatar = {
  top: 3,
  accessories: 1,
  eyes: 2,
  circle: true,
  clothes: 4,
  color: "#a1b2c3",
  eyebrows: 5,
  mouth: 6,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST / — menyimpan avatar", () => {
  it("membalas 201 dan mengirim hasil repository", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue({ id: 1, user_id: 99, ...avatar });

    const res = await request(app(repo)).post("/").send(avatar);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, user_id: 99, ...avatar });
  });

  it("menempelkan avatar pada pemilik token, bukan pada id kiriman klien", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue({});

    // user_id di badan permintaan sengaja diisi milik orang lain; controller
    // membaca userId dari middleware, jadi nilai itu tidak terpakai.
    await request(app(repo))
      .post("/")
      .send({ ...avatar, user_id: 1 });

    expect(repo.create).toHaveBeenCalledWith({
      user_id: 99,
      top: 3,
      accessories: 1,
      eyes: 2,
      circle: true,
      clothes: 4,
      color: "#a1b2c3",
      eyebrows: 5,
      mouth: 6,
    });
  });

  it("meneruskan hanya kesembilan bidang yang dikenal", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue({});

    await request(app(repo))
      .post("/")
      .send({ ...avatar, is_admin: true, catatan: "titipan" });

    const dikirim = repo.create.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(dikirim).sort()).toEqual([
      "accessories",
      "circle",
      "clothes",
      "color",
      "eyebrows",
      "eyes",
      "mouth",
      "top",
      "user_id",
    ]);
  });

  it("bidang yang tidak dikirim diteruskan sebagai undefined, bukan ditolak", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue({});

    // Controller tidak memvalidasi apa pun sendiri; penjagaannya ada di
    // validate(updateAvatarSchema) pada route, bukan di sini.
    const res = await request(app(repo)).post("/").send({ top: 3 });

    expect(res.status).toBe(201);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ top: 3, mouth: undefined, color: undefined })
    );
  });

  /**
   * CACAT: kegagalan penyimpanan dibalas dengan objek galat, bukan key i18n.
   *
   * Penangkapnya berbunyi `res.status(500).send(error)`. Dua akibatnya:
   *
   *   1. `message` milik Error bersifat non-enumerable, jadi Express
   *      menyerialkannya menjadi JSON tanpa pesan apa pun. Pengguna melihat
   *      galat kosong, dan frontend tidak punya key untuk diterjemahkan —
   *      berbeda dari controller lain yang mengirim "error.internalServer".
   *   2. untuk galat yang properti-propertinya MEMANG enumerable — galat
   *      Prisma membawa `code`, `meta`, dan `clientVersion` — isinya justru
   *      terkirim utuh ke peramban, termasuk nama kolom dan constraint yang
   *      gagal. Rincian skema basis data bocor ke klien.
   */
  it("CACAT: galat repository dikirim apa adanya ke pemanggil", async () => {
    const repo = repositoryTiruan();
    const galatPrisma = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["user_avatar_user_id_key"] },
    });
    repo.create.mockRejectedValue(galatPrisma);

    const res = await request(app(repo)).post("/").send(avatar);

    expect(res.status).toBe(500);
    // Pesannya hilang...
    expect(res.body.message).toBeUndefined();
    expect(res.text).not.toContain("error.internalServer");
    // ...tetapi rincian basis datanya justru sampai ke peramban.
    expect(res.body.code).toBe("P2002");
    expect(res.body.meta).toEqual({ target: ["user_avatar_user_id_key"] });
  });
});

describe("validateCreate — pemeriksa bidang wajib", () => {
  const controller = new UserAvatarController(repositoryTiruan() as never);

  it("tidak melaporkan galat bila semua bidang terisi", () => {
    expect(controller.validateCreate({ body: avatar } as never)).toEqual([]);
  });

  it("melaporkan setiap bidang yang tidak dikirim", () => {
    const hasil = controller.validateCreate({
      body: { top: 3, eyes: 2 },
    } as never);

    expect(hasil).toEqual([
      "Missing required field: accessories",
      "Missing required field: circle",
      "Missing required field: clothes",
      "Missing required field: color",
      "Missing required field: eyebrows",
      "Missing required field: mouth",
    ]);
  });

  /**
   * CACAT: pemeriksaannya memakai `!req.body[field]`, sehingga nilai sah yang
   * kebetulan falsy dianggap tidak dikirim.
   *
   * `circle: false` adalah pilihan yang sah — pengguna memilih avatar tanpa
   * lingkaran latar. Begitu pula indeks 0 pada daftar model rambut, mata, atau
   * mulut: pilihan PERTAMA di tiap daftar bernilai 0.
   *
   * Akibat bagi pengguna kalau pemeriksa ini dipakai: avatar dengan pilihan
   * pertama mana pun, atau tanpa lingkaran latar, ditolak dengan pesan bahwa
   * bidangnya "tidak diisi" — padahal diisi.
   *
   * Untung saja saat ini pemeriksa ini TIDAK PERNAH dipanggil: updateAvatar
   * tidak menyentuhnya, dan penjagaan sesungguhnya ada pada
   * validate(updateAvatarSchema) di route. Jadi cacatnya laten — ia akan
   * menggigit begitu ada yang memasang pemeriksa ini kembali karena mengira
   * kode mati ini masih berlaku.
   */
  it("CACAT: nilai false dan 0 dilaporkan sebagai bidang yang tidak diisi", () => {
    const hasil = controller.validateCreate({
      body: { ...avatar, circle: false, top: 0 },
    } as never);

    expect(hasil).toEqual([
      "Missing required field: top",
      "Missing required field: circle",
    ]);
  });

  /**
   * Bukti bahwa pemeriksa di atas memang kode mati: permintaan tanpa satu pun
   * bidang tetap diteruskan ke repository dengan status 201. Kalau suatu saat
   * validate() di route dilepas, tidak ada lapisan lain yang menahan.
   */
  it("CACAT: updateAvatar tidak pernah memanggil validateCreate", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue({});
    const c = new UserAvatarController(repo as never);
    const intip = jest.spyOn(c, "validateCreate");

    const a = express();
    a.use(express.json());
    a.use((req, _res, next) => {
      if (req.body && typeof req.body === "object") req.body.userId ??= 99;
      next();
    });
    a.post("/", c.updateAvatar);

    const res = await request(a).post("/").send({});

    expect(intip).not.toHaveBeenCalled();
    expect(res.status).toBe(201);
    expect(repo.create).toHaveBeenCalled();
  });
});
