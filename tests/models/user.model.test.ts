import { UserModel, UserViewModel } from "../../src/models/user.model";
import UserAvatarModel from "../../src/models/user-avatar.model";
import { UserSalesModel } from "../../src/models/user-sales.model";
import { ProductTypeModel } from "../../src/models/product-type.model";

/**
 * Perilaku UserModel dan UserViewModel.
 *
 * Dua kelas ini menentukan bentuk data pengguna di hampir seluruh balasan HTTP:
 * UserModel untuk halaman manajemen pengguna, UserViewModel untuk relasi
 * "dibuat oleh" yang tertempel di banyak model lain.
 *
 * Yang paling perlu diperhatikan di sini bukan bidang yang hilang, melainkan
 * bidang yang justru IKUT: fromMap menyalin password.
 */

const barisAvatar = {
  id: 5,
  user_id: 10,
  top: 3,
  accessories: 1,
  circle: true,
  clothes: 2,
  color: "#ff0000",
  eyebrows: 4,
  eyes: 6,
  mouth: 7,
};

const barisPrisma = {
  id: 10,
  name: "Daniel",
  username: "daniel",
  nik: "3201234567890001",
  password: "$2b$10$hashrahasiapenggunaini",
  created_by: 1,
  created_at: new Date("2022-09-09T07:00:00.000Z"),
  is_active: true,
  role: 2,
  roleText: "Admin",
  updated_by: 3,
  updated_at: new Date("2025-01-01T00:00:00.000Z"),
  deleted_by: 4,
  deleted_at: new Date("2025-02-02T00:00:00.000Z"),
  user_avatar: barisAvatar,
  user_sales: [
    { id: 1, product_type_id: 2, product_type: { id: 2, name: "Besi Beton" } },
  ],
};

describe("UserModel.fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas pengguna", () => {
    const m = UserModel.fromMap({ ...barisPrisma });

    expect(m.id).toBe(10);
    expect(m.name).toBe("Daniel");
    expect(m.username).toBe("daniel");
    expect(m.nik).toBe("3201234567890001");
  });

  it("menyalin peran dan jejak pembuatan", () => {
    const m = UserModel.fromMap({ ...barisPrisma });

    expect(m.role).toBe(2);
    expect(m.roleText).toBe("Admin");
    expect(m.created_by).toBe(1);
    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at!.toISOString()).toBe("2022-09-09T07:00:00.000Z");
  });

  it("menyalin is_active", () => {
    expect(
      UserModel.fromMap({ ...barisPrisma, is_active: true }).is_active
    ).toBe(true);
    expect(
      UserModel.fromMap({ ...barisPrisma, is_active: false }).is_active
    ).toBe(false);
  });

  it("menghasilkan instance UserModel, bukan objek biasa", () => {
    expect(UserModel.fromMap({ ...barisPrisma })).toBeInstanceOf(UserModel);
  });

  it("created_by boleh null untuk pengguna bawaan sistem", () => {
    expect(
      UserModel.fromMap({ ...barisPrisma, created_by: null }).created_by
    ).toBeNull();
  });

  it("created_at tidak dibungkus new Date, jadi nilai kosong tetap kosong", () => {
    // Berbeda dengan PaymentMethodModel, di sini tidak ada Invalid Date —
    // kuncinya hanya hilang dari balasan.
    const { created_at, ...tanpa } = barisPrisma;
    expect(UserModel.fromMap(tanpa).created_at).toBeUndefined();
  });
});

describe("Password ikut terbawa keluar", () => {
  /**
   * CACAT KEAMANAN: fromMap menyalin password ke objek balasan.
   *
   * Baris pengguna dari Prisma membawa kolom password berisi hash bcrypt.
   * fromMap meneruskannya dan konstruktor menugaskannya, jadi hash itu menjadi
   * bagian sah dari objek — dan ikut terserialkan oleh JSON.stringify.
   *
   * Artinya setiap controller yang mengembalikan UserModel apa adanya
   * membocorkan hash sandi seluruh pengguna ke klien. Hash bcrypt memang tidak
   * langsung bisa dipakai masuk, tetapi ia bisa diserang secara luring tanpa
   * batas percobaan, dan pada daftar pengguna kebocorannya berlipat: satu
   * permintaan mengeluarkan hash semua orang sekaligus. Pengamanannya kini
   * hanya bergantung pada kedisiplinan setiap controller membuang bidang ini —
   * bukan pada modelnya.
   *
   * Bandingkan dengan UserViewModel di bawah, yang justru tidak menyalinnya.
   */
  it("CACAT: password ikut disalin dan ikut terserialkan ke JSON", () => {
    const m = UserModel.fromMap({ ...barisPrisma });

    expect(m.password).toBe("$2b$10$hashrahasiapenggunaini");
    expect(JSON.stringify(m)).toContain("hashrahasiapenggunaini");
  });
});

