import { UserRoleModel } from "../../src/models/user_role.model";

/**
 * Perilaku UserRoleModel.
 *
 * Model ini berbeda dari model lain di repo: ia tidak membaca basis data sama
 * sekali. Daftar perannya berupa konstanta statis di dalam kelas, dan satu-
 * satunya method-nya menerjemahkan nomor peran menjadi namanya.
 *
 * Karena tidak ada fromMap, yang diuji di sini adalah konstruktornya, isi
 * daftar peran, dan perilaku fromRoleID pada nilai yang ada, yang tidak ada,
 * dan yang salah tipe.
 */

describe("Daftar peran statis", () => {
  it("memuat enam peran", () => {
    expect(UserRoleModel.roles).toHaveLength(6);
  });

  it("menandai peran mana yang boleh dipilih pengguna", () => {
    const tersedia = UserRoleModel.roles
      .filter((r) => r.available)
      .map((r) => r.name);

    expect(tersedia).toEqual([
      "Pembelian",
      "Penjualan",
      "Penjualan & Pembelian",
      "Administrator",
    ]);
  });

  it("Gudang dan Superadministrator sengaja ditandai tidak tersedia", () => {
    const tidakTersedia = UserRoleModel.roles
      .filter((r) => !r.available)
      .map((r) => r.name);

    expect(tidakTersedia).toEqual(["Gudang", "Superadministrator"]);
  });
});

describe("fromRoleID menerjemahkan nomor peran menjadi nama", () => {
  it.each([
    [1, "Pembelian"],
    [2, "Penjualan"],
    [3, "Penjualan & Pembelian"],
    [5, "Administrator"],
    [6, "Gudang"],
    [7, "Superadministrator"],
  ])("nomor %i menjadi %s", (nomor, nama) => {
    expect(UserRoleModel.fromRoleID(nomor)).toBe(nama);
  });

  it("nomor yang tidak dikenal menghasilkan null", () => {
    expect(UserRoleModel.fromRoleID(99)).toBeNull();
    expect(UserRoleModel.fromRoleID(0)).toBeNull();
    expect(UserRoleModel.fromRoleID(-1)).toBeNull();
  });

  it("juga menerjemahkan peran yang ditandai tidak tersedia", () => {
    // fromRoleID tidak memeriksa `available` sama sekali; pengguna lama yang
    // masih memegang peran Gudang tetap mendapat namanya.
    expect(UserRoleModel.fromRoleID(6)).toBe("Gudang");
  });

  /**
   * CACAT: nomor 4 tidak ada di daftar sehingga menghasilkan null.
   *
   * Daftarnya melompat dari 3 langsung ke 5. Entah peran nomor 4 pernah ada
   * lalu dihapus, atau nomornya memang tidak pernah dipakai — tidak ada
   * keterangan apa pun di kode.
   *
   * Akibatnya bagi pemakai: bila ada baris pengguna di basis data yang masih
   * bernilai role = 4, namanya tampil kosong (null) di layar daftar pengguna,
   * tanpa petunjuk bahwa datanya bermasalah. Tidak ada yang mencegah nilai
   * itu tersimpan, karena kolomnya hanya berupa angka biasa tanpa batasan.
   */
  it("CACAT: nomor 4 melompat dan menghasilkan null seperti nomor tak dikenal", () => {
    expect(UserRoleModel.fromRoleID(4)).toBeNull();
    expect(UserRoleModel.roles.find((r) => r.id === 4)).toBeUndefined();
  });

  /**
   * CACAT: pencocokannya ketat (===) sehingga nomor berupa teks gagal.
   *
   * `this.roles.find((r) => r.id === roleID)` memakai perbandingan ketat.
   * Parameternya diketik `number`, tetapi TypeScript tidak menjaga apa pun di
   * batas HTTP: nilai yang datang dari parameter kueri, dari badan permintaan
   * JSON yang dikirim salah, atau dari muatan token, semuanya bisa berupa teks
   * "1" walaupun tipenya dijanjikan number.
   *
   * Akibatnya bagi pemakai: nama peran tampil kosong padahal nomornya benar,
   * dan kode pemanggil yang menyangka null berarti "peran tidak dikenal" bisa
   * salah mengambil keputusan — misalnya menolak akses karena mengira peran
   * pengguna tidak sah.
   */
  it("CACAT: nomor berupa teks selalu menghasilkan null", () => {
    expect(UserRoleModel.fromRoleID("1" as unknown as number)).toBeNull();
    expect(UserRoleModel.fromRoleID("5" as unknown as number)).toBeNull();
  });
});

describe("Konstruktor", () => {
  it("menyalin id dan nama", () => {
    const m = new UserRoleModel({ id: 1, name: "Pembelian", available: true });

    expect(m.id).toBe(1);
    expect(m.name).toBe("Pembelian");
    expect(m).toBeInstanceOf(UserRoleModel);
  });

  it("id boleh kosong", () => {
    expect(
      new UserRoleModel({ name: "Baru", available: true }).id
    ).toBeUndefined();
  });

  /**
   * CACAT: bidang `available` dibuang oleh konstruktor.
   *
   * Antarmuka IUserRole mewajibkan `available`, dan daftar statis di kelas
   * yang sama mengisinya dengan cermat, tetapi konstruktornya hanya menyalin
   * id dan name. Kelasnya bahkan tidak mengumumkan bidang itu.
   *
   * Akibatnya bagi pemakai: begitu sebuah peran dibungkus menjadi
   * UserRoleModel, penanda "boleh dipilih atau tidak" HILANG. Layar yang
   * mengisi pilihan peran dari objek model akan menampilkan Gudang dan
   * Superadministrator sebagai pilihan yang sah, padahal keduanya sengaja
   * ditutup. Penyaringan harus dilakukan pada UserRoleModel.roles secara
   * langsung — objek modelnya tidak bisa dipakai untuk itu.
   */
  it("CACAT: available tidak ikut tersimpan pada objek yang terbentuk", () => {
    const m = new UserRoleModel({
      id: 7,
      name: "Superadministrator",
      available: false,
    }) as unknown as Record<string, unknown>;

    expect(m.available).toBeUndefined();
    expect("available" in m).toBe(false);
    expect(JSON.stringify(m)).not.toContain("available");
  });
});
