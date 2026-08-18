import express from "express";
import request from "supertest";

/**
 * Perilaku SalesmanController (src/controllers/sales.controller.ts).
 *
 * Berbeda dari controller lain yang menerima repository, controller ini
 * menerima KLIEN REDIS langsung lewat konstruktornya. Jadi tiruannya dipasang
 * dengan cara yang sama seperti repository pada acuan
 * company.controller.test.ts: objek berisi jest.fn() yang disuntikkan saat
 * pembuatan. Dengan begitu tidak ada koneksi TCP yang dibuka, tesnya tidak
 * bergantung pada Redis yang hidup, dan nilai kembaliannya bisa diatur per
 * tes.
 *
 * SocketHelper ikut ditiru mengikuti pola berkas acuan; controller ini belum
 * memakainya, tetapi tiruannya menjaga tes tetap hidup kalau kelak dipakai.
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

import { SalesmanController } from "../../src/controllers/sales.controller";

/** Klien Redis tiruan: hanya perintah himpunan yang dipakai controller ini. */
function redisTiruan() {
  return {
    sAdd: jest.fn().mockResolvedValue(1),
    sRem: jest.fn().mockResolvedValue(1),
    sMembers: jest.fn().mockResolvedValue([]),
  };
}

type Redis = ReturnType<typeof redisTiruan>;

function app(redis: Redis) {
  const c = new SalesmanController(redis as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  // createSalesman adalah middleware: ia memanggil next(), bukan membalas.
  // Di sini dipasangkan handler penutup supaya jalur suksesnya bisa diamati.
  a.post("/", c.createSalesman, (_req, res) => {
    res.status(201).send({ lanjut: true });
  });
  a.post("/delete", c.deleteSalesman);
  a.get("/all", c.fetchAll);
  a.get("/", c.fetch);
  return a;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST / — createSalesman sebagai middleware", () => {
  it("menambahkan nama ke himpunan lalu MENERUSKAN, bukan membalas", async () => {
    const redis = redisTiruan();

    const res = await request(app(redis))
      .post("/")
      .send({ sales: "AGUS SETIAWAN" });

    expect(redis.sAdd).toHaveBeenCalledWith("salesmanList", "AGUS SETIAWAN");
    // Status 201 di sini datang dari handler BERIKUTNYA, bukan dari
    // createSalesman — buktinya badan balasannya milik handler itu.
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ lanjut: true });
  });

  it("tetap meneruskan tanpa menyentuh Redis bila nama sales tidak dikirim", async () => {
    const redis = redisTiruan();

    const res = await request(app(redis)).post("/").send({});

    expect(redis.sAdd).not.toHaveBeenCalled();
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ lanjut: true });
  });

  it("nama sales null juga dilewati", async () => {
    const redis = redisTiruan();

    await request(app(redis)).post("/").send({ sales: null });

    expect(redis.sAdd).not.toHaveBeenCalled();
  });

  it("membalas 500 dan TIDAK meneruskan bila Redis gagal", async () => {
    const redis = redisTiruan();
    redis.sAdd.mockRejectedValue(new Error("redis mati"));

    const res = await request(app(redis)).post("/").send({ sales: "AGUS" });

    expect(res.status).toBe(500);
    // Bukan balasan handler berikutnya — rantainya berhenti di sini.
    expect(res.body).not.toEqual({ lanjut: true });
  });

  /**
   * Bukti langsung bahwa handler ini memanggil next() dan tidak membalas
   * sendiri saat berhasil: dipanggil dengan req/res tiruan, tidak ada satu pun
   * method balasan yang tersentuh.
   */
  it("tidak menyentuh res sama sekali pada jalur berhasil", async () => {
    const redis = redisTiruan();
    const c = new SalesmanController(redis as never);
    const lanjut = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await c.createSalesman(
      { body: { sales: "AGUS" } } as never,
      res as never,
      lanjut
    );

    expect(lanjut).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  /**
   * CACAT: nama sales berupa teks kosong tetap disimpan.
   *
   * Penjagaannya hanya `salesName != null`, yang lolos untuk "". Akibatnya
   * himpunan salesmanList terisi anggota kosong, dan anggota itu muncul di
   * daftar autocomplete sebagai baris yang tampak kosong — tidak bisa dihapus
   * lewat layar mana pun karena tidak ada yang bisa diklik, dan ia ikut
   * memakan satu dari lima slot hasil pencarian.
   */
  it("CACAT: nama sales berupa teks kosong tetap ditambahkan ke Redis", async () => {
    const redis = redisTiruan();

    await request(app(redis)).post("/").send({ sales: "" });

    expect(redis.sAdd).toHaveBeenCalledWith("salesmanList", "");
  });

  /**
   * CACAT: pada rutenya sendiri, createSalesman dipasang sebagai handler
   * TERAKHIR.
   *
   * src/routes/salesman.route.ts menulis:
   *
   *     router.post("/", validate(createSalesmanSchema), createSalesman)
   *
   * Padahal createSalesman memanggil next() dan tidak pernah membalas. Karena
   * tidak ada handler sesudahnya, permintaannya jatuh ke penangkap 404 di
   * src/app.ts.
   *
   * Akibat bagi pengguna: menambah salesman lewat POST /salesman SELALU
   * dijawab 404 "Not found" — padahal namanya sudah masuk ke Redis. Layar
   * menampilkan kegagalan, pengguna mencoba lagi, dan nama itu tetap ada
   * (himpunan Redis membuang duplikat, jadi tidak berlipat). Handler ini
   * bekerja benar hanya di rute lain, yaitu sebagai middleware pada pembuatan
   * faktur penjualan (src/routes/sales-invoice.route.ts).
   *
   * Ditiru di sini dengan susunan yang sama: satu handler saja, lalu
   * penangkap 404 seperti di app.ts.
   */
  it("CACAT: sebagai handler terakhir ia berakhir 404 walau datanya tersimpan", async () => {
    const redis = redisTiruan();
    const c = new SalesmanController(redis as never);
    const a = express();
    a.use(express.json());
    a.post("/", c.createSalesman);
    a.use((_req, res) => {
      res.status(404).send("Not found");
    });

    const res = await request(a).post("/").send({ sales: "AGUS" });

    expect(res.status).toBe(404);
    // Namanya sudah terlanjur tersimpan meski pemanggil diberi tahu gagal.
    expect(redis.sAdd).toHaveBeenCalledWith("salesmanList", "AGUS");
  });
});

