import {
  ProductBrandModel,
  ProductBrandViewModel,
} from "../../src/models/product-brand.model";
import { UserViewModel } from "../../src/models/user.model";

/**
 * Perilaku ProductBrandModel.
 *
 * Model ini memakai pola `if boolean ... else if string ...` untuk can_delete —
 * pola yang sama dengan CustomerModel, dan dengan lubang yang sama: tidak ada
 * cabang untuk angka.
 *
 * Selain itu konstruktornya gemar memakai `||` sebagai nilai bawaan, yang
 * membuat sebagian nilai palsu (tanggal karangan) dan sebagian lain lolos
 * mentah tanpa diterjemahkan.
 */

const barisPrisma = {
  id: 33,
  name: "Krakatau Steel",
  created_by: 6,
  created_at: new Date("2023-11-09T01:15:00.000Z"),
  is_delete: false,
  deleted_by: null,
  deleted_at: null,
  can_delete: true,
  user: { id: 6, name: "Petugas Master", username: "master", role: 2 },
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas merek", () => {
    const m = ProductBrandModel.fromMap(barisPrisma);

    expect(m.id).toBe(33);
    expect(m.name).toBe("Krakatau Steel");
    expect(m.created_by).toBe(6);
  });

  it("menyalin created_at asli dari basis data", () => {
    const m = ProductBrandModel.fromMap(barisPrisma);

    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at!.toISOString()).toBe("2023-11-09T01:15:00.000Z");
  });

  it("menyalin jejak penghapusan bila mereknya sudah dihapus", () => {
    const m = ProductBrandModel.fromMap({
      ...barisPrisma,
      is_delete: true,
      deleted_by: 8,
      deleted_at: new Date("2025-06-06T00:00:00.000Z"),
    });

    expect(m.is_delete).toBe(true);
    expect(m.deleted_by).toBe(8);
    expect(m.deleted_at).toEqual(new Date("2025-06-06T00:00:00.000Z"));
  });

  it("menghasilkan instance ProductBrandModel, bukan objek biasa", () => {
    expect(ProductBrandModel.fromMap(barisPrisma)).toBeInstanceOf(
      ProductBrandModel
    );
  });
});

describe("Nilai kosong pada jejak penghapusan", () => {
  it("deleted_by dan deleted_at menjadi null bila merek masih aktif", () => {
    const { deleted_by, deleted_at, ...tanpa } = barisPrisma;
    const m = ProductBrandModel.fromMap(tanpa);

    // `|| null` di konstruktor membuat undefined menjadi null, sehingga
    // kuncinya tetap terkirim ke klien sebagai null yang jelas artinya.
    expect(m.deleted_by).toBeNull();
    expect(m.deleted_at).toBeNull();
  });
});

describe("Penanganan kolom boolean can_delete", () => {
  it("menerima boolean asli", () => {
    expect(
      ProductBrandModel.fromMap({ ...barisPrisma, can_delete: true }).can_delete
    ).toBe(true);
    expect(
      ProductBrandModel.fromMap({ ...barisPrisma, can_delete: false })
        .can_delete
    ).toBe(false);
  });

  it("menerjemahkan teks '1' dan '0' dari MySQL", () => {
    expect(
      ProductBrandModel.fromMap({ ...barisPrisma, can_delete: "1" }).can_delete
    ).toBe(true);
    expect(
      ProductBrandModel.fromMap({ ...barisPrisma, can_delete: "0" }).can_delete
    ).toBe(false);
  });

  it("teks selain '1' dianggap tidak boleh dihapus", () => {
    expect(
      ProductBrandModel.fromMap({ ...barisPrisma, can_delete: "true" })
        .can_delete
    ).toBe(false);
  });

  it("membiarkan can_delete undefined bila tidak dikirim", () => {
    const { can_delete, ...tanpa } = barisPrisma;
    expect(ProductBrandModel.fromMap(tanpa).can_delete).toBeUndefined();
  });

  /**
   * CACAT: kolom TinyInt yang datang sebagai ANGKA hilang sama sekali.
   *
   * Konstruktornya bercabang dua — boolean dipakai apa adanya, teks "1"
   * diterjemahkan — tanpa cabang `else`. Angka tidak cocok dengan keduanya, dan
   * bidangnya TIDAK PERNAH DITUGASI. Nilainya bukan angka mentah, melainkan
   * benar-benar undefined.
   *
   * Akibatnya kunci can_delete lenyap dari balasan HTTP, karena JSON.stringify
   * membuang nilai undefined. Frontend menerima objek merek tanpa bidang itu
   * sama sekali, jadi tombol hapus tidak pernah muncul — tanpa galat di kedua
   * sisi. Query mentah (`$queryRaw`) yang mengembalikan TinyInt sebagai angka
   * memicu tepat keadaan ini.
   */
  it("CACAT: angka 1 dan 0 membuat bidangnya hilang, bukan menjadi boolean", () => {
    const satu = ProductBrandModel.fromMap({ ...barisPrisma, can_delete: 1 });
    const nol = ProductBrandModel.fromMap({ ...barisPrisma, can_delete: 0 });

    expect(satu.can_delete).toBeUndefined();
    expect(nol.can_delete).toBeUndefined();

    // Kuncinya tidak pernah dibuat sama sekali, bukan sekadar bernilai null.
    expect("can_delete" in satu).toBe(false);
    expect(JSON.stringify(satu)).not.toContain("can_delete");
  });
});

