import {
  ProductTypeModel,
  ProductTypeViewModel,
} from "../../src/models/product-type.model";
import { UserViewModel } from "../../src/models/user.model";

/**
 * Perilaku ProductTypeModel dan ProductTypeViewModel.
 *
 * ProductTypeModel adalah bentuk lengkap yang dipakai layar master tipe produk;
 * ProductTypeViewModel adalah bentuk ringkas yang ditempel pada produk.
 *
 * Bedanya dengan CustomerModel penting untuk dipahami: di sini `can_delete`
 * ditugaskan LEBIH DULU apa adanya, baru kemudian ada blok if/else if yang
 * mencoba menerjemahkannya. Karena penugasan awal itu, nilai yang tidak cocok
 * dengan kedua cabang tidak hilang — melainkan bocor mentah-mentah ke klien.
 * Bidangnya bahkan bertipe `boolean | string` di kelasnya, seolah kebocoran itu
 * disengaja.
 */

const barisPrisma = {
  id: 4,
  name: "Besi",
  created_by: 2,
  created_at: new Date("2026-01-05T00:00:00.000Z"),
  updated_by: 3,
  updated_at: new Date("2026-02-06T00:00:00.000Z"),
  deleted_by: null,
  deleted_at: null,
  is_delete: false,
  can_delete: true,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas", () => {
    const m = ProductTypeModel.fromMap(barisPrisma);

    expect(m.id).toBe(4);
    expect(m.name).toBe("Besi");
  });

  it("menyalin jejak pembuatan, perubahan, dan penghapusan", () => {
    const m = ProductTypeModel.fromMap(barisPrisma);

    expect(m.created_by).toBe(2);
    expect(m.created_at).toBe(barisPrisma.created_at);
    expect(m.updated_by).toBe(3);
    expect(m.updated_at).toBe(barisPrisma.updated_at);
    expect(m.deleted_by).toBeNull();
    expect(m.deleted_at).toBeNull();
  });

  it("meneruskan seluruh bidang konstruktor tanpa ada yang tertinggal", () => {
    // Berbeda dengan ProductModel, di sini tidak ada bidang konstruktor yang
    // dilewatkan fromMap. Dikunci supaya penambahan bidang baru kelak tidak
    // diam-diam lupa disambungkan.
    const m = ProductTypeModel.fromMap({
      ...barisPrisma,
      deleted_by: 9,
      deleted_at: new Date("2026-03-07T00:00:00.000Z"),
      is_delete: true,
    });

    expect(m.deleted_by).toBe(9);
    expect(m.deleted_at).toEqual(new Date("2026-03-07T00:00:00.000Z"));
    expect(m.is_delete).toBe(true);
  });

  it("menghasilkan instance ProductTypeModel, bukan objek biasa", () => {
    expect(ProductTypeModel.fromMap(barisPrisma)).toBeInstanceOf(
      ProductTypeModel
    );
  });
});

