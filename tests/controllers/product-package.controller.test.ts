import express from "express";
import request from "supertest";
import ErrorList from "../../src/constants/error-list.constant";

/**
 * Perilaku ProductPackageController.
 *
 * Bentuknya mengikuti tests/controllers/company.controller.test.ts: repository
 * ditiru dan disuntikkan lewat konstruktor, lalu yang diperiksa adalah
 * keputusan controller-nya.
 *
 * Controller ini menyentuh tiga layanan luar yang semuanya ditiru di sini:
 *
 *   utils/socket.helper — aslinya memanggil getIO() yang MELEMPAR bila initIO
 *                         belum dipanggil; tanpa tiruan, penghapusan paket
 *                         yang berhasil justru berakhir sebagai galat.
 *   utils/meili.helper  — memanggil initializeMeiliSearch() begitu modulnya
 *                         dimuat, jadi tanpa tiruan tes akan menghubungi
 *                         Meilisearch sungguhan.
 *   utils/queue.helper  — membuat Queue BullMQ yang membuka koneksi Redis.
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

const cariMeili = jest.fn();
const tambahDokumen = jest.fn();
const hapusDokumen = jest.fn();
jest.mock("../../src/utils/meili.helper", () => ({
  __esModule: true,
  meili: {
    index: (nama: string) => ({
      search: (...args: unknown[]) => cariMeili(nama, ...args),
      addDocuments: (...args: unknown[]) => tambahDokumen(nama, ...args),
      deleteDocument: (...args: unknown[]) => hapusDokumen(nama, ...args),
    }),
  },
}));

const tambahAntrian = jest.fn();
jest.mock("../../src/utils/queue.helper", () => ({
  __esModule: true,
  queue: {
    add: (...args: unknown[]) => tambahAntrian(...args),
  },
}));

import ProductPackageController from "../../src/controllers/product-package.controller";

/** Repository tiruan: tiap method adalah jest.fn() yang bisa diatur per tes. */
function repositoryTiruan() {
  return {
    create: jest.fn(),
    update: jest.fn(),
    updateSalesPrice: jest.fn(),
    delete: jest.fn(),
    fetchByID: jest.fn(),
  };
}

type Repo = ReturnType<typeof repositoryTiruan>;

function controller(repo: Repo) {
  return new ProductPackageController(repo as never);
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
  a.put("/sales-price", c.updateSalesPrice);
  a.delete("/:id", c.delete);
  a.get("/:id", c.fetchByID);
  a.get("/", c.fetch);
  return a;
}

/** Balasan tiruan untuk pemanggilan handler langsung (tanpa lewat HTTP). */
function resTiruan() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
}

function isiPaket() {
  return [
    {
      product_id: 5,
      product_unit_id: null,
      quantity: 2,
      price: 1500,
      discount: 0,
      product: {
        id: 5,
        reference: "PRD-001",
        description: "Pipa PVC 3 inci",
        unit: "batang",
      },
      product_unit: null,
    },
  ];
}

function paket(ubah: Record<string, unknown> = {}) {
  return {
    id: 3,
    name: "Paket Hemat",
    description: "Dua pipa sekaligus",
    price: 3000,
    is_delete: false,
    package_content: isiPaket(),
    ...ubah,
  };
}

beforeEach(() => {
  kirimSocket.mockReset();
  cariMeili.mockReset();
  tambahDokumen.mockReset();
  hapusDokumen.mockReset();
  tambahAntrian.mockReset();
  process.env.LIMIT = "10";
});

