import { CompanyModel } from "../../src/models/company.model";

/**
 * Perilaku CompanyModel.
 *
 * Sama seperti model lain di repo ini, `fromMap` menerima baris mentah dari
 * Prisma bertipe `any` — TypeScript tidak menjaga apa pun di sini — lalu
 * memilih bidang mana yang ikut terkirim ke klien.
 *
 * CompanyModel adalah model dengan kebocoran terbanyak di antara model master:
 * tiga bidang penting (id, can_delete, relasi user penghapus) tidak pernah
 * diteruskan, dan created_at dari basis data selalu ditimpa waktu sekarang.
 */

const barisPrisma = {
  id: 12,
  name: "PT Indah Profil",
  address: "Jl. Industri 45",
  npwp: "998877665544332",
  created_by: 2,
  created_at: new Date("2024-03-15T02:00:00.000Z"),
  is_delete: false,
  can_delete: true,
  updated_by: 5,
  updated_at: new Date("2025-01-10T00:00:00.000Z"),
  deleted_by: 7,
  deleted_at: new Date("2025-02-20T00:00:00.000Z"),
  user_company_deleted_byTouser: {
    id: 7,
    name: "Admin",
    username: "admin",
    role: 1,
  },
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin bidang identitas perusahaan", () => {
    const m = CompanyModel.fromMap(barisPrisma);

    expect(m.name).toBe("PT Indah Profil");
    expect(m.address).toBe("Jl. Industri 45");
    expect(m.npwp).toBe("998877665544332");
    expect(m.created_by).toBe(2);
  });

  it("menyalin jejak perubahan dan penghapusan", () => {
    const m = CompanyModel.fromMap(barisPrisma);

    expect(m.updated_by).toBe(5);
    expect(m.updated_at).toEqual(new Date("2025-01-10T00:00:00.000Z"));
    expect(m.deleted_by).toBe(7);
    expect(m.deleted_at).toEqual(new Date("2025-02-20T00:00:00.000Z"));
  });

  it("menghasilkan instance CompanyModel, bukan objek biasa", () => {
    expect(CompanyModel.fromMap(barisPrisma)).toBeInstanceOf(CompanyModel);
  });

  it("npwp boleh null karena kolomnya nullable", () => {
    expect(
      CompanyModel.fromMap({ ...barisPrisma, npwp: null }).npwp
    ).toBeNull();
  });
});

describe("Bidang yang hilang di perjalanan", () => {
  /**
   * CACAT: id tidak pernah diteruskan fromMap.
   *
   * Konstruktornya siap menerima id (ada cabang `if (data.id)`), tetapi fromMap
   * sama sekali tidak mengirimkannya. Setiap perusahaan yang dibaca dari basis
   * data karena itu keluar TANPA id.
   *
   * Akibatnya berat bagi frontend: daftar perusahaan tidak punya kunci untuk
   * baris mana pun, sehingga tombol ubah dan hapus tidak tahu perusahaan mana
   * yang dimaksud. Karena undefined dibuang JSON.stringify, balasan HTTP-nya
   * bahkan tidak memuat kunci "id" — frontend tidak bisa membedakannya dari
   * bidang yang memang tidak ada.
   */
  it("CACAT: id tidak ikut walau ada di baris basis data", () => {
    const m = CompanyModel.fromMap(barisPrisma);

    expect(m.id).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain('"id"');
  });

  /**
   * CACAT: can_delete tidak diteruskan fromMap.
   *
   * Repository menghitung can_delete (boleh tidaknya perusahaan dihapus) dan
   * menempelkannya ke baris, konstruktornya pun menugaskannya. Tetapi fromMap
   * tidak mengirimnya, jadi nilainya selalu undefined.
   *
   * Akibat bagi pengguna: tombol hapus yang bergantung pada bidang ini tidak
   * pernah muncul, atau muncul terus-menerus, tergantung nilai bawaan di sisi
   * frontend. Perhitungan mahal di repository terbuang percuma.
   */
  it("CACAT: can_delete tidak ikut dan lenyap dari JSON", () => {
    const m = CompanyModel.fromMap(barisPrisma);

    expect(m.can_delete).toBeUndefined();
    // Kuncinya tetap ada pada objeknya (ditugasi undefined oleh konstruktor),
    // tetapi hilang saat diserialkan — itulah yang dilihat frontend.
    expect("can_delete" in m).toBe(true);
    expect(JSON.stringify(m)).not.toContain("can_delete");
  });

  /**
   * CACAT: relasi user penghapus tidak pernah diteruskan.
   *
   * Bidang user_company_deleted_byTouser dideklarasikan di kelas dan diisi
   * konstruktor, tetapi fromMap tidak menyalinnya. Halaman riwayat tidak akan
   * pernah bisa menampilkan siapa yang menghapus perusahaan — hanya nomor
   * deleted_by tanpa nama.
   */
  it("CACAT: user_company_deleted_byTouser tidak ikut", () => {
    const m = CompanyModel.fromMap(barisPrisma);
    expect(m.user_company_deleted_byTouser).toBeUndefined();
  });
});