describe("Penanganan kolom boolean is_delete", () => {
  it("nilai yang tidak dikirim menjadi false", () => {
    const { is_delete, ...tanpa } = barisPrisma;
    expect(ProductBrandModel.fromMap(tanpa).is_delete).toBe(false);
  });

  /**
   * CACAT: is_delete tidak ikut diterjemahkan seperti can_delete.
   *
   * Konstruktornya hanya menulis `data.is_delete || false`. Berbeda dengan
   * can_delete yang punya percabangan tipe, is_delete lolos mentah: angka 1
   * tetap angka, teks "0" tetap teks.
   *
   * Teks "0" adalah bahayanya. Di JavaScript teks itu truthy, jadi frontend
   * yang memeriksa `if (brand.is_delete)` menyembunyikan merek yang sebenarnya
   * masih aktif. Merek hilang dari daftar pilihan saat membuat produk baru,
   * padahal datanya utuh di basis data.
   */
  it("CACAT: is_delete diteruskan mentah tanpa penerjemahan tipe", () => {
    const angka = ProductBrandModel.fromMap({ ...barisPrisma, is_delete: 1 });
    const teksNol = ProductBrandModel.fromMap({
      ...barisPrisma,
      is_delete: "0",
    });

    expect(angka.is_delete).toBe(1);
    expect(typeof angka.is_delete).toBe("number");

    expect(teksNol.is_delete).toBe("0");
    expect(Boolean(teksNol.is_delete)).toBe(true);
  });
});

describe("created_at yang tidak dikirim", () => {
  /**
   * CACAT: tanggal pembuatan dikarang saat kolomnya kosong.
   *
   * `data.created_at || new Date()` memakai waktu sekarang sebagai bawaan.
   * Berbeda dengan Invalid Date yang setidaknya terlihat rusak, hasil di sini
   * adalah tanggal yang tampak sepenuhnya sah.
   *
   * Akibatnya merek lama yang kolom created_at-nya null di basis data — sisa
   * migrasi data — akan tampil sebagai merek yang baru dibuat hari ini, dan
   * berpindah ke urutan teratas setiap kali daftar diurutkan menurut tanggal.
   */
  it("CACAT: created_at kosong diganti waktu sekarang, bukan null", () => {
    const { created_at, ...tanpa } = barisPrisma;
    const sebelum = Date.now();
    const m = ProductBrandModel.fromMap(tanpa);
    const sesudah = Date.now();

    expect(isNaN(m.created_at!.getTime())).toBe(false);
    expect(m.created_at!.getTime()).toBeGreaterThanOrEqual(sebelum);
    expect(m.created_at!.getTime()).toBeLessThanOrEqual(sesudah);
  });

  it("CACAT: created_at bernilai null juga diganti waktu sekarang", () => {
    const m = ProductBrandModel.fromMap({ ...barisPrisma, created_at: null });
    expect(isNaN(m.created_at!.getTime())).toBe(false);
  });
});

describe("Relasi user pembuat", () => {
  it("menerjemahkan relasi user menjadi UserViewModel", () => {
    const m = ProductBrandModel.fromMap(barisPrisma);

    expect(m.user).toBeInstanceOf(UserViewModel);
    expect(m.user!.id).toBe(6);
    expect(m.user!.name).toBe("Petugas Master");
    expect(m.user!.username).toBe("master");
    expect(m.user!.role).toBe(2);
  });

  it("membiarkan user undefined bila relasinya tidak di-include", () => {
    const { user, ...tanpa } = barisPrisma;
    expect(ProductBrandModel.fromMap(tanpa).user).toBeUndefined();
  });

  it("relasi bernilai null tidak membuat fromMap gagal", () => {
    // Perbandingan longgar `data.user == undefined` ikut menangkap null,
    // sehingga baris hasil left join yang kosong tidak melempar galat.
    expect(
      ProductBrandModel.fromMap({ ...barisPrisma, user: null }).user
    ).toBeUndefined();
  });
});

describe("ProductBrandViewModel", () => {
  it("hanya membawa id dan nama", () => {
    const v = ProductBrandViewModel.fromMap(barisPrisma);

    expect(v).toBeInstanceOf(ProductBrandViewModel);
    expect(v.id).toBe(33);
    expect(v.name).toBe("Krakatau Steel");
    expect(Object.keys(v)).toEqual(["id", "name"]);
  });

  it("membuang bidang lain supaya tidak ikut terkirim saat dipakai sebagai relasi", () => {
    const v = ProductBrandViewModel.fromMap(barisPrisma) as unknown as Record<
      string,
      unknown
    >;

    expect(v.created_by).toBeUndefined();
    expect(v.is_delete).toBeUndefined();
    expect(v.user).toBeUndefined();
  });
});