describe("POST / — membuat paket", () => {
  it("membalas 201 dan mengirim paket hasil repository", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(paket());

    const res = await request(app(repo)).post("/").send({
      name: "Paket Hemat",
      description: "Dua pipa sekaligus",
      price: 3000,
      package_content: isiPaket(),
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(paket());
  });

  it("meneruskan userId sebagai created_by dan memangkas isi paket ke empat bidang", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(paket());

    await request(app(repo))
      .post("/")
      .send({
        name: "Paket Hemat",
        description: "Dua pipa sekaligus",
        price: 3000,
        userId: 7,
        package_content: [
          {
            product_id: 5,
            product_unit_id: 9,
            quantity: 2,
            price: 1500,
            // Bidang berikut sengaja disertakan; controller harus membuangnya.
            discount: 250,
            catatan: "abaikan",
          },
        ],
      });

    expect(repo.create).toHaveBeenCalledWith({
      name: "Paket Hemat",
      description: "Dua pipa sekaligus",
      price: 3000,
      created_by: 7,
      created_at: expect.any(Date),
      package_content: [
        { product_id: 5, product_unit_id: 9, quantity: 2, price: 1500 },
      ],
    });
  });

  /**
   * CACAT: potongan harga per baris isi paket DIBUANG saat penyimpanan.
   *
   * Pemetaan package_content hanya menyalin product_id, product_unit_id,
   * quantity, dan price. Bidang `discount` yang dikirim frontend tidak ikut
   * diteruskan, padahal PackageCodeModel dan pembacaan daftar paket
   * membacanya kembali.
   *
   * Akibat bagi pengguna: diskon yang diisi operator saat membuat paket hilang
   * tanpa peringatan, dan paketnya tersimpan dengan harga penuh.
   */
  it("CACAT: discount pada isi paket tidak ikut disimpan", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(paket());

    await request(app(repo))
      .post("/")
      .send({
        name: "Paket Hemat",
        description: "-",
        price: 3000,
        package_content: [
          {
            product_id: 5,
            product_unit_id: null,
            quantity: 2,
            price: 1500,
            discount: 250,
          },
        ],
      });

    const dikirim = repo.create.mock.calls[0][0] as {
      package_content: Record<string, unknown>[];
    };
    expect(dikirim.package_content[0]).not.toHaveProperty("discount");
  });

  it("mengindeks paket baru ke Meilisearch", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(paket());

    await request(app(repo)).post("/").send({
      name: "Paket Hemat",
      description: "-",
      price: 3000,
      package_content: isiPaket(),
    });

    expect(tambahDokumen).toHaveBeenCalledWith("package", [paket()]);
  });

  it("membalas 500 bila repository gagal", async () => {
    const repo = repositoryTiruan();
    repo.create.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).post("/").send({
      name: "Paket Hemat",
      description: "-",
      price: 3000,
      package_content: isiPaket(),
    });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(tambahDokumen).not.toHaveBeenCalled();
  });

  /**
   * CACAT: kegagalan pengindeksan dilaporkan sebagai kegagalan pembuatan.
   *
   * Paketnya sudah tersimpan di basis data sebelum addDocuments dipanggil.
   * Bila Meilisearch sedang tidak bisa dihubungi, pengguna menerima 500 dan
   * mengira paketnya gagal dibuat.
   *
   * Akibat bagi pengguna: paket itu sebenarnya ADA, tetapi tidak muncul di
   * daftar (daftar dibaca dari indeks Meilisearch, bukan dari basis data).
   * Operator membuatnya lagi, dan sekarang ada dua paket kembar yang keduanya
   * tak terlihat sampai indeksnya dibangun ulang.
   */
  it("CACAT: 500 saat pengindeksan gagal, padahal paketnya terlanjur tersimpan", async () => {
    const repo = repositoryTiruan();
    repo.create.mockResolvedValue(paket());
    tambahDokumen.mockRejectedValue(new Error("meili mati"));

    const res = await request(app(repo)).post("/").send({
      name: "Paket Hemat",
      description: "-",
      price: 3000,
      package_content: isiPaket(),
    });

    expect(res.status).toBe(500);
    expect(repo.create).toHaveBeenCalled();
  });
});