describe("POST /delete — menghapus salesman", () => {
  it("membalas 200 dan membuang nama dari himpunan", async () => {
    const redis = redisTiruan();

    const res = await request(app(redis))
      .post("/delete")
      .send({ name: "AGUS" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Salesman deleted successfully" });
    expect(redis.sRem).toHaveBeenCalledWith("salesmanList", "AGUS");
  });

  /**
   * Perhatikan ketidakseragaman nama bidang yang dikunci di sini:
   * createSalesman membaca `req.body.sales`, deleteSalesman membaca
   * `req.body.name`. Keduanya menunjuk hal yang sama.
   */
  it("membaca nama dari bidang `name`, bukan `sales`", async () => {
    const redis = redisTiruan();

    await request(app(redis))
      .post("/delete")
      .send({ sales: "AGUS", name: "BUDI" });

    expect(redis.sRem).toHaveBeenCalledWith("salesmanList", "BUDI");
  });

  it("membalas 200 walau nama yang dihapus tidak ada di himpunan", async () => {
    const redis = redisTiruan();
    redis.sRem.mockResolvedValue(0);

    const res = await request(app(redis))
      .post("/delete")
      .send({ name: "TIDAK ADA" });

    // Redis mengembalikan 0 anggota terhapus, tetapi controller tidak
    // memeriksanya: pengguna tetap diberi tahu penghapusan berhasil.
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Salesman deleted successfully");
  });

  /**
   * CACAT BERAT: deleteSalesman tidak punya penanganan galat sama sekali.
   *
   * Karena handler ini `async`, kegagalan Redis menjadi promise yang ditolak
   * dan tidak ada yang menangkapnya — Express 4 tidak menangani penolakan
   * promise, dan Node 15 ke atas menghentikan proses pada unhandled rejection.
   *
   * Jadi Redis yang sedang tidak bisa dihubungi tidak berujung 500 bagi satu
   * pemanggil, melainkan MEMATIKAN SELURUH SERVER — termasuk faktur, laporan,
   * dan seluruh bagian aplikasi yang sama sekali tidak berurusan dengan daftar
   * salesman.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu.
   */
  it("CACAT: deleteSalesman menolak tanpa membalas saat Redis gagal", async () => {
    const redis = redisTiruan();
    redis.sRem.mockRejectedValue(new Error("redis mati"));
    const c = new SalesmanController(redis as never);

    const req = { body: { name: "AGUS" }, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.deleteSalesman(req, res)).rejects.toThrow("redis mati");
    expect((res as any).status).not.toHaveBeenCalled();
  });
});

describe("GET / — pencarian salesman", () => {
  it("menyaring berdasarkan kata kunci tanpa peduli besar kecil huruf", async () => {
    const redis = redisTiruan();
    redis.sMembers.mockResolvedValue(["AGUS", "BUDI", "AGUNG"]);

    const res = await request(app(redis)).get("/?keyword=ag");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(["AGUNG", "AGUS"]);
  });

  it("mengembalikan seluruh isi bila kata kunci kosong", async () => {
    const redis = redisTiruan();
    redis.sMembers.mockResolvedValue(["BUDI", "AGUS"]);

    const res = await request(app(redis)).get("/");

    expect(res.body).toEqual(["AGUS", "BUDI"]);
  });

  /**
   * Kata kunci berisi "%" dulu MEMATIKAN PROSES lewat translateKeyword yang
   * melempar URIError di luar blok try. Kini kata kuncinya dipakai apa adanya.
   */
  it("kata kunci berisi persen tetap dicari, tidak menggagalkan permintaan", async () => {
    const redis = redisTiruan();
    redis.sMembers.mockResolvedValue(["100% MURNI", "AGUS"]);

    const res = await request(app(redis)).get("/?keyword=%25");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(["100% MURNI"]);
  });

  /**
   * CACAT: pemotongan lima hasil dilakukan SEBELUM pengurutan.
   *
   * Urutannya `.filter(...).slice(0, 5).sort(...)` — jadi yang diambil adalah
   * lima nama pertama menurut urutan yang dikembalikan Redis, baru kelimanya
   * diurutkan. Himpunan (SET) Redis tidak menjanjikan urutan apa pun: isinya
   * bergantung pada tata letak internal dan bisa berubah setelah penambahan
   * atau penghapusan.
   *
   * Akibat bagi pengguna: kotak autocomplete salesman menampilkan lima nama
   * yang seolah-olah acak. Salesman yang namanya cocok tetapi kebetulan berada
   * di urutan keenam menurut Redis TIDAK PERNAH muncul, berapa kali pun
   * pengguna mengetik ulang — dan daftar yang muncul tampak terurut rapi,
   * sehingga tidak ada petunjuk bahwa ada nama yang hilang.
   *
   * Di bawah ini Redis mengembalikan A1..A6 dalam urutan terbalik. Yang
   * seharusnya tampil untuk lima teratas adalah A1..A5; yang tampil justru
   * A2..A6, dengan A1 lenyap.
   */
  it("CACAT: lima hasil diambil sebelum diurutkan, nama tertentu tidak pernah muncul", async () => {
    const redis = redisTiruan();
    redis.sMembers.mockResolvedValue(["A6", "A5", "A4", "A3", "A2", "A1"]);

    const res = await request(app(redis)).get("/?keyword=a");

    expect(res.body).toEqual(["A2", "A3", "A4", "A5", "A6"]);
    expect(res.body).not.toContain("A1");
  });

  /**
   * CACAT BERAT: fetch tidak punya penanganan galat sama sekali.
   *
   * Sama seperti deleteSalesman: penolakan dari Redis menjadi unhandled
   * rejection yang menghentikan proses Node. Endpoint ini dipanggil setiap
   * kali pengguna mengetik di kotak salesman, jadi ia jalur yang paling sering
   * dilalui di antara keempatnya.
   */
  it("CACAT: fetch menolak tanpa membalas saat Redis gagal", async () => {
    const redis = redisTiruan();
    redis.sMembers.mockRejectedValue(new Error("redis mati"));
    const c = new SalesmanController(redis as never);

    const req = { body: {}, query: { keyword: "a" } } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.fetch(req, res)).rejects.toThrow("redis mati");
    expect((res as any).status).not.toHaveBeenCalled();
  });
});

describe("GET /all — seluruh salesman", () => {
  it("membalas 200 berisi seluruh nama terurut menaik", async () => {
    const redis = redisTiruan();
    redis.sMembers.mockResolvedValue(["CANDRA", "AGUS", "BUDI"]);

    const res = await request(app(redis)).get("/all");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(["AGUS", "BUDI", "CANDRA"]);
    expect(redis.sMembers).toHaveBeenCalledWith("salesmanList");
  });

  it("membalas daftar kosong bila belum ada salesman", async () => {
    const redis = redisTiruan();
    redis.sMembers.mockResolvedValue([]);

    const res = await request(app(redis)).get("/all");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  /** Tanpa pemotongan lima, jalur ini bebas dari cacat urutan di GET /. */
  it("tidak memotong hasil, seluruh nama ikut terkirim", async () => {
    const redis = redisTiruan();
    redis.sMembers.mockResolvedValue(["A6", "A5", "A4", "A3", "A2", "A1"]);

    const res = await request(app(redis)).get("/all");

    expect(res.body).toEqual(["A1", "A2", "A3", "A4", "A5", "A6"]);
  });

  /**
   * CACAT BERAT: fetchAll pun tanpa penanganan galat — penolakan Redis
   * menjadi unhandled rejection yang menghentikan seluruh proses Node.
   * Tiga dari empat handler di controller ini punya cacat yang sama; hanya
   * createSalesman yang membungkus kerjanya dengan try/catch.
   */
  it("CACAT: fetchAll menolak tanpa membalas saat Redis gagal", async () => {
    const redis = redisTiruan();
    redis.sMembers.mockRejectedValue(new Error("redis mati"));
    const c = new SalesmanController(redis as never);

    const req = { body: {}, query: {} } as never;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as never;

    await expect(c.fetchAll(req, res)).rejects.toThrow("redis mati");
    expect((res as any).status).not.toHaveBeenCalled();
  });
});