describe("Bidang yang tidak pernah sampai ke klien", () => {
  /**
   * CACAT: jejak perubahan dan penghapusan tidak pernah disalin.
   *
   * Keempat bidang ini dideklarasikan di kelas UserModel dan ada di antarmuka
   * IUser, tetapi terlewat DUA KALI: fromMap tidak meneruskannya, dan
   * konstruktor pun tidak menugaskannya. Jadi memperbaiki salah satu saja tidak
   * cukup.
   *
   * Akibatnya halaman manajemen pengguna tidak bisa menampilkan kapan sebuah
   * akun terakhir diubah atau kapan dinonaktifkan, dan tidak ada cara
   * membedakan akun yang sudah dihapus lunak dari akun yang masih hidup selain
   * lewat is_active.
   */
  it.each(["updated_by", "updated_at", "deleted_by", "deleted_at"])(
    "CACAT: %s tidak ikut walau ada di baris basis data",
    (bidang) => {
      const m = UserModel.fromMap({ ...barisPrisma }) as unknown as Record<
        string,
        unknown
      >;
      expect(m[bidang]).toBeUndefined();
    }
  );
});

describe("Relasi user_avatar", () => {
  it("menerjemahkan avatar menjadi UserAvatarModel", () => {
    const m = UserModel.fromMap({ ...barisPrisma });

    expect(m.user_avatar).toBeInstanceOf(UserAvatarModel);
    expect(m.user_avatar!.top).toBe(3);
    expect(m.user_avatar!.color).toBe("#ff0000");
  });

  it("membiarkan avatar undefined bila pengguna belum punya avatar", () => {
    const { user_avatar, ...tanpa } = barisPrisma;

    expect(UserModel.fromMap(tanpa).user_avatar).toBeUndefined();
    // Prisma mengembalikan null, bukan undefined, untuk relasi satu-ke-satu
    // yang kosong — perbandingan longgar di fromMap ikut menangkapnya.
    expect(
      UserModel.fromMap({ ...barisPrisma, user_avatar: null }).user_avatar
    ).toBeUndefined();
  });

  /**
   * CACAT: fromMap mengubah objek masukan milik pemanggil.
   *
   * Sebelum membangun modelnya, fromMap menulis
   * `data.user_avatar = UserAvatarModel.fromMap(data.user_avatar)` — menimpa
   * isi baris Prisma yang dikirimkan pemanggil. Lalu nilai yang sudah ditimpa
   * itu dikonversi SEKALI LAGI di dalam pemanggilan konstruktor.
   *
   * Dua akibatnya. Pertama, pemanggil yang masih memakai baris aslinya sesudah
   * itu — misalnya untuk menyimpan kembali atau membandingkan — kini memegang
   * objek yang berbeda dari yang dibacanya dari basis data. Kedua, pada daftar
   * pengguna konversi avatar dikerjakan dua kali per baris tanpa manfaat.
   */
  it("CACAT: baris masukan ikut berubah setelah fromMap dipanggil", () => {
    const baris: any = { ...barisPrisma, user_avatar: { ...barisAvatar } };

    expect(baris.user_avatar).not.toBeInstanceOf(UserAvatarModel);
    UserModel.fromMap(baris);
    expect(baris.user_avatar).toBeInstanceOf(UserAvatarModel);
  });
});