describe("PUT / — mengubah paket", () => {
  it("membalas 200 dan meneruskan bidang yang diubah", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket());
    repo.update.mockResolvedValue(paket({ name: "Paket Hemat Baru" }));

    const res = await request(app(repo))
      .put("/")
      .send({ id: 3, name: "Paket Hemat Baru", description: "-", price: 3500 });

    // Perhatikan: create membalas 201, update membalas 200.
    expect(res.status).toBe(200);
    expect(repo.update).toHaveBeenCalledWith({
      id: 3,
      name: "Paket Hemat Baru",
      description: "-",
      price: 3500,
      created_by: 99,
      created_at: expect.any(Date),
    });
  });

  it("menjadwalkan pengindeksan ulang setelah perubahan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket());
    repo.update.mockResolvedValue(paket());

    await request(app(repo))
      .put("/")
      .send({ id: 3, name: "A", description: "-", price: 1 });

    expect(tambahAntrian).toHaveBeenCalledWith("package-updated", { id: 3 });
  });

  it("membalas 404 bila paketnya tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo))
      .put("/")
      .send({ id: 3, name: "A", description: "-", price: 1 });

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Product package not found"]);
    expect(repo.update).not.toHaveBeenCalled();
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  it("membalas 500 bila penyimpanan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket());
    repo.update.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo))
      .put("/")
      .send({ id: 3, name: "A", description: "-", price: 1 });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  /**
   * CACAT: paket yang sudah dihapus masih bisa diubah.
   *
   * delete memeriksa `packageCode.is_delete` sebelum bertindak; update hanya
   * memeriksa apakah barisnya ada. Baris paket yang terhapus masih tersimpan
   * (penghapusannya lunak), jadi pemeriksaannya lolos.
   *
   * Akibat bagi pengguna: nama dan harga paket yang sudah dihapus bisa
   * diubah, lalu pekerjaan "package-updated" dijadwalkan untuknya — sehingga
   * paket yang sudah dihapus berpeluang MUNCUL KEMBALI di indeks pencarian
   * dan bisa dipilih lagi ke dalam transaksi.
   */
  it("CACAT: update menerima paket yang sudah dihapus dan mengindeksnya ulang", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket({ is_delete: true }));
    repo.update.mockResolvedValue(paket({ is_delete: true }));

    const res = await request(app(repo))
      .put("/")
      .send({ id: 3, name: "Hidup Lagi", description: "-", price: 1 });

    expect(res.status).toBe(200);
    expect(repo.update).toHaveBeenCalled();
    expect(tambahAntrian).toHaveBeenCalledWith("package-updated", { id: 3 });
  });
});

describe("PUT /sales-price — perubahan harga paket", () => {
  it("meneruskan daftar apa adanya dan membalas 201", async () => {
    const repo = repositoryTiruan();
    const daftar = [
      { package_code_id: 3, price: 3500 },
      { package_code_id: 4, price: 4500 },
    ];
    repo.updateSalesPrice.mockResolvedValue({ count: 2 });

    const res = await request(app(repo))
      .put("/sales-price")
      .send({ items: daftar });

    expect(res.status).toBe(201);
    // Berbeda dengan create, di sini tidak ada pemangkasan bidang sama sekali.
    expect(repo.updateSalesPrice).toHaveBeenCalledWith(daftar);
  });

  it("menjadwalkan satu pekerjaan pengindeksan per paket", async () => {
    const repo = repositoryTiruan();
    repo.updateSalesPrice.mockResolvedValue({ count: 2 });

    await request(app(repo))
      .put("/sales-price")
      .send({
        items: [{ package_code_id: 3 }, { package_code_id: 4 }],
      });

    expect(tambahAntrian).toHaveBeenCalledTimes(2);
    expect(tambahAntrian).toHaveBeenNthCalledWith(1, "package-updated", {
      id: 3,
    });
    expect(tambahAntrian).toHaveBeenNthCalledWith(2, "package-updated", {
      id: 4,
    });
  });

  it("membalas 500 bila penyimpanan gagal", async () => {
    const repo = repositoryTiruan();
    repo.updateSalesPrice.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo))
      .put("/sales-price")
      .send({ items: [{ package_code_id: 3 }] });

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(tambahAntrian).not.toHaveBeenCalled();
  });

  /**
   * CACAT: badan tanpa `items` dilaporkan sebagai galat server.
   *
   * `items` langsung diteruskan ke repository lalu di-iterasi dengan for..of.
   * Bila bidang itu tidak dikirim, yang terjadi adalah TypeError yang
   * tertangkap try dan menjadi 500 — bukan 400 yang menjelaskan bidang mana
   * yang kurang. Pesannya sama persis dengan pesan "basis data bermasalah",
   * sehingga operator tidak punya petunjuk apa pun untuk memperbaikinya.
   */
  it("CACAT: 500 saat items tidak dikirim, bukan 400", async () => {
    const repo = repositoryTiruan();
    repo.updateSalesPrice.mockResolvedValue(undefined);

    const res = await request(app(repo)).put("/sales-price").send({});

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });
});

