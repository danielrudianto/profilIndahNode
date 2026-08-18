import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku OverpaymentController.
 *
 * Overpayment adalah UANG PELANGGAN YANG DIKEMBALIKAN: pelanggan sudah
 * menyetor, pesanannya batal, dan setorannya harus dikembalikan. Baris di
 * tabel ini adalah janji bayar perusahaan kepada pelanggan, jadi yang paling
 * penting diuji bukan status HTTP-nya melainkan NILAI APA yang sampai ke
 * repository: nominal, tanggal setor, dan tanggal pengembalian.
 *
 * Controller ini tidak menyentuh basis data langsung — ia menerima repository
 * lewat konstruktor — sehingga bisa diuji utuh dengan repository tiruan.
 *
 * SocketHelper tetap ditiru walau controller ini tidak memakainya, supaya
 * bentuk berkasnya sama dengan acuan dan supaya tes tidak jatuh pada getIO()
 * bila kelak ada handler yang mengirim peristiwa.
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

import { OverpaymentController } from "../../src/controllers/overpayment.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
function repositoryTiruan() {
  return {
    create: jest.fn(),
    createMany: jest.fn(),
    fetch: jest.fn(),
    fetchByID: jest.fn(),
    fetchReportByDate: jest.fn(),
    update: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function app(repo: Repo) {
  const c = new OverpaymentController(repo as never);
  const a = express();
  a.use(express.json());
  // userId biasanya ditulis authMiddleware ke req.body sebelum handler jalan.
  a.use((req, _res, next) => {
    req.body ??= {};
    req.body.userId ??= 99;
    next();
  });
  a.post("/report", c.fetchReport);
  a.post("/", c.create);
  a.put("/:id", c.update);
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  return a;
}

const pengembalian = {
  id: 12,
  customer_id: 3,
  sales_deposit_code_id: 8,
  value: 250000,
  return_payment_method: "Transfer",
};

beforeEach(() => {
  kirimSocket.mockClear();
});

describe("POST / — mencatat pengembalian kelebihan bayar", () => {
  it("membalas 201 dan mengirim hasil repository", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pengembalian);

    const res = await request(app(repo)).post("/").send({
      date: "2024-05-01",
      customer_id: 3,
      sales_deposit_code_id: 8,
      value: 250000,
      payment_method_id: 2,
      return_payment_date: "2024-05-03",
      return_payment_method: "Transfer",
      return_payment_bank: "BCA",
      return_payment_name: "Budi",
      return_payment_number: "1234567890",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(pengembalian);
  });

  it("meneruskan seluruh keterangan pengembalian apa adanya", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pengembalian);

    await request(app(repo)).post("/").send({
      date: "2024-05-01",
      customer_id: 3,
      sales_deposit_code_id: 8,
      value: 250000,
      payment_method_id: 2,
      return_payment_date: "2024-05-03",
      return_payment_method: "Transfer",
      return_payment_bank: "BCA",
      return_payment_name: "Budi",
      return_payment_number: "1234567890",
      userId: 7,
    });

    const arg = repo.create.mock.calls[0][0];
    // Nominal harus utuh: inilah uang yang akan dikembalikan ke pelanggan.
    expect(arg.value).toBe(250000);
    expect(arg.customer_id).toBe(3);
    expect(arg.sales_deposit_code_id).toBe(8);
    expect(arg.payment_method_id).toBe(2);
    expect(arg.return_payment_method).toBe("Transfer");
    expect(arg.return_payment_bank).toBe("BCA");
    expect(arg.return_payment_name).toBe("Budi");
    expect(arg.return_payment_number).toBe("1234567890");
    // created_by diambil dari middleware auth, bukan dari badan permintaan.
    expect(arg.created_by).toBe(7);
    expect(arg.created_at).toBeInstanceOf(Date);
  });

  it("mengubah tanggal setor dan tanggal pengembalian menjadi Date", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pengembalian);

    await request(app(repo)).post("/").send({
      date: "2024-05-01",
      return_payment_date: "2024-05-03",
      value: 1000,
    });

    const arg = repo.create.mock.calls[0][0];
    expect(arg.date).toBeInstanceOf(Date);
    expect(arg.date.toISOString()).toBe("2024-05-01T00:00:00.000Z");
    expect(arg.return_payment_date.toISOString()).toBe(
      "2024-05-03T00:00:00.000Z"
    );
  });

  /**
   * CACAT: nominal pengembalian diteruskan tanpa diubah menjadi angka.
   *
   * Bidang lain di domain ini (sales invoice, sales deposit) dibungkus
   * Number() lebih dulu; di sini `value` diambil mentah dari badan permintaan.
   * Klien yang mengirim "250000" sebagai teks membuat teks itu yang sampai ke
   * repository. Akibatnya bergantung pada driver basis data: bisa tersimpan,
   * bisa ditolak, dan yang paling berbahaya — bila kelak nilai ini dijumlahkan
   * di JavaScript, "250000" + 1000 menghasilkan "2500001000", bukan 251000.
   *
   * Perilakunya dikunci apa adanya.
   */
  it("CACAT: nominal berbentuk teks tetap diteruskan sebagai teks", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pengembalian);

    await request(app(repo)).post("/").send({ value: "250000" });

    expect(repo.create.mock.calls[0][0].value).toBe("250000");
    expect(typeof repo.create.mock.calls[0][0].value).toBe("string");
  });

  /**
   * CACAT: tanggal yang tidak dikirim menjadi Invalid Date, bukan ditolak.
   *
   * `new Date(undefined)` menghasilkan Invalid Date, dan controller
   * meneruskannya begitu saja. Tidak ada penjagaan sama sekali di handler ini,
   * jadi satu-satunya penahan adalah skema pada rute. Bila skema itu dilewati
   * — misalnya handler dipakai ulang dari rute lain — baris pengembalian uang
   * tersimpan dengan tanggal kosong, sehingga laporan pengembalian harian
   * tidak akan pernah menampilkannya dan uang pelanggan tidak terlacak.
   */
  it("CACAT: tanggal yang hilang diteruskan sebagai Invalid Date", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(pengembalian);

    await request(app(repo)).post("/").send({ value: 1000 });

    const arg = repo.create.mock.calls[0][0];
    expect(arg.date).toBeInstanceOf(Date);
    expect(Number.isNaN(arg.date.getTime())).toBe(true);
    expect(Number.isNaN(arg.return_payment_date.getTime())).toBe(true);
  });

  it("membalas 500 berisi key i18n bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).post("/").send({ value: 1000 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("PUT /:id — mengubah catatan yang belum dikembalikan", () => {
  const isian = {
    date: "2025-10-10",
    value: 322000,
    customer_id: null,
    payment_method_id: null,
    return_payment_date: "2025-10-10",
    return_payment_method: "Cash",
    return_payment_name: "0",
    return_payment_bank: null,
    return_payment_number: null,
  };

  it("membalas 200 berisi id ketika repository menjawab ok", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue("ok");

    const res = await request(app(repo)).put("/5").send(isian);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 5 });
    const [id, data] = repo.update.mock.calls[0];
    expect(id).toBe(5);
    expect(data.value).toBe(322000);
    expect(data.return_payment_method).toBe("Cash");
    /* Tanggal diteruskan sebagai Date, bukan teks mentah. */
    expect(data.date).toBeInstanceOf(Date);
    expect(data.return_payment_date).toBeInstanceOf(Date);
  });

  it("membalas 404 ketika catatannya tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue("tidak-ada");

    const res = await request(app(repo)).put("/999").send(isian);

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  /*
    409, bukan 404: catatannya ada, keadaannya saja yang sudah bukan itu
    lagi — uangnya telanjur keluar, dan mengubah angka setelah itu berarti
    catatan kas berhenti cocok dengan kenyataan.
  */
  it("membalas 409 ketika catatannya sudah dikembalikan", async () => {
    const repo = repositoryTiruan();
    repo.update.mockResolvedValue("sudah-dikembalikan");

    const res = await request(app(repo)).put("/5").send(isian);

    expect(res.status).toBe(409);
    expect(res.text).toBe(ErrorList["No changes"]);
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.update.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).put("/5").send(isian);

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("GET / — daftar pengembalian", () => {
  it("menerjemahkan halaman, ukuran halaman, dan urutan", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    const res = await request(app(repo)).get(
      "/?page=3&pageSize=25&sortBy=date&sortDirection=descending"
    );

    expect(res.status).toBe(200);
    expect(repo.fetch).toHaveBeenCalledWith({
      page: 3,
      pageSize: 25,
      sortBy: "date",
      sortDirection: "descending",
    });
  });

  it("memakai halaman 1 dan ukuran 10 bila parameternya tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockResolvedValue({ data: [], count: 0 });

    await request(app(repo)).get("/?page=abc&pageSize=9999");

    expect(repo.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 10 })
    );
  });

  /**
   * Balasan galat handler ini mengirim OBJEK Error, bukan key i18n seperti
   * create. Error tidak punya properti yang bisa diserialisasi, jadi yang
   * sampai ke pengguna adalah badan kosong dengan status 500 — tidak ada pesan
   * yang bisa ditampilkan frontend. Dikunci apa adanya.
   */
  it("membalas 500 dengan badan kosong bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetch.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({});
  });
});