describe("Relasi user_sales", () => {
  /**
   * CACAT: user_sales diteruskan mentah tanpa lewat UserSalesModel.fromMap.
   *
   * Berbeda dengan user_avatar yang dinormalkan, daftar penjualan diteruskan
   * apa adanya dari Prisma. Isinya karena itu objek biasa, bukan UserSalesModel,
   * sehingga penyaringan bidang yang seharusnya dilakukan model tidak terjadi:
   * apa pun yang ikut terbawa relasi product_type — termasuk kolom yang tidak
   * pernah dimaksudkan untuk klien — lolos utuh ke balasan HTTP.
   */
  it("CACAT: isi user_sales bukan instance UserSalesModel", () => {
    const m = UserModel.fromMap({ ...barisPrisma });

    expect(Array.isArray(m.user_sales)).toBe(true);
    expect(m.user_sales![0]).not.toBeInstanceOf(UserSalesModel);
    expect(m.user_sales![0].product_type).not.toBeInstanceOf(ProductTypeModel);
    // Objeknya benar-benar baris Prisma yang sama, bukan salinan hasil model.
    expect(m.user_sales![0]).toBe(barisPrisma.user_sales[0]);
  });

  it("CACAT: kolom asing di dalam product_type ikut bocor ke klien", () => {
    const m = UserModel.fromMap({
      ...barisPrisma,
      user_sales: [
        {
          id: 1,
          product_type_id: 2,
          product_type: {
            id: 2,
            name: "Besi Beton",
            catatan_internal: "rahasia",
          },
        },
      ],
    });

    expect(JSON.stringify(m)).toContain("catatan_internal");
  });

  it("user_sales boleh tidak ada sama sekali", () => {
    const { user_sales, ...tanpa } = barisPrisma;
    expect(UserModel.fromMap(tanpa).user_sales).toBeUndefined();
  });
});

describe("UserViewModel", () => {
  it("hanya membawa id, nama, username, peran, dan avatar", () => {
    const v = UserViewModel.fromMap({ ...barisPrisma });

    expect(v).toBeInstanceOf(UserViewModel);
    expect(v.id).toBe(10);
    expect(v.name).toBe("Daniel");
    expect(v.username).toBe("daniel");
    expect(v.role).toBe(2);
    expect(Object.keys(v)).toEqual([
      "id",
      "name",
      "username",
      "role",
      "user_avatar",
    ]);
  });

  /**
   * Inilah alasan UserViewModel dipakai sebagai relasi di model lain: ia
   * membuang password dan NIK. Dikunci di sini karena justru sifat inilah yang
   * menjaga data sensitif tidak ikut terbawa setiap kali relasi "dibuat oleh"
   * ditempelkan ke faktur, pemasok, atau merek produk.
   */
  it("tidak membawa password maupun nik", () => {
    const v = UserViewModel.fromMap({ ...barisPrisma }) as unknown as Record<
      string,
      unknown
    >;

    expect(v.password).toBeUndefined();
    expect(v.nik).toBeUndefined();
    expect(JSON.stringify(v)).not.toContain("hashrahasiapenggunaini");
  });

  it("menerjemahkan avatar menjadi UserAvatarModel", () => {
    const v = UserViewModel.fromMap({
      ...barisPrisma,
      user_avatar: { ...barisAvatar },
    });

    expect(v.user_avatar).toBeInstanceOf(UserAvatarModel);
  });

  it("avatar yang kosong menjadi null, bukan undefined", () => {
    const { user_avatar, ...tanpa } = barisPrisma;

    // null tetap terkirim sebagai kunci di JSON, sehingga frontend bisa
    // membedakan "belum punya avatar" dari "bidangnya tidak ada".
    expect(UserViewModel.fromMap(tanpa).user_avatar).toBeNull();
    expect(JSON.stringify(UserViewModel.fromMap(tanpa))).toContain(
      '"user_avatar":null'
    );
  });

  /**
   * CACAT: fromMap tidak menjaga masukan kosong.
   *
   * Baris pertama fungsinya langsung membaca `data.user_avatar`, jadi relasi
   * yang tidak di-include melempar TypeError. Model lain yang menempelkan
   * relasi user memanggilnya dengan penjagaan `data.user ? ... : undefined`,
   * tetapi penjagaan itu ada di sisi pemanggil — satu pemanggil yang lupa
   * membuat permintaan berakhir 500 Internal Server Error, bukan sekadar
   * relasi kosong.
   */
  it("CACAT: fromMap(undefined) melempar TypeError, bukan mengembalikan kosong", () => {
    expect(() => UserViewModel.fromMap(undefined)).toThrow(TypeError);
    expect(() => UserViewModel.fromMap(null)).toThrow(TypeError);
  });
});