describe("DELETE /:id — penjagaan sebelum menghapus", () => {
  it("menghapus, mencabut dari indeks, dan mengabarkan lewat socket", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket());
    repo.delete.mockResolvedValue(paket({ is_delete: true }));

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(200);
    expect(repo.delete).toHaveBeenCalledWith(3, 99);
    expect(hapusDokumen).toHaveBeenCalledWith("package", 3);
    expect(kirimSocket).toHaveBeenCalledWith(
      "deleteItemPackage",
      expect.objectContaining({ is_delete: true })
    );
  });

  it("membalas 404 bila paketnya tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  it("membalas 404 bila paketnya sudah dihapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket({ is_delete: true }));

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(404);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(hapusDokumen).not.toHaveBeenCalled();
  });

  it("membalas 404 bila repository tidak mengembalikan hasil penghapusan", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket());
    repo.delete.mockResolvedValue(null);

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(404);
    expect(hapusDokumen).not.toHaveBeenCalled();
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  it("membalas 500 dan tidak mengirim socket bila penghapusan gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket());
    repo.delete.mockRejectedValue(new Error("gagal"));

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
    expect(kirimSocket).not.toHaveBeenCalled();
  });

  /**
   * CACAT: penghapusan yang sudah terjadi di basis data dilaporkan gagal bila
   * pencabutan indeks gagal.
   *
   * Urutannya: hapus di basis data, cabut dari Meilisearch, baru kirim socket.
   * Kegagalan pada langkah kedua membuat langkah ketiga tidak pernah jalan
   * dan balasannya menjadi 500.
   *
   * Akibat bagi pengguna: paketnya SUDAH terhapus, tetapi layar bertuliskan
   * gagal, dan klien lain tidak menerima kabar apa pun karena socket-nya tidak
   * jadi dikirim. Paket itu juga tetap tertinggal di indeks sehingga masih
   * muncul di pencarian dan bisa dipilih ke dalam transaksi baru.
   */
  it("CACAT: 500 dan tanpa socket saat pencabutan indeks gagal, padahal datanya sudah terhapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket());
    repo.delete.mockResolvedValue(paket({ is_delete: true }));
    hapusDokumen.mockRejectedValue(new Error("meili mati"));

    const res = await request(app(repo)).delete("/3");

    expect(res.status).toBe(500);
    expect(repo.delete).toHaveBeenCalledWith(3, 99);
    expect(kirimSocket).not.toHaveBeenCalled();
  });
});

describe("GET /:id", () => {
  it("membalas 200 dengan paket yang diminta", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket());

    const res = await request(app(repo)).get("/3");

    expect(res.status).toBe(200);
    expect(repo.fetchByID).toHaveBeenCalledWith(3);
    expect(res.body).toEqual(paket());
  });

  it("membalas 404 bila paketnya tidak ada", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(null);

    const res = await request(app(repo)).get("/3");

    expect(res.status).toBe(404);
    expect(res.text).toBe(ErrorList["Not found"]);
  });

  it("membalas 500 bila kueri gagal", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockRejectedValue(new Error("koneksi putus"));

    const res = await request(app(repo)).get("/3");

    expect(res.status).toBe(500);
    expect(res.text).toBe(ErrorList["Internal server error"]);
  });

  /**
   * CACAT: paket yang sudah dihapus tetap dikirim dengan status 200.
   *
   * Sama seperti update, fetchByID hanya memeriksa keberadaan barisnya.
   * Akibat bagi pengguna: tautan lama ke halaman detail paket yang sudah
   * dihapus tetap menampilkan paket itu seolah masih berlaku, lengkap dengan
   * harganya.
   */
  it("CACAT: fetchByID membalas 200 untuk paket yang sudah dihapus", async () => {
    const repo = repositoryTiruan();
    repo.fetchByID.mockResolvedValue(paket({ is_delete: true }));

    const res = await request(app(repo)).get("/3");

    expect(res.status).toBe(200);
    expect(res.body.is_delete).toBe(true);
  });
});

