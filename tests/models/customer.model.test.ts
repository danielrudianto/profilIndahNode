import { CustomerModel } from "../../src/models/customer.model";

/**
 * Perilaku CustomerModel.
 *
 * Model di repo ini berperan sebagai penerjemah antara baris basis data dan
 * badan balasan HTTP. `fromMap` menerima objek mentah dari Prisma — bertipe
 * `any`, jadi TypeScript tidak menjaga apa pun di sini — lalu memilih bidang
 * mana yang ikut terkirim ke klien.
 *
 * Dua hal yang paling mudah rusak tanpa disadari:
 *
 *   Bidang yang TIDAK disalin fromMap tidak akan pernah sampai ke frontend,
 *   walau kolomnya ada di basis data dan ada di konstruktor. Kesalahan seperti
 *   ini tidak memunculkan galat apa pun — nilainya hanya diam-diam undefined.
 *
 *   Kolom boolean pada MySQL bisa datang sebagai angka atau teks, bukan
 *   boolean. Konstruktornya menangani teks "1", tetapi tidak semua bentuk.
 *
 * Berkas ini dipakai sebagai acuan bentuk untuk tes model lainnya.
 */

const barisPrisma = {
  id: 7,
  name: "Toko Maju",
  address: "Jl. Melati 10",
  npwp: "123456789012345",
  pic: "Budi",
  phone_number: "0811222333",
  created_by: 3,
  created_at: new Date("2026-05-01T00:00:00.000Z"),
  is_delete: false,
  can_delete: true,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin seluruh bidang identitas", () => {
    const m = CustomerModel.fromMap(barisPrisma);

    expect(m.id).toBe(7);
    expect(m.name).toBe("Toko Maju");
    expect(m.address).toBe("Jl. Melati 10");
    expect(m.npwp).toBe("123456789012345");
    expect(m.pic).toBe("Budi");
    expect(m.phone_number).toBe("0811222333");
  });

  it("menyalin jejak pembuatan", () => {
    const m = CustomerModel.fromMap(barisPrisma);
    expect(m.created_by).toBe(3);
    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at?.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("menghasilkan instance CustomerModel, bukan objek biasa", () => {
    expect(CustomerModel.fromMap(barisPrisma)).toBeInstanceOf(CustomerModel);
  });
});

describe("Penanganan kolom boolean", () => {
  it("menerima boolean asli", () => {
    const m = CustomerModel.fromMap({ ...barisPrisma, can_delete: true });
    expect(m.can_delete).toBe(true);
  });

  it("menerjemahkan teks '1' dan '0' dari MySQL", () => {
    expect(
      CustomerModel.fromMap({ ...barisPrisma, can_delete: "1" }).can_delete
    ).toBe(true);
    expect(
      CustomerModel.fromMap({ ...barisPrisma, can_delete: "0" }).can_delete
    ).toBe(false);
  });

  it("membiarkan can_delete undefined bila tidak dikirim", () => {
    const { can_delete, ...tanpa } = barisPrisma;
    expect(CustomerModel.fromMap(tanpa).can_delete).toBeUndefined();
  });

  /**
   * CACAT: kolom TinyInt yang datang sebagai ANGKA hilang sama sekali.
   *
   * Konstruktornya bercabang dua: boolean dipakai apa adanya, teks "1"
   * diterjemahkan. Angka tidak cocok dengan keduanya, dan karena tidak ada
   * cabang `else`, bidangnya TIDAK PERNAH DITUGASI — bukan bernilai angka
   * mentah, melainkan undefined.
   *
   * Akibatnya lebih jauh daripada sekadar salah tipe: `can_delete` lenyap dari
   * objek, dan JSON.stringify membuang kunci yang bernilai undefined. Frontend
   * menerima balasan TANPA bidang itu sama sekali, sehingga tombol hapus yang
   * bergantung padanya tidak pernah muncul — tanpa galat apa pun di kedua sisi.
   *
   * Kolom is_delete pada model yang sama ditulis dengan pola persis sama, jadi
   * cacatnya sepasang.
   */
  it("CACAT: angka 1 dan 0 membuat bidangnya hilang, bukan menjadi boolean", () => {
    const satu = CustomerModel.fromMap({ ...barisPrisma, can_delete: 1 });
    const nol = CustomerModel.fromMap({ ...barisPrisma, can_delete: 0 });

    expect(satu.can_delete).toBeUndefined();
    expect(nol.can_delete).toBeUndefined();

    // Kuncinya benar-benar hilang saat diserialkan, bukan bernilai null.
    expect(JSON.stringify(satu)).not.toContain("can_delete");
  });
});

/**
 * Bidang yang sengaja TIDAK disalin fromMap.
 *
 * Konstruktornya menerima updated_by, updated_at, deleted_by, deleted_at, dan
 * user, tetapi fromMap tidak meneruskan satu pun. Akibatnya kelimanya selalu
 * undefined pada objek yang dibentuk dari baris basis data, sehingga tidak
 * pernah ikut terkirim ke klien.
 *
 * Dituliskan di sini supaya jelas ini keadaan yang berlaku sekarang. Bila suatu
 * saat frontend membutuhkan jejak perubahan atau penghapusan, yang perlu
 * diubah adalah fromMap — bukan controller-nya.
 */
describe("Bidang yang tidak diteruskan fromMap", () => {
  const lengkap = {
    ...barisPrisma,
    updated_by: 9,
    updated_at: new Date("2026-06-01"),
    deleted_by: 4,
    deleted_at: new Date("2026-07-01"),
    user: { id: 3, name: "Admin" },
  };

  it.each(["updated_by", "updated_at", "deleted_by", "deleted_at", "user"])(
    "%s tidak ikut walau ada di baris basis data",
    (bidang) => {
      const m = CustomerModel.fromMap(lengkap) as unknown as Record<
        string,
        unknown
      >;
      expect(m[bidang]).toBeUndefined();
    }
  );
});

describe("Nilai batas", () => {
  it("npwp boleh null", () => {
    expect(
      CustomerModel.fromMap({ ...barisPrisma, npwp: null }).npwp
    ).toBeNull();
  });

  /**
   * CACAT: created_at yang tidak dikirim menjadi Invalid Date.
   *
   * fromMap selalu membungkusnya dengan `new Date(data.created_at)` tanpa
   * memeriksa nilainya lebih dulu. `new Date(undefined)` menghasilkan Invalid
   * Date, yang menjadi `null` saat diserialkan ke JSON — klien menerima null
   * dan tidak bisa membedakannya dari tanggal yang memang kosong.
   */
  it("CACAT: created_at yang hilang menjadi Invalid Date", () => {
    const { created_at, ...tanpa } = barisPrisma;
    const m = CustomerModel.fromMap(tanpa);

    expect(m.created_at).toBeInstanceOf(Date);
    expect(isNaN(m.created_at!.getTime())).toBe(true);
    expect(JSON.parse(JSON.stringify({ t: m.created_at })).t).toBeNull();
  });
});