describe("Penanganan kolom boolean can_delete", () => {
  it("menerima boolean asli", () => {
    expect(
      ProductTypeModel.fromMap({ ...barisPrisma, can_delete: true }).can_delete
    ).toBe(true);
    expect(
      ProductTypeModel.fromMap({ ...barisPrisma, can_delete: false }).can_delete
    ).toBe(false);
  });

  it("menerjemahkan teks '1' dan '0' dari MySQL", () => {
    expect(
      ProductTypeModel.fromMap({ ...barisPrisma, can_delete: "1" }).can_delete
    ).toBe(true);
    expect(
      ProductTypeModel.fromMap({ ...barisPrisma, can_delete: "0" }).can_delete
    ).toBe(false);
  });

  it("membiarkan can_delete undefined bila tidak dikirim", () => {
    const { can_delete, ...tanpa } = barisPrisma;
    expect(ProductTypeModel.fromMap(tanpa).can_delete).toBeUndefined();
  });

  /**
   * CACAT: kolom TinyInt yang datang sebagai ANGKA bocor mentah ke klien.
   *
   * Blok if/else if hanya mengenali boolean dan teks. Angka tidak cocok dengan
   * keduanya, dan karena penugasan awal `this.can_delete = data.can_delete`
   * sudah terjadi lebih dulu, nilainya tetap angka 1 atau 0 — bukan undefined
   * seperti pada CustomerModel, melainkan angka telanjang.
   *
   * Akibatnya bagi frontend: bidangnya ADA di JSON tetapi bertipe angka.
   * Pemeriksaan ketat `can_delete === true` selalu gagal sehingga tombol hapus
   * tidak muncul, sementara pemeriksaan longgar `if (can_delete)` bekerja
   * kebetulan. Dua layar yang menulis pemeriksaannya berbeda akan berperilaku
   * berbeda untuk data yang sama persis.
   */
  it("CACAT: angka 1 dan 0 bocor sebagai angka, bukan boolean", () => {
    const satu = ProductTypeModel.fromMap({ ...barisPrisma, can_delete: 1 });
    const nol = ProductTypeModel.fromMap({ ...barisPrisma, can_delete: 0 });

    expect(satu.can_delete).toBe(1);
    expect(nol.can_delete).toBe(0);
    expect(typeof satu.can_delete).toBe("number");

    // Bidangnya ikut terkirim, jadi frontend tidak bisa membedakannya dari
    // nilai yang sah tanpa memeriksa tipenya sendiri.
    expect(JSON.stringify(satu)).toContain('"can_delete":1');
  });

  /**
   * CACAT: teks selain "1" dan "0" ikut diterjemahkan menjadi false.
   *
   * Cabang teks memakai perbandingan `=== "1"`, jadi "true" atau "TRUE" yang
   * datang dari sumber lain menjadi false — tipe produk yang sebenarnya boleh
   * dihapus tampak terkunci bagi pengguna.
   */
  it("CACAT: teks 'true' menjadi false", () => {
    expect(
      ProductTypeModel.fromMap({ ...barisPrisma, can_delete: "true" })
        .can_delete
    ).toBe(false);
  });
});

describe("Penanganan kolom boolean is_delete", () => {
  it("meneruskan boolean asli", () => {
    expect(
      ProductTypeModel.fromMap({ ...barisPrisma, is_delete: true }).is_delete
    ).toBe(true);
  });

  /**
   * CACAT: is_delete tidak diterjemahkan sama sekali.
   *
   * Berbeda dengan can_delete yang setidaknya punya blok if/else if, is_delete
   * hanya disalin apa adanya. Angka 1 tetap angka, dan yang lebih berbahaya:
   * teks "0" adalah nilai TRUTHY di JavaScript.
   *
   * Akibatnya bagi pengguna: penyaringan sesederhana `if (tipe.is_delete)` di
   * frontend akan menyembunyikan SEMUA tipe produk — daftar tampil kosong dan
   * form produk kehilangan seluruh pilihan tipenya.
   */
  it("CACAT: angka dan teks pada is_delete diteruskan mentah", () => {
    expect(
      ProductTypeModel.fromMap({ ...barisPrisma, is_delete: 1 }).is_delete
    ).toBe(1);

    const teksNol = ProductTypeModel.fromMap({
      ...barisPrisma,
      is_delete: "0",
    });
    expect(teksNol.is_delete).toBe("0");
    expect(Boolean(teksNol.is_delete)).toBe(true);
  });
});

