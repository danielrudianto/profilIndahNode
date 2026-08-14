import UserAvatarModel from "../../src/models/user-avatar.model";
import { UserViewModel } from "../../src/models/user.model";

/**
 * Perilaku UserAvatarModel.
 *
 * Avatar disimpan sebagai kumpulan angka pilihan gambar (rambut, mata, baju)
 * ditambah satu kolom boolean `circle` yang menentukan apakah avatar digambar
 * di dalam lingkaran berwarna.
 *
 * fromMap-nya termasuk yang paling lengkap di repo ini — semua kolom disalin,
 * tidak ada yang terlewat, dan relasi user dijaga dengan benar. Satu-satunya
 * lubang adalah `circle`, yang diteruskan mentah tanpa penerjemahan tipe.
 */

const barisPrisma = {
  id: 5,
  user_id: 10,
  top: 3,
  accessories: 1,
  circle: true,
  clothes: 2,
  color: "#00aaff",
  eyebrows: 4,
  eyes: 6,
  mouth: 7,
  user: { id: 10, name: "Daniel", username: "daniel", role: 2 },
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin kunci dan pemilik avatar", () => {
    const m = UserAvatarModel.fromMap(barisPrisma);

    expect(m.id).toBe(5);
    expect(m.user_id).toBe(10);
  });

  it("menyalin seluruh pilihan gambar", () => {
    const m = UserAvatarModel.fromMap(barisPrisma);

    expect(m.top).toBe(3);
    expect(m.accessories).toBe(1);
    expect(m.clothes).toBe(2);
    expect(m.eyebrows).toBe(4);
    expect(m.eyes).toBe(6);
    expect(m.mouth).toBe(7);
    expect(m.color).toBe("#00aaff");
  });

  it("tidak ada bidang konstruktor yang terlewat oleh fromMap", () => {
    // Setiap bidang yang diterima konstruktor benar-benar diisi fromMap —
    // berbeda dengan CompanyModel atau SupplierModel yang menyisakan lubang.
    const m = UserAvatarModel.fromMap(barisPrisma);

    expect(Object.keys(m).sort()).toEqual(
      [
        "accessories",
        "circle",
        "clothes",
        "color",
        "eyebrows",
        "eyes",
        "id",
        "mouth",
        "top",
        "user",
        "user_id",
      ].sort()
    );
  });

  it("menghasilkan instance UserAvatarModel, bukan objek biasa", () => {
    expect(UserAvatarModel.fromMap(barisPrisma)).toBeInstanceOf(
      UserAvatarModel
    );
  });

  it("avatar yang baru dibentuk sebelum disimpan boleh tanpa id dan user_id", () => {
    const { id, user_id, ...tanpa } = barisPrisma;
    const m = UserAvatarModel.fromMap(tanpa);

    expect(m.id).toBeUndefined();
    expect(m.user_id).toBeUndefined();
    // Bidang lainnya tetap utuh, jadi objeknya masih bisa dipakai menyimpan.
    expect(m.color).toBe("#00aaff");
  });
});

describe("Penanganan kolom boolean circle", () => {
  it("menerima boolean asli", () => {
    expect(
      UserAvatarModel.fromMap({ ...barisPrisma, circle: true }).circle
    ).toBe(true);
    expect(
      UserAvatarModel.fromMap({ ...barisPrisma, circle: false }).circle
    ).toBe(false);
  });

  /**
   * CACAT: circle tidak diterjemahkan sama sekali.
   *
   * Berbeda dengan can_delete pada model master yang setidaknya punya
   * percabangan tipe, circle di sini hanya disalin: `this.circle = data.circle`.
   * Apa pun bentuk yang datang dari MySQL diteruskan apa adanya, padahal
   * tipenya dideklarasikan boolean.
   *
   * Angka masih lolos kebetulan — 1 truthy dan 0 falsy — tetapi teks "0" TIDAK:
   * di JavaScript teks itu truthy. Avatar pengguna yang memilih tanpa lingkaran
   * akan tetap digambar berlingkaran, dan pilihan itu kembali salah setiap kali
   * halaman dimuat. Karena tidak ada galat, keluhannya muncul sebagai
   * "pengaturan avatar saya tidak tersimpan".
   */
  it("CACAT: angka dan teks diteruskan mentah, bukan menjadi boolean", () => {
    const satu = UserAvatarModel.fromMap({ ...barisPrisma, circle: 1 });
    const nol = UserAvatarModel.fromMap({ ...barisPrisma, circle: 0 });
    const teksNol = UserAvatarModel.fromMap({ ...barisPrisma, circle: "0" });

    expect(satu.circle).toBe(1);
    expect(typeof satu.circle).toBe("number");
    expect(nol.circle).toBe(0);

    expect(teksNol.circle).toBe("0");
    // Inti kerugiannya: "tidak berlingkaran" dibaca frontend sebagai "ya".
    expect(Boolean(teksNol.circle)).toBe(true);
  });

  it("CACAT: circle yang tidak dikirim menjadi undefined dan lenyap dari JSON", () => {
    const { circle, ...tanpa } = barisPrisma;
    const m = UserAvatarModel.fromMap(tanpa);

    expect(m.circle).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("circle");
  });
});

describe("Relasi user pemilik avatar", () => {
  it("menerjemahkan relasi user menjadi UserViewModel", () => {
    const m = UserAvatarModel.fromMap(barisPrisma);

    expect(m.user).toBeInstanceOf(UserViewModel);
    expect(m.user!.id).toBe(10);
    expect(m.user!.name).toBe("Daniel");
    expect(m.user!.role).toBe(2);
  });

  it("membiarkan user undefined bila relasinya tidak di-include", () => {
    const { user, ...tanpa } = barisPrisma;
    expect(UserAvatarModel.fromMap(tanpa).user).toBeUndefined();
  });

  it("relasi bernilai null tidak membuat fromMap gagal", () => {
    // Penjagaan `data.user ? ... : undefined` menahan UserViewModel.fromMap
    // yang akan melempar TypeError bila diberi null.
    expect(
      UserAvatarModel.fromMap({ ...barisPrisma, user: null }).user
    ).toBeUndefined();
  });

  it("password pemilik tidak ikut terbawa lewat relasi", () => {
    const m = UserAvatarModel.fromMap({
      ...barisPrisma,
      user: {
        ...barisPrisma.user,
        password: "$2b$10$hashrahasia",
        nik: "320123",
      },
    });

    expect(JSON.stringify(m)).not.toContain("hashrahasia");
    expect(JSON.stringify(m)).not.toContain("320123");
  });
});
