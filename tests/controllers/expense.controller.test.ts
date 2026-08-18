import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ExpenseController.
 *
 * Controller ini menerima tiga repository lewat konstruktor (biaya, perusahaan,
 * dan jenis biaya), jadi keputusannya bisa diuji utuh dengan repository tiruan:
 * status HTTP mana yang dipilih, nilai apa yang diteruskan, dan kapan peristiwa
 * socket dikirim.
 *
 * SocketHelper ikut ditiru. Aslinya ia memanggil getIO(), yang MELEMPAR bila
 * initIO belum dipanggil — dan di dalam tes memang tidak pernah dipanggil.
 * Tanpa tiruan, setiap handler yang berhasil justru berakhir sebagai galat.
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

import ExpenseController from "../../src/controllers/expense.controller";

/** Tiga repository tiruan, satu per ketergantungan konstruktor. */
function repositoryTiruan() {
  return {
    expense: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      fetch: jest.fn(),
      fetchByID: jest.fn(),
      fetchReport: jest.fn(),
      fetchSum: jest.fn(),
    },
    company: { fetchAll: jest.fn() },
    expenseType: { fetchAll: jest.fn() },
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function controller(repo: Repo) {
  return new ExpenseController(
    repo.expense as never,
    repo.company as never,
    repo.expenseType as never
  );
}

function app(repo: Repo) {
  const c = controller(repo);
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
  a.get("/report", c.fetchReport);
  // fetchSummary tidak dipasang di rute mana pun pada src/routes/expense.route.ts;
  // dipasang di sini hanya supaya perilakunya tetap terkunci. Lihat catatan pada
  // blok "fetchSummary" di bawah.
  a.get("/summary", c.fetchSummary);
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  return a;
}

const biaya = {
  id: 12,
  description: "Listrik bulan Maret",
  date: new Date("2024-03-10T00:00:00.000Z").toISOString(),
  expense_type_id: 3,
  value: 750000,
  company_id: 1,
  is_delete: false,
};

beforeEach(() => {
  kirimSocket.mockClear();
  process.env.LIMIT = "10";
});

describe("POST / — mencatat biaya", () => {
  it("membalas 201 dan mengirim hasil repository", async () => {
    const repo = repositoryTiruan();
    repo.expense.create.mockResolvedValue(biaya);

    const res = await request(app(repo)).post("/").send({
      description: "Listrik bulan Maret",
      date: "2024-03-10T00:00:00.000Z",
      expense_type_id: 3,
      value: 750000,
      company_id: 1,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(biaya);
  });

  it("meneruskan seluruh bidang, mengubah tanggal jadi objek Date", async () => {
    const repo = repositoryTiruan();
    repo.expense.create.mockResolvedValue(biaya);

    await request(app(repo)).post("/").send({
      description: "Listrik bulan Maret",
      date: "2024-03-10T00:00:00.000Z",
      expense_type_id: 3,
      value: 750000,
      company_id: 1,
      userId: 7,
    });

    expect(repo.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Listrik bulan Maret",
        date: new Date("2024-03-10T00:00:00.000Z"),
        expense_type_id: 3,
        value: 750000,
        company_id: 1,
        created_by: 7, // userId dari middleware, bukan dari badan permintaan
      })
    );
  });

  it("mengabarkan pencatatan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.expense.create.mockResolvedValue(biaya);

    await request(app(repo)).post("/").send({ description: "A", value: 100 });

    expect(kirimSocket).toHaveBeenCalledWith("createExpense", biaya);
  });

  it("membalas 500 dan tidak mengirim socket bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.expense.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .post("/")
      .send({ description: "A", value: 100 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: tanggal yang tidak masuk akal diteruskan sebagai Invalid Date.
   *
   * Controller langsung memanggil `new Date(req.body.date)` tanpa memeriksa
   * hasilnya. Teks yang bukan tanggal menghasilkan Invalid Date, yang baru
   * ditolak jauh di dalam basis data — pengguna menerima 500 tanpa penjelasan,
   * bukan pesan "tanggal tidak sah" yang bisa ia perbaiki sendiri.
   */
  it("CACAT: tanggal ngawur diteruskan sebagai Invalid Date", async () => {
    const repo = repositoryTiruan();
    repo.expense.create.mockResolvedValue(biaya);

    await request(app(repo))
      .post("/")
      .send({ description: "A", value: 100, date: "bukan-tanggal" });

    const [dikirim] = repo.expense.create.mock.calls[0] as [{ date: Date }];
    expect(Number.isNaN(dikirim.date.getTime())).toBe(true);
  });
});

describe("PUT / — mengubah biaya", () => {
  it("membalas 200 dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.expense.update.mockResolvedValue(biaya);

    const res = await request(app(repo)).put("/").send({
      id: 12,
      description: "Listrik bulan Maret",
      date: "2024-03-10T00:00:00.000Z",
      expense_type_id: 3,
      value: 800000,
      company_id: 1,
    });

    expect(res.status).toBe(200);
    expect(kirimSocket).toHaveBeenCalledWith("updateExpense", biaya);
  });

  it("meneruskan id dan bidang baru ke repository", async () => {
    const repo = repositoryTiruan();
    repo.expense.update.mockResolvedValue(biaya);

    await request(app(repo)).put("/").send({
      id: 12,
      description: "Listrik bulan Maret revisi",
      date: "2024-03-11T00:00:00.000Z",
      expense_type_id: 4,
      value: 800000,
      company_id: 2,
    });

    expect(repo.expense.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        description: "Listrik bulan Maret revisi",
        date: new Date("2024-03-11T00:00:00.000Z"),
        expense_type_id: 4,
        value: 800000,
        company_id: 2,
      })
    );
  });

  it("membalas 500 dan tidak mengirim socket bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.expense.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).put("/").send({ id: 12, value: 1 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT BERAT: menyunting biaya MENGHAPUS jejak siapa yang mencatatnya.
   *
   * update mengirim `created_by: userID` dan `created_at: new Date()` — nilai
   * yang sama dengan create. Repository meneruskan keduanya ke prisma.update,
   * jadi kolom "dicatat oleh" dan "dicatat pada" ditimpa oleh identitas
   * PENYUNTING dan waktu penyuntingan.
   *
   * Akibatnya jejak audit biaya hilang: setelah siapa pun membuka dan menyimpan
   * ulang sebuah biaya, tidak ada lagi catatan siapa yang pertama kali
   * mencatatnya maupun kapan. Untuk data keuangan, itu justru kolom yang paling
   * dibutuhkan saat ada selisih.
   */
  it("CACAT: update menimpa created_by dan created_at dengan penyunting dan waktu kini", async () => {
    const repo = repositoryTiruan();
    repo.expense.update.mockResolvedValue(biaya);
    const sebelum = Date.now();

    await request(app(repo))
      .put("/")
      .send({ id: 12, value: 1, date: "2024-03-10", userId: 55 });

    const [dikirim] = repo.expense.update.mock.calls[0] as [
      { created_by: number; created_at: Date },
    ];
    expect(dikirim.created_by).toBe(55);
    expect(dikirim.created_at.getTime()).toBeGreaterThanOrEqual(sebelum);
  });

  /**
   * CACAT: update tidak memeriksa apakah biayanya masih ada atau sudah dihapus.
   *
   * delete di bawahnya memuat dulu datanya lewat fetchByID dan menolak yang
   * sudah is_delete. update tidak melakukan pemeriksaan apa pun: ia langsung
   * memanggil repository. Biaya yang SUDAH DIHAPUS tetap bisa disunting, dan
   * pengguna menerima 200 seolah suntingannya berlaku — padahal catatan itu
   * tetap terhapus dan tidak akan muncul di laporan mana pun.
   */
  it("CACAT: update tidak memanggil fetchByID sehingga biaya terhapus tetap bisa disunting", async () => {
    const repo = repositoryTiruan();
    repo.expense.update.mockResolvedValue({ ...biaya, is_delete: true });

    const res = await request(app(repo))
      .put("/")
      .send({ id: 12, value: 999, date: "2024-03-10" });

    expect(res.status).toBe(200);
    expect(repo.expense.fetchByID).not.toHaveBeenCalled();
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus bila biayanya ada dan belum terhapus", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchByID.mockResolvedValue(biaya);
    repo.expense.delete.mockResolvedValue({ ...biaya, is_delete: true });

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(200);
    expect(repo.expense.fetchByID).toHaveBeenCalledWith(12);
    expect(repo.expense.delete).toHaveBeenCalledWith(12, 99);
  });

  it("membalas 404 bila biayanya tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Expense not found"]);
    expect(repo.expense.delete).not.toHaveBeenCalled();
  });

  /** Penghapusan ganda ditolak supaya laporan tidak terhitung mundur dua kali. */
  it("membalas 404 bila biayanya sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchByID.mockResolvedValue({ ...biaya, is_delete: true });

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Expense not found"]);
    expect(repo.expense.delete).not.toHaveBeenCalled();
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchByID.mockResolvedValue(biaya);
    repo.expense.delete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).delete("/12");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: penghapusan TIDAK dikabarkan lewat socket.
   *
   * create dan update sama-sama mengirim "createExpense" dan "updateExpense",
   * tetapi delete tidak mengirim apa pun. Layar pengguna lain yang sedang
   * membuka daftar biaya tetap menampilkan baris yang sudah dihapus sampai
   * mereka memuat ulang halaman — dan angka totalnya ikut salah selama itu.
   */
  it("CACAT: delete tidak mengirim peristiwa socket apa pun", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchByID.mockResolvedValue(biaya);
    repo.expense.delete.mockResolvedValue({ ...biaya, is_delete: true });

    await request(app(repo)).delete("/12");

    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("GET / — daftar biaya per bulan", () => {
  it("meneruskan bulan, tahun, halaman, dan ukuran halaman", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetch.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(repo)).get("/?year=2024&month=3&page=2");

    expect(res.status).toBe(200);
    expect(repo.expense.fetch).toHaveBeenCalledWith({
      year: 2024,
      month: 3,
      page: 2,
      pageSize: 10, // dari process.env.LIMIT
    });
  });

  it("memakai halaman 1 bila parameter halamannya tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?year=2024&month=3&page=abc");

    expect(repo.expense.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetch.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/?year=2024&month=3");
    expect(res.status).toBe(500);
  });

  /**
   * CACAT: bulan atau tahun yang tidak dikirim menjadi NaN, bukan ditolak.
   *
   * `Number(undefined)` bernilai NaN, dan controller meneruskannya apa adanya.
   * Di repository, NaN dipakai membangun `new Date(NaN, NaN - 1, 1)` yang
   * menghasilkan Invalid Date, sehingga penyaringan tanggalnya tidak berlaku
   * sama sekali. Pengguna melihat daftar yang isinya tidak sesuai bulan mana
   * pun tanpa satu pun pesan galat.
   */
  it("CACAT: bulan dan tahun yang hilang diteruskan sebagai NaN", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/");

    const [dikirim] = repo.expense.fetch.mock.calls[0] as [
      { year: number; month: number },
    ];
    expect(Number.isNaN(dikirim.year)).toBe(true);
    expect(Number.isNaN(dikirim.month)).toBe(true);
  });
});