describe("Bidang tanggal", () => {
  it("meneruskan objek Date dari Prisma apa adanya", () => {
    const m = ProductTypeModel.fromMap(barisPrisma);
    expect(m.created_at).toBeInstanceOf(Date);
  });

  it("membiarkan created_at undefined bila tidak dikirim, bukan Invalid Date", () => {
    // Tidak seperti CustomerModel yang membungkus dengan new Date() tanpa
    // penjagaan, di sini nilainya diteruskan langsung — jadi kolom yang tidak
    // di-select tetap undefined dan hilang dari JSON, bukan menjadi null palsu.
    const { created_at, ...tanpa } = barisPrisma;
    expect(ProductTypeModel.fromMap(tanpa).created_at).toBeUndefined();
  });

  /**
   * CACAT: tanggal berbentuk teks tidak pernah diubah menjadi Date.
   *
   * Tipe bidangnya dijanjikan `Date`, tetapi fromMap menerima `any` dan
   * meneruskan apa pun. Bila baris datang dari query mentah (bukan Prisma
   * ORM), created_at tetap berupa teks.
   *
   * Akibatnya bagi kode pemanggil: `model.created_at.getTime()` melempar
   * TypeError, dan format tanggal di frontend berbeda antara endpoint yang
   * memakai Prisma dan yang memakai query mentah.
   */
  it("CACAT: teks tanggal tetap teks, bukan Date", () => {
    const m = ProductTypeModel.fromMap({
      ...barisPrisma,
      created_at: "2026-01-05 00:00:00",
    });

    expect(typeof m.created_at).toBe("string");
    expect(m.created_at).not.toBeInstanceOf(Date);
  });
});

describe("Relasi bersarang user pembuat", () => {
  const barisUser = {
    id: 2,
    name: "Admin Gudang",
    username: "admin",
    role: 1,
  };

  it("memetakan user_item_type_created_byTouser menjadi UserViewModel", () => {
    const m = ProductTypeModel.fromMap({
      ...barisPrisma,
      user_item_type_created_byTouser: barisUser,
    });

    expect(m.user_item_type_created_byTouser).toBeInstanceOf(UserViewModel);
    expect(m.user_item_type_created_byTouser?.name).toBe("Admin Gudang");
    expect(m.user_item_type_created_byTouser?.username).toBe("admin");
    expect(m.user_item_type_created_byTouser?.role).toBe(1);
  });

  it("tidak memasang relasi user bila tidak di-include", () => {
    const m = ProductTypeModel.fromMap(barisPrisma);
    expect(m.user_item_type_created_byTouser).toBeUndefined();
  });

  it("memperlakukan relasi user bernilai null sebagai tidak ada", () => {
    const m = ProductTypeModel.fromMap({
      ...barisPrisma,
      user_item_type_created_byTouser: null,
    });
    expect(m.user_item_type_created_byTouser).toBeUndefined();
  });

  it("tidak membocorkan kolom user selain id, nama, username, peran, dan avatar", () => {
    const m = ProductTypeModel.fromMap({
      ...barisPrisma,
      user_item_type_created_byTouser: {
        ...barisUser,
        password: "hash-rahasia",
        nik: "3273xxxx",
      },
    });

    expect(Object.keys(m.user_item_type_created_byTouser as object)).toEqual([
      "id",
      "name",
      "username",
      "role",
      "user_avatar",
    ]);
    expect(JSON.stringify(m)).not.toContain("hash-rahasia");
  });
});

describe("ProductTypeViewModel: bentuk ringkas", () => {
  it("hanya membawa id dan nama", () => {
    const v = ProductTypeViewModel.fromMap({
      id: 4,
      name: "Besi",
      created_by: 2,
      is_delete: false,
    });

    expect(v).toBeInstanceOf(ProductTypeViewModel);
    expect(v.id).toBe(4);
    expect(v.name).toBe("Besi");
    expect(Object.keys(v)).toEqual(["id", "name"]);
  });

  it("tidak membocorkan kolom lain dari baris basis data", () => {
    const v = ProductTypeViewModel.fromMap({
      id: 4,
      name: "Besi",
      can_delete: true,
    }) as unknown as Record<string, unknown>;

    expect(v.can_delete).toBeUndefined();
  });
});