describe("created_at ditimpa waktu sekarang", () => {
  /**
   * CACAT: tanggal pembuatan dari basis data selalu dibuang.
   *
   * Konstruktornya menulis `this.created_at = new Date()` tanpa melihat
   * data.created_at sama sekali. fromMap sudah repot-repot meneruskan nilai
   * aslinya, tetapi nilai itu tidak pernah dipakai.
   *
   * Akibatnya setiap perusahaan tampak baru saja dibuat pada detik permintaan
   * HTTP dijalankan. Kolom "dibuat pada" di layar berubah setiap kali halaman
   * dimuat ulang, pengurutan berdasarkan tanggal menjadi tidak berarti, dan
   * laporan yang menyaring berdasarkan periode pembuatan salah total.
   */
  it("CACAT: created_at mengabaikan nilai basis data dan memakai waktu sekarang", () => {
    const sebelum = Date.now();
    const m = CompanyModel.fromMap(barisPrisma);
    const sesudah = Date.now();

    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at!.getTime()).toBeGreaterThanOrEqual(sebelum);
    expect(m.created_at!.getTime()).toBeLessThanOrEqual(sesudah);

    // Tanggal asli dari basis data tidak berbekas sedikit pun.
    expect(m.created_at!.getFullYear()).not.toBe(2024);
  });

  it("CACAT: baris tanpa created_at pun tetap mendapat tanggal karangan", () => {
    const { created_at, ...tanpa } = barisPrisma;
    const m = CompanyModel.fromMap(tanpa);

    // Bukan Invalid Date, melainkan tanggal yang tampak sah padahal dikarang.
    expect(isNaN(m.created_at!.getTime())).toBe(false);
  });
});

describe("Penanganan kolom boolean is_delete", () => {
  it("menerima boolean asli", () => {
    expect(
      CompanyModel.fromMap({ ...barisPrisma, is_delete: true }).is_delete
    ).toBe(true);
    expect(
      CompanyModel.fromMap({ ...barisPrisma, is_delete: false }).is_delete
    ).toBe(false);
  });

  it("nilai yang tidak dikirim menjadi false", () => {
    const { is_delete, ...tanpa } = barisPrisma;
    expect(CompanyModel.fromMap(tanpa).is_delete).toBe(false);
  });

  /**
   * CACAT: is_delete diteruskan mentah tanpa diterjemahkan menjadi boolean.
   *
   * Konstruktornya hanya menulis `data.is_delete || false`. Itu menjaga nilai
   * kosong, tetapi TIDAK mengubah tipe apa pun: TinyInt MySQL yang datang
   * sebagai angka 1 tetap angka 1, dan teks "0" tetap teks "0".
   *
   * Yang berbahaya adalah teks "0": di JavaScript teks itu TRUTHY. Frontend
   * yang menulis `if (company.is_delete)` akan menganggap perusahaan sudah
   * dihapus padahal kolomnya bernilai nol — perusahaan aktif hilang dari
   * daftar, atau ditandai terhapus di layar tanpa alasan.
   */
  it("CACAT: angka dan teks diteruskan apa adanya, bukan menjadi boolean", () => {
    const angka = CompanyModel.fromMap({ ...barisPrisma, is_delete: 1 });
    const teksNol = CompanyModel.fromMap({ ...barisPrisma, is_delete: "0" });

    expect(angka.is_delete).toBe(1);
    expect(typeof angka.is_delete).toBe("number");

    expect(teksNol.is_delete).toBe("0");
    // Inti masalahnya: nilai "nol" yang justru dianggap benar oleh frontend.
    expect(Boolean(teksNol.is_delete)).toBe(true);
  });
});
