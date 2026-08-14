import SupplierModel from "../../src/models/supplier.model";
import { UserViewModel } from "../../src/models/user.model";

/**
 * Perilaku SupplierModel.
 *
 * SupplierModel adalah model master yang paling lengkap menyalin kolomnya —
 * id, jejak pembuatan, perubahan, dan penghapusan semuanya ikut. Penerjemahan
 * can_delete-nya juga paling tahan banting di repo ini.
 *
 * Satu-satunya lubang justru pada relasi: fromMap sudah menyiapkan objek user,
 * tetapi konstruktornya lupa menugaskannya, jadi hasil kerja itu dibuang.
 */

const barisPrisma = {
  id: 21,
  name: "CV Baja Sentosa",
  address: "Jl. Raya Bekasi KM 22",
  npwp: "112233445566778",
  created_by: 4,
  created_at: new Date("2024-08-01T03:30:00.000Z"),
  is_delete: false,
  deleted_by: null,
  deleted_at: null,
  can_delete: true,
  updated_by: null,
  updated_at: null,
  user: { id: 4, name: "Staff Gudang", username: "gudang", role: 3 },
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas pemasok", () => {
    const m = SupplierModel.fromMap(barisPrisma);

    expect(m.id).toBe(21);
    expect(m.name).toBe("CV Baja Sentosa");
    expect(m.address).toBe("Jl. Raya Bekasi KM 22");
    expect(m.npwp).toBe("112233445566778");
  });

  it("menyalin jejak pembuatan apa adanya dari basis data", () => {
    const m = SupplierModel.fromMap(barisPrisma);

    expect(m.created_by).toBe(4);
    expect(m.created_at).toBeInstanceOf(Date);
    // Berbeda dengan CompanyModel, tanggal aslinya dipertahankan.
    expect(m.created_at.toISOString()).toBe("2024-08-01T03:30:00.000Z");
  });

  it("menyalin jejak perubahan dan penghapusan", () => {
    const m = SupplierModel.fromMap({
      ...barisPrisma,
      updated_by: 9,
      updated_at: new Date("2025-04-04T00:00:00.000Z"),
      deleted_by: 3,
      deleted_at: new Date("2025-05-05T00:00:00.000Z"),
      is_delete: true,
    });

    expect(m.updated_by).toBe(9);
    expect(m.updated_at).toEqual(new Date("2025-04-04T00:00:00.000Z"));
    expect(m.deleted_by).toBe(3);
    expect(m.deleted_at).toEqual(new Date("2025-05-05T00:00:00.000Z"));
    expect(m.is_delete).toBe(true);
  });

  it("menghasilkan instance SupplierModel, bukan objek biasa", () => {
    expect(SupplierModel.fromMap(barisPrisma)).toBeInstanceOf(SupplierModel);
  });
});

describe("Nilai null yang memang sah", () => {
  it("npwp boleh null", () => {
    expect(
      SupplierModel.fromMap({ ...barisPrisma, npwp: null }).npwp
    ).toBeNull();
  });

  it("pemasok yang belum pernah dihapus menyimpan null, bukan tanggal palsu", () => {
    const m = SupplierModel.fromMap(barisPrisma);

    expect(m.deleted_by).toBeNull();
    expect(m.deleted_at).toBeNull();
  });

  it("pemasok yang belum pernah diubah menyimpan null pada jejak perubahan", () => {
    const m = SupplierModel.fromMap(barisPrisma);

    expect(m.updated_by).toBeNull();
    expect(m.updated_at).toBeNull();
  });

  /**
   * created_at tidak dijaga sama sekali oleh fromMap maupun konstruktor.
   *
   * Bidangnya dideklarasikan wajib (`created_at: Date`), tetapi bila kolomnya
   * tidak ikut terpilih pada query — misalnya karena `select` yang dipersempit
   * demi kecepatan — nilainya menjadi undefined tanpa galat apa pun. Ini bukan
   * Invalid Date seperti pada model lain: kuncinya benar-benar hilang dari
   * balasan HTTP, jadi frontend menampilkan kolom tanggal kosong.
   */
  it("created_at yang tidak dikirim menjadi undefined, bukan Invalid Date", () => {
    const { created_at, ...tanpa } = barisPrisma;
    const m = SupplierModel.fromMap(tanpa);

    expect(m.created_at).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("created_at");
  });
});