describe("GET /:id — satu biaya", () => {
  it("membalas 200 berisi biaya yang diminta", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchByID.mockResolvedValue(biaya);

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(biaya);
    expect(repo.expense.fetchByID).toHaveBeenCalledWith(12);
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchByID.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: biaya yang tidak ada dijawab 200 berbadan kosong, bukan 404.
   *
   * Handler delete tepat di atasnya memeriksa hasil fetchByID dan membalas 404
   * ketika null; fetchByID tidak. Frontend yang membuka halaman rincian biaya
   * yang sudah dihapus atau id yang diketik keliru menerima "berhasil" dengan
   * badan kosong — layarnya menampilkan formulir kosong alih-alih pesan "tidak
   * ditemukan".
   */
  it("CACAT: biaya yang tidak ada dijawab 200 dengan badan kosong", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(200);
    expect(res.text).toBe("");
  });

  /**
   * CACAT: id yang bukan angka menjadi NaN dan tetap diteruskan.
   *
   * `Number("abc")` bernilai NaN. Controller tidak memeriksanya, jadi kueri
   * dijalankan dengan id NaN dan berujung 500 dari basis data alih-alih 400
   * yang menjelaskan bahwa id-nya salah bentuk.
   */
  it("CACAT: id bukan angka diteruskan sebagai NaN", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchByID.mockResolvedValue(null);

    await request(app(repo)).get("/abc");

    expect(Number.isNaN(repo.expense.fetchByID.mock.calls[0][0])).toBe(true);
  });
});

