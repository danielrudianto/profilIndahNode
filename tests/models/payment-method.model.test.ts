import {
  PaymentMethodModel,
  PaymentMethodViewModel,
} from "../../src/models/payment-method.model";

/**
 * Perilaku PaymentMethodModel.
 *
 * Model ini berbeda dari model master lainnya: fromMap-nya membungkus kolom
 * tanggal dengan `new Date(...)` tanpa memeriksa nilainya lebih dulu. Untuk
 * created_at yang biasanya terisi hal itu jarang terlihat, tetapi deleted_at
 * pada baris yang belum pernah dihapus SELALU bernilai null — dan `new
 * Date(null)` bukan Invalid Date, melainkan awal zaman Unix.
 *
 * Metode pembayaran ikut tertanam di setiap faktur penjualan dan pembayaran,
 * jadi keluaran model ini muncul di banyak layar sekaligus.
 */

const barisPrisma = {
  id: 2,
  name: "Transfer BCA",
  description: "Transfer ke rekening BCA 123456",
  created_by: 1,
  created_at: new Date("2023-01-20T04:00:00.000Z"),
  is_delete: false,
  deleted_by: null,
  deleted_at: null,
  can_delete: true,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas metode pembayaran", () => {
    const m = PaymentMethodModel.fromMap(barisPrisma);

    expect(m.id).toBe(2);
    expect(m.name).toBe("Transfer BCA");
    expect(m.description).toBe("Transfer ke rekening BCA 123456");
  });

  it("menyalin jejak pembuatan", () => {
    const m = PaymentMethodModel.fromMap(barisPrisma);

    expect(m.created_by).toBe(1);
    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at!.toISOString()).toBe("2023-01-20T04:00:00.000Z");
  });

  it("menyalin is_delete dan deleted_by", () => {
    const m = PaymentMethodModel.fromMap({
      ...barisPrisma,
      is_delete: true,
      deleted_by: 4,
    });

    expect(m.is_delete).toBe(true);
    expect(m.deleted_by).toBe(4);
  });

  it("deleted_by tetap null bila belum pernah dihapus", () => {
    expect(PaymentMethodModel.fromMap(barisPrisma).deleted_by).toBeNull();
  });

  it("menghasilkan instance PaymentMethodModel, bukan objek biasa", () => {
    expect(PaymentMethodModel.fromMap(barisPrisma)).toBeInstanceOf(
      PaymentMethodModel
    );
  });
});

describe("Penanganan kolom tanggal", () => {
  /**
   * CACAT: deleted_at null berubah menjadi 1 Januari 1970.
   *
   * fromMap menulis `new Date(data.deleted_at)` tanpa penjagaan. Untuk baris
   * yang belum pernah dihapus, deleted_at bernilai null, dan `new Date(null)`
   * di JavaScript sama dengan `new Date(0)` — awal zaman Unix, bukan Invalid
   * Date dan bukan null.
   *
   * Akibatnya SETIAP metode pembayaran yang masih aktif terkirim ke klien
   * dengan deleted_at "1970-01-01T00:00:00.000Z". Layar yang menampilkan
   * "dihapus pada" akan memperlihatkan tanggal 1970 pada data yang sehat, dan
   * logika frontend seperti `if (method.deleted_at)` akan menganggap seluruh
   * metode pembayaran sudah terhapus — karena tanggal 1970 tetaplah objek
   * Date yang truthy.
   */
  it("CACAT: deleted_at null menjadi awal zaman Unix, bukan null", () => {
    const m = PaymentMethodModel.fromMap(barisPrisma);

    expect(m.deleted_at).toBeInstanceOf(Date);
    expect(m.deleted_at!.toISOString()).toBe("1970-01-01T00:00:00.000Z");
    expect(Boolean(m.deleted_at)).toBe(true);
    expect(JSON.stringify(m)).toContain('"deleted_at":"1970-01-01');
  });

  /**
   * CACAT: tanggal yang tidak dikirim menjadi Invalid Date.
   *
   * Bila kolomnya tidak ikut terpilih pada query, `new Date(undefined)`
   * menghasilkan Invalid Date, yang diserialkan menjadi null. Klien menerima
   * null dan tidak bisa membedakannya dari tanggal yang memang kosong —
   * sekaligus kebalikan dari kasus di atas, sehingga dua keadaan yang berbeda
   * saling tertukar.
   */
  it("CACAT: created_at dan deleted_at yang hilang menjadi Invalid Date", () => {
    const { created_at, deleted_at, ...tanpa } = barisPrisma;
    const m = PaymentMethodModel.fromMap(tanpa);

    expect(isNaN(m.created_at!.getTime())).toBe(true);
    expect(isNaN(m.deleted_at!.getTime())).toBe(true);
    expect(JSON.parse(JSON.stringify(m)).created_at).toBeNull();
  });

  it("tanggal penghapusan yang sungguh ada tetap dipertahankan", () => {
    const m = PaymentMethodModel.fromMap({
      ...barisPrisma,
      deleted_at: new Date("2025-03-03T00:00:00.000Z"),
    });

    expect(m.deleted_at!.toISOString()).toBe("2025-03-03T00:00:00.000Z");
  });
});