describe("Penanganan kolom boolean can_delete", () => {
  /**
   * Perbandingan longgar `data.can_delete == "1"` yang dipakai di sini justru
   * menangani semua bentuk yang datang dari MySQL dengan benar: boolean asli,
   * angka TinyInt, maupun teks. Diuji satu per satu supaya perilaku yang sudah
   * benar ini tidak ikut rusak bila suatu saat kodenya dirapikan.
   */
  it.each([
    [true, true],
    [false, false],
    [1, true],
    [0, false],
    ["1", true],
    ["0", false],
  ])("nilai %p menjadi %p", (masukan, harapan) => {
    expect(
      SupplierModel.fromMap({ ...barisPrisma, can_delete: masukan }).can_delete
    ).toBe(harapan);
  });

  /**
   * CACAT ringan: tidak dikirim tidak bisa dibedakan dari "tidak boleh hapus".
   *
   * Karena `undefined == "1"` bernilai false, kolom yang tidak ikut dihitung
   * repository berubah menjadi false — bukan undefined. Frontend menerima
   * can_delete: false dan menyembunyikan tombol hapus, padahal yang terjadi
   * sebenarnya adalah repository lupa menghitungnya. Kegagalannya diam-diam
   * dan mengarah ke sisi aman, tetapi tetap menyesatkan saat menelusuri
   * laporan "tombol hapus tidak muncul".
   */
  it("CACAT: can_delete yang tidak dikirim menjadi false, bukan undefined", () => {
    const { can_delete, ...tanpa } = barisPrisma;
    const m = SupplierModel.fromMap(tanpa);

    expect(m.can_delete).toBe(false);
    expect(m.can_delete).not.toBeUndefined();
  });

  it("nilai tak dikenal ikut jatuh menjadi false", () => {
    expect(
      SupplierModel.fromMap({ ...barisPrisma, can_delete: null }).can_delete
    ).toBe(false);
    expect(
      SupplierModel.fromMap({ ...barisPrisma, can_delete: "true" }).can_delete
    ).toBe(false);
  });
});

describe("Relasi user pembuat", () => {
  /**
   * CACAT: relasi user dihitung lalu dibuang.
   *
   * fromMap sudah benar: bila baris membawa relasi user, ia memanggil
   * UserViewModel.fromMap dan meneruskannya ke konstruktor. Tetapi konstruktor
   * SupplierModel TIDAK memuat baris `this.user = data.user` — semua bidang
   * lain ditugasi, hanya user yang terlewat.
   *
   * Akibatnya relasi tidak pernah sampai ke klien: daftar pemasok tidak bisa
   * menampilkan nama pembuat data, hanya nomor created_by. Lebih buruk lagi,
   * query di repository tetap membawa beban `include: { user: ... }` — biaya
   * join dibayar setiap permintaan untuk data yang selalu dibuang.
   */
  it("CACAT: user tidak pernah ditugasi konstruktor walau fromMap menyiapkannya", () => {
    const m = SupplierModel.fromMap(barisPrisma);

    expect(m.user).toBeUndefined();
    // Bahkan kuncinya tidak pernah ada pada objeknya.
    expect("user" in m).toBe(false);
    expect(JSON.stringify(m)).not.toContain("user");
  });

  it("CACAT: baris tanpa relasi user pun hasilnya sama persis", () => {
    const { user, ...tanpa } = barisPrisma;
    const dengan = SupplierModel.fromMap(barisPrisma);
    const tanpaUser = SupplierModel.fromMap(tanpa);

    // Ada atau tidak ada relasi, keluarannya tidak bisa dibedakan.
    expect(JSON.stringify(dengan)).toBe(JSON.stringify(tanpaUser));
  });

  it("UserViewModel yang dibuat fromMap sendiri sebenarnya sudah benar", () => {
    // Membuktikan cacatnya ada di konstruktor, bukan di penerjemahan relasinya.
    const uv = UserViewModel.fromMap(barisPrisma.user);

    expect(uv).toBeInstanceOf(UserViewModel);
    expect(uv.name).toBe("Staff Gudang");
  });
});