describe("GET /report — laporan biaya sebulan", () => {
  it("menggabungkan biaya, perusahaan, dan jenis biaya menjadi satu balasan", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchReport.mockResolvedValue([biaya]);
    repo.company.fetchAll.mockResolvedValue([{ id: 1, name: "PT Indah" }]);
    repo.expenseType.fetchAll.mockResolvedValue([{ id: 3, name: "Utilitas" }]);

    const res = await request(app(repo)).get("/report?month=3&year=2024");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      result: [biaya],
      company: [{ id: 1, name: "PT Indah" }],
      expenseTypes: [{ id: 3, name: "Utilitas" }],
    });
  });

  /**
   * Bulan diteruskan APA ADANYA (1..12), bukan sebagai indeks Date —
   * penerjemahan periodenya dikerjakan di dalam repository. Kalau di sini
   * ditambah `- 1`, seluruh laporan biaya bergeser satu bulan sementara
   * judulnya tetap benar.
   */
  it("meneruskan bulan dan tahun mentah ke repository", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchReport.mockResolvedValue([]);
    repo.company.fetchAll.mockResolvedValue([]);
    repo.expenseType.fetchAll.mockResolvedValue([]);

    await request(app(repo)).get("/report?month=3&year=2024");

    expect(repo.expense.fetchReport).toHaveBeenCalledWith(3, 2024);
  });

  /*
    fetchAll kini tanpa parameter: sejak tipe pengeluaran menjadi dua tingkat
    berinduk baku, ia SELALU mengembalikan induk beserta anaknya — pilihan
    withChildren tidak ada lagi.
  */
  it("meminta seluruh jenis biaya beserta anak-anaknya tanpa parameter", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchReport.mockResolvedValue([]);
    repo.company.fetchAll.mockResolvedValue([]);
    repo.expenseType.fetchAll.mockResolvedValue([]);

    await request(app(repo)).get("/report?month=3&year=2024");

    expect(repo.expenseType.fetchAll).toHaveBeenCalledWith();
  });

  it("membalas 500 bila salah satu repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchReport.mockResolvedValue([]);
    repo.company.fetchAll.mockRejectedValue(new Error("gagal"));
    repo.expenseType.fetchAll.mockResolvedValue([]);

    const res = await request(app(repo)).get("/report?month=3&year=2024");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

/**
 * fetchSummary menyusun empat rentang tanggal (hari ini, kemarin, bulan ini,
 * bulan lalu) dari jam sistem. Karena itu tesnya memanggil handler LANGSUNG
 * dengan req/res tiruan sambil membekukan waktu — supertest tidak dipakai di
 * sini supaya waktu palsu tidak mengganggu server HTTP sungguhan.
 */
describe("fetchSummary — ringkasan empat periode", () => {
  function resTiruan() {
    const send = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ send });
    return { status, send } as never as {
      status: jest.Mock;
      send: jest.Mock;
    };
  }

  it("menyusun rentang hari ini, kemarin, bulan ini, dan bulan lalu", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchSum.mockResolvedValue(0);
    const c = controller(repo);

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 2, 15, 10, 30, 0, 0)); // 15 Maret 2024
    try {
      await c.fetchSummary(
        { body: {}, query: {} } as never,
        resTiruan() as never
      );
    } finally {
      jest.useRealTimers();
    }

    const panggilan = repo.expense.fetchSum.mock.calls as [Date, Date][];
    // Hari ini: 15 Maret 00:00:00.000 sampai 23:59:59.999
    expect(panggilan[0]).toEqual([
      new Date(2024, 2, 15, 0, 0, 0, 0),
      new Date(2024, 2, 15, 23, 59, 59, 999),
    ]);
    // Kemarin: 14 Maret
    expect(panggilan[1]).toEqual([
      new Date(2024, 2, 14, 0, 0, 0, 0),
      new Date(2024, 2, 14, 23, 59, 59, 999),
    ]);
    // Bulan ini: 1 sampai 31 Maret
    expect(panggilan[2]).toEqual([
      new Date(2024, 2, 1, 0, 0, 0, 0),
      new Date(2024, 2, 31, 23, 59, 59, 999),
    ]);
    // Bulan lalu: 1 sampai 29 Februari (2024 tahun kabisat)
    expect(panggilan[3]).toEqual([
      new Date(2024, 1, 1, 0, 0, 0, 0),
      new Date(2024, 1, 29, 23, 59, 59, 999),
    ]);
  });

  /**
   * Pergantian tahun adalah titik paling rawan: pada 1 Januari, "kemarin" ada
   * di tahun sebelumnya dan "bulan lalu" adalah Desember tahun sebelumnya.
   * Konstruktor Date menangani indeks bulan negatif dan tanggal 0 dengan benar,
   * dan itulah yang dikunci di sini.
   */
  it("menangani pergantian tahun pada 1 Januari", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchSum.mockResolvedValue(0);
    const c = controller(repo);

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 1, 8, 0, 0, 0)); // 1 Januari 2024
    try {
      await c.fetchSummary(
        { body: {}, query: {} } as never,
        resTiruan() as never
      );
    } finally {
      jest.useRealTimers();
    }

    const panggilan = repo.expense.fetchSum.mock.calls as [Date, Date][];
    expect(panggilan[1]).toEqual([
      new Date(2023, 11, 31, 0, 0, 0, 0),
      new Date(2023, 11, 31, 23, 59, 59, 999),
    ]);
    expect(panggilan[3]).toEqual([
      new Date(2023, 11, 1, 0, 0, 0, 0),
      new Date(2023, 11, 31, 23, 59, 59, 999),
    ]);
  });

  it("membalas 200 berisi keempat angka", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchSum
      .mockResolvedValueOnce(1000)
      .mockResolvedValueOnce(2000)
      .mockResolvedValueOnce(30000)
      .mockResolvedValueOnce(40000);
    const c = controller(repo);
    const res = resTiruan();

    await c.fetchSummary({ body: {}, query: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      today: 1000,
      yesterday: 2000,
      thisMonth: 30000,
      lastMonth: 40000,
    });
  });

  it("membalas 500 bila salah satu penjumlahan gagal", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchSum.mockRejectedValue(new Error("gagal"));
    const c = controller(repo);
    const res = resTiruan();

    await c.fetchSummary({ body: {}, query: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: fetchSummary tidak dipasang di rute mana pun.
   *
   * src/routes/expense.route.ts hanya memasang create, update, delete, fetch,
   * fetchByID, dan fetchReport. Handler ringkasan ini — beserta empat kueri
   * yang dirakitnya — tidak bisa dicapai pengguna sama sekali. Pekerjaannya
   * terpelihara terus setiap kali kode biaya disunting, padahal tidak ada satu
   * pun layar yang menampilkannya.
   *
   * Tes ini mengunci kenyataan itu: handlernya ada dan berfungsi, tetapi hanya
   * bisa dipanggil langsung seperti di berkas ini.
   */
  it("CACAT: fetchSummary hanya bisa dipanggil langsung karena tidak punya rute", async () => {
    const repo = repositoryTiruan();
    repo.expense.fetchSum.mockResolvedValue(0);
    const c = controller(repo);

    expect(typeof c.fetchSummary).toBe("function");
    const res = resTiruan();
    await c.fetchSummary({ body: {}, query: {} } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
