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
   * id sempat tidak diteruskan fromMap sama sekali, sehingga setiap perusahaan
   * sampai ke frontend tanpa kunci apa pun dan tombol ubah maupun hapus tidak
   * tahu baris mana yang dimaksud. Diperbaiki; tes ini menjaganya.
   */
  it("meneruskan id, dan id itu ikut terserialkan", () => {
    const m = CompanyModel.fromMap(barisPrisma);

    expect(m.id).toBe(12);
    expect(JSON.parse(JSON.stringify(m)).id).toBe(12);
  });

  /**
   * can_delete dihitung repository lalu sempat terbuang di fromMap, sehingga
   * perhitungannya percuma dan tombol hapus tidak pernah dapat sinyal yang
   * benar. Diperbaiki.
   */
  it("meneruskan can_delete yang dihitung repository", () => {
    const m = CompanyModel.fromMap(barisPrisma);

    expect(m.can_delete).toBe(true);
    expect(JSON.parse(JSON.stringify(m)).can_delete).toBe(true);
  });

  /**
   * Relasi penghapus sempat tidak diteruskan, jadi halaman riwayat hanya bisa
   * menampilkan nomor deleted_by tanpa nama. Diperbaiki.
   */
  it("meneruskan relasi user penghapus bila ada", () => {
    const m = CompanyModel.fromMap(barisPrisma);
    expect(m.user_company_deleted_byTouser).toEqual(
      barisPrisma.user_company_deleted_byTouser
    );
  });

  it("membiarkan relasi penghapus undefined bila tidak dimuat", () => {
    const { user_company_deleted_byTouser, ...tanpa } = barisPrisma;
    expect(
      CompanyModel.fromMap(tanpa).user_company_deleted_byTouser
    ).toBeUndefined();
  });
});

describe("created_at berasal dari basis data", () => {
  /**
   * Konstruktornya sempat menulis `this.created_at = new Date()` tanpa melihat
   * data sama sekali, sehingga nilai yang sudah repot-repot diteruskan fromMap
   * selalu dibuang. Setiap perusahaan tampak baru dibuat pada detik permintaan
   * HTTP berlangsung: kolom "dibuat pada" berubah tiap kali halaman dimuat
   * ulang, dan laporan yang menyaring berdasarkan periode pembuatan salah
   * total. Diperbaiki; tes ini menjaganya.
   */
  it("memakai tanggal dari baris, bukan waktu sekarang", () => {
    const m = CompanyModel.fromMap(barisPrisma);

    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at!.toISOString()).toBe(
      barisPrisma.created_at.toISOString()
    );
  });

  it("tidak mengarang tanggal untuk baris yang tidak membawanya", () => {
    const { created_at, ...tanpa } = barisPrisma;
    // Lebih jujur undefined daripada tanggal karangan yang tampak sah:
    // frontend bisa membedakannya dari tanggal yang memang terisi.
    expect(CompanyModel.fromMap(tanpa).created_at).toBeUndefined();
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