describe("Penanganan kolom boolean can_delete", () => {
  it("menerima boolean asli", () => {
    expect(
      PaymentMethodModel.fromMap({ ...barisPrisma, can_delete: true })
        .can_delete
    ).toBe(true);
    expect(
      PaymentMethodModel.fromMap({ ...barisPrisma, can_delete: false })
        .can_delete
    ).toBe(false);
  });

  it("nilai kosong menjadi false", () => {
    const { can_delete, ...tanpa } = barisPrisma;

    expect(PaymentMethodModel.fromMap(tanpa).can_delete).toBe(false);
    expect(
      PaymentMethodModel.fromMap({ ...barisPrisma, can_delete: null })
        .can_delete
    ).toBe(false);
  });

  /**
   * CACAT: `?? false` tidak menerjemahkan tipe, hanya menjaga nilai kosong.
   *
   * Operator penggabung null hanya bertindak saat nilainya null atau undefined.
   * Selain itu nilainya lolos apa adanya, jadi TinyInt yang datang sebagai
   * angka tetap angka, dan teks "0" tetap teks.
   *
   * Teks "0" adalah yang paling merugikan: di JavaScript ia truthy, sehingga
   * frontend menampilkan tombol hapus untuk metode pembayaran yang justru
   * sedang dipakai faktur. Pengguna menekan tombol itu, lalu ditolak server —
   * kegagalan yang bisa dicegah kalau tombolnya memang tidak muncul.
   */
  it("CACAT: angka dan teks diteruskan mentah, bukan menjadi boolean", () => {
    const angka = PaymentMethodModel.fromMap({ ...barisPrisma, can_delete: 1 });
    const teksNol = PaymentMethodModel.fromMap({
      ...barisPrisma,
      can_delete: "0",
    });

    expect(angka.can_delete).toBe(1);
    expect(typeof angka.can_delete).toBe("number");

    expect(teksNol.can_delete).toBe("0");
    expect(Boolean(teksNol.can_delete)).toBe(true);
  });
});

describe("PaymentMethodViewModel", () => {
  it("hanya membawa id, nama, dan keterangan", () => {
    const v = PaymentMethodViewModel.fromMap(barisPrisma);

    expect(v).toBeInstanceOf(PaymentMethodViewModel);
    expect(v.id).toBe(2);
    expect(v.name).toBe("Transfer BCA");
    expect(v.description).toBe("Transfer ke rekening BCA 123456");
    expect(Object.keys(v)).toEqual(["id", "name", "description"]);
  });

  /**
   * Faktur lama tidak menyimpan metode pembayaran, sehingga relasinya kosong.
   * Alih-alih melempar galat, fromMap mengarang metode "Cash" dengan id null.
   * Perilaku ini disengaja dan menjadi andalan halaman faktur, jadi dikunci di
   * sini supaya tidak hilang tanpa sengaja.
   */
  it("mengganti relasi kosong dengan Cash ber-id null", () => {
    const v = PaymentMethodViewModel.fromMap(undefined);

    expect(v.id).toBeNull();
    expect(v.name).toBe("Cash");
    expect(v.description).toBe("Cash");
  });

  it("relasi bernilai null juga menjadi Cash", () => {
    // Perbandingan longgar `data == undefined` ikut menangkap null, yang
    // penting karena left join Prisma mengembalikan null, bukan undefined.
    const v = PaymentMethodViewModel.fromMap(null);

    expect(v.id).toBeNull();
    expect(v.name).toBe("Cash");
  });
});