describe("GET /:id — satu pengembalian", () => {
  it("mengubah id menjadi angka dan membalas 200", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(pengembalian);

    const res = await request(app(repo)).get("/12");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(pengembalian);
    expect(repo.fetchByID).toHaveBeenCalledWith(12);
  });

  /**
   * CACAT: pengembalian yang tidak ada dibalas 200 dengan badan kosong.
   *
   * Handler tidak memeriksa hasil repository sama sekali. Untuk id yang tidak
   * ada, repository memberi null dan controller mengirimkannya sebagai 200.
   * Frontend yang membedakan "ada" dan "tidak ada" lewat status HTTP akan
   * menganggap datanya ketemu, lalu menampilkan halaman rincian pengembalian
   * uang yang seluruh kolomnya kosong — termasuk nominalnya.
   */
  it("CACAT: membalas 200 badan kosong untuk id yang tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/404");

    expect(res.status).toBe(200);
    expect(res.text).toBe("");
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    expect((await request(app(repo)).get("/12")).status).toBe(500);
  });
});

describe("POST /report — laporan pengembalian per tanggal", () => {
  it("meneruskan tanggal sebagai Date dan membalas 200", async () => {
    const repo = repositoryTiruan();
    repo.fetchReportByDate.mockResolvedValue([pengembalian]);

    const res = await request(app(repo))
      .post("/report")
      .send({ date: "2024-05-01" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([pengembalian]);
    const tanggal = repo.fetchReportByDate.mock.calls[0][0];
    expect(tanggal.toISOString()).toBe("2024-05-01T00:00:00.000Z");
  });

  /**
   * Sama seperti create: tanggal yang hilang menjadi Invalid Date dan tetap
   * diteruskan. Laporannya akan kosong tanpa penjelasan apa pun bagi pengguna.
   */
  it("CACAT: tanggal yang hilang diteruskan sebagai Invalid Date", async () => {
    const repo = repositoryTiruan();
    repo.fetchReportByDate.mockResolvedValue([]);

    await request(app(repo)).post("/report").send({});

    const tanggal = repo.fetchReportByDate.mock.calls[0][0];
    expect(Number.isNaN(tanggal.getTime())).toBe(true);
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchReportByDate.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo))
      .post("/report")
      .send({ date: "2024-05-01" });
    expect(res.status).toBe(500);
  });
});