describe("GET / — daftar paket dari Meilisearch", () => {
  function dokumen(ubah: Record<string, unknown> = {}) {
    return {
      id: 3,
      name: "Paket Hemat",
      description: "Dua pipa sekaligus",
      price: 3000,
      package_content: [
        {
          product_id: 5,
          product_unit_id: 9,
          quantity: 2,
          price: 1500,
          discount: 250,
          product: {
            id: 5,
            reference: "PRD-001",
            description: "Pipa PVC 3 inci",
            unit: "batang",
          },
          product_unit: { id: 9, conversion: 10, unit: "dus" },
        },
      ],
      ...ubah,
    };
  }

  it("menerjemahkan halaman dan kata kunci menjadi limit dan offset", async () => {
    const repo = repositoryTiruan();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

    const res = await request(app(repo)).get("/?page=3&keyword=hemat");

    expect(res.status).toBe(200);
    expect(cariMeili).toHaveBeenCalledWith("package", "hemat", {
      limit: 10,
      offset: 20,
    });
  });

  it("memakai halaman 1 bila parameter halamannya tidak masuk akal", async () => {
    const repo = repositoryTiruan();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

    await request(app(repo)).get("/?page=abc");

    expect(cariMeili).toHaveBeenCalledWith("package", "", {
      limit: 10,
      offset: 0,
    });
  });

  it("kata kunci berisi persen tetap dicari, tidak menggagalkan permintaan", async () => {
    const repo = repositoryTiruan();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

    const res = await request(app(repo)).get("/?keyword=%25");

    expect(res.status).toBe(200);
    expect(cariMeili).toHaveBeenCalledWith("package", "%", expect.anything());
  });

  it("mengubah dokumen indeks menjadi bentuk PackageCodeModel", async () => {
    const repo = repositoryTiruan();
    cariMeili.mockResolvedValue({
      hits: [dokumen()],
      estimatedTotalHits: 7,
    });

    const res = await request(app(repo)).get("/");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(7);
    expect(res.body.data[0]).toMatchObject({
      id: 3,
      name: "Paket Hemat",
      package_content: [
        {
          product_id: 5,
          quantity: 2,
          discount: 250,
          product_unit: { id: 9, conversion: 10, unit: "dus" },
        },
      ],
    });
  });

  /**
   * CACAT: is_delete pada daftar paket ditulis mati sebagai false.
   *
   * Barisnya memang diberi komentar "Assuming is_delete is false", dan
   * pencarian ini TIDAK memakai saringan apa pun ke Meilisearch — berbeda
   * dengan daftar produk yang menyaring `is_delete = false`.
   *
   * Akibat bagi pengguna: paket yang gagal dicabut dari indeks (lihat cacat
   * pada DELETE di atas) tetap muncul di daftar dan dilaporkan sebagai paket
   * aktif, karena bendera aslinya tidak pernah dibaca.
   */
  it("CACAT: paket terhapus di indeks tetap dilaporkan aktif dan tidak disaring", async () => {
    const repo = repositoryTiruan();
    cariMeili.mockResolvedValue({
      hits: [dokumen({ is_delete: true })],
      estimatedTotalHits: 1,
    });

    const res = await request(app(repo)).get("/");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].is_delete).toBe(false);
    // Tidak ada saringan yang dikirim ke Meilisearch sama sekali.
    expect(cariMeili).toHaveBeenCalledWith("package", "", {
      limit: 10,
      offset: 0,
    });
  });

  /**
   * CACAT: process.env.LIMIT yang tidak diset menjadi NaN, bukan nilai
   * bawaan.
   *
   * pageSize dihitung dengan `Number(process.env.LIMIT!)`. Tanda seru itu
   * hanya menenangkan pemeriksa tipe; saat berjalan, variabel yang kosong
   * menghasilkan NaN, dan limit maupun offset yang dikirim ke Meilisearch
   * ikut menjadi NaN.
   *
   * Akibat bagi pengguna: pada lingkungan yang lupa menyetel LIMIT, daftar
   * paket tidak menampilkan apa pun — bukan galat yang bisa ditelusuri,
   * melainkan halaman kosong tanpa penjelasan. Bandingkan dengan daftar
   * produk yang memakai translatePageSize dan punya nilai bawaan 10.
   */
  it("CACAT: limit dan offset menjadi NaN bila LIMIT tidak diset", async () => {
    const repo = repositoryTiruan();
    cariMeili.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });
    delete process.env.LIMIT;

    await request(app(repo)).get("/?page=2");

    expect(cariMeili).toHaveBeenCalledWith("package", "", {
      limit: NaN,
      offset: NaN,
    });
  });

  /**
   * CACAT BERAT: fetch sama sekali tidak punya penanganan galat.
   *
   * Semua handler lain di berkas ini membungkus pekerjaannya dengan
   * try/catch. fetch tidak. Karena ia async, kegagalan Meilisearch menjadi
   * promise yang ditolak dan tidak ada yang menangkapnya — Express 4 tidak
   * menangani penolakan promise, dan Node 15 ke atas menghentikan proses pada
   * unhandled rejection.
   *
   * Akibat bagi pengguna: satu kali membuka halaman daftar paket saat
   * Meilisearch sedang tidak sehat MEMATIKAN SELURUH SERVER, bukan sekadar
   * menampilkan galat pada satu pemanggil.
   *
   * Diuji dengan memanggil handler langsung: lewat HTTP permintaannya
   * menggantung tanpa balasan sampai tes kehabisan waktu.
   */
  it("CACAT: fetch menolak tanpa membalas apa pun saat Meilisearch gagal", async () => {
    const repo = repositoryTiruan();
    cariMeili.mockRejectedValue(new Error("meili mati"));
    const c = controller(repo);

    const req = { query: {}, params: {}, body: {} } as never;
    const res = resTiruan();

    await expect(c.fetch(req, res as never)).rejects.toThrow("meili mati");
    // Tidak ada balasan yang pernah dikirim — permintaannya menggantung.
    expect(res.status).not.toHaveBeenCalled();
  });

  /**
   * CACAT: dokumen indeks yang tidak lengkap juga menjatuhkan proses.
   *
   * Pemetaannya membaca `x.package_content.map` dan `item.product.id` tanpa
   * penjagaan apa pun. Dokumen lama yang terindeks sebelum bidang itu ada
   * membuat pemetaannya melempar — dan karena fetch tidak punya try/catch,
   * akibatnya sama dengan cacat di atas: proses berhenti, bukan sekadar satu
   * permintaan gagal.
   */
  it("CACAT: dokumen tanpa package_content menolak tanpa membalas", async () => {
    const repo = repositoryTiruan();
    cariMeili.mockResolvedValue({
      hits: [dokumen({ package_content: undefined })],
      estimatedTotalHits: 1,
    });
    const c = controller(repo);

    const req = { query: {}, params: {}, body: {} } as never;
    const res = resTiruan();

    await expect(c.fetch(req, res as never)).rejects.toThrow(TypeError);
    // res.status(200) sempat dipanggil karena ia dievaluasi lebih dulu, tetapi
    // badan balasannya tidak pernah selesai dibangun sehingga send() tidak
    // pernah jalan — pemanggilnya tetap tidak menerima apa pun.
    expect(res.send).not.toHaveBeenCalled();
  });
});
