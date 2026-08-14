import ExpenseTypeModel from "../../src/models/expense-type.model";

/**
 * Perilaku ExpenseTypeModel.
 *
 * Jenis pengeluaran tersusun bertingkat: satu induk boleh punya banyak anak
 * (parent_id / children). Model ini menerjemahkan barisnya menjadi balasan
 * HTTP untuk layar master jenis pengeluaran.
 *
 * Catatan penting: kelas ini juga punya fetchByID dan fetchByParentID yang
 * memanggil Prisma. Keduanya butuh basis data, jadi tidak diuji di sini. Yang
 * diuji hanya bagian murni: konstruktor dan fromMap.
 *
 * Pola yang membedakan model ini dari yang lain adalah pemakaian `||` sebagai
 * nilai cadangan pada is_delete, can_delete, created_at, dan children. Operator
 * `||` menolak SEMUA nilai jatuh — bukan hanya undefined — dan meloloskan
 * semua nilai bangkit apa adanya, termasuk teks "0" yang di JavaScript
 * bernilai benar. Itulah sumber sebagian besar cacat di bawah.
 */

const barisPrisma = {
  id: 8,
  name: "Kendaraan",
  description: "Biaya kendaraan operasional",
  created_by: 1,
  created_at: new Date("2024-02-01T00:00:00.000Z"),
  parent_id: null,
  is_delete: false,
  can_delete: true,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin seluruh bidang identitas", () => {
    const m = ExpenseTypeModel.fromMap(barisPrisma);

    expect(m.id).toBe(8);
    expect(m.name).toBe("Kendaraan");
    expect(m.description).toBe("Biaya kendaraan operasional");
    expect(m.created_by).toBe(1);
  });

  it("menyalin parent_id, termasuk null untuk jenis tingkat teratas", () => {
    expect(ExpenseTypeModel.fromMap(barisPrisma).parent_id).toBeNull();
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, parent_id: 3 }).parent_id
    ).toBe(3);
  });

  it("menyalin jejak penghapusan", () => {
    const m = ExpenseTypeModel.fromMap({
      ...barisPrisma,
      deleted_by: 4,
      deleted_at: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(m.deleted_by).toBe(4);
    expect(m.deleted_at).toBeInstanceOf(Date);
  });

  it("menghasilkan instance ExpenseTypeModel, bukan objek biasa", () => {
    expect(ExpenseTypeModel.fromMap(barisPrisma)).toBeInstanceOf(
      ExpenseTypeModel
    );
  });
});

describe("Bidang tanggal", () => {
  it("meneruskan created_at dari basis data apa adanya bila ada", () => {
    expect(
      ExpenseTypeModel.fromMap(barisPrisma).created_at?.toISOString()
    ).toBe("2024-02-01T00:00:00.000Z");
  });

  /**
   * CACAT: created_at yang hilang dipalsukan menjadi waktu sekarang.
   *
   * Konstruktornya menulis `data.created_at || new Date()`. Datanya tidak
   * dibiarkan kosong, melainkan diganti jam permintaan berlangsung.
   *
   * Akibatnya bagi pemakai: jenis pengeluaran yang sudah bertahun-tahun ada
   * tampak seolah baru dibuat detik ini bila kolomnya tidak ikut termuat.
   * Daftar yang diurutkan berdasarkan tanggal pembuatan menjadi acak, dan
   * tidak ada isyarat apa pun bahwa nilainya palsu.
   */
  it("CACAT: created_at yang hilang dipalsukan menjadi waktu sekarang", () => {
    const { created_at, ...tanpa } = barisPrisma;
    const m = ExpenseTypeModel.fromMap(tanpa);

    expect(m.created_at).toBeInstanceOf(Date);
    expect(isNaN(m.created_at!.getTime())).toBe(false);
    expect(m.created_at!.getTime()).toBeGreaterThan(
      new Date("2025-01-01").getTime()
    );
  });
});

describe("Penanganan kolom boolean can_delete", () => {
  it("menerima boolean asli", () => {
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, can_delete: true }).can_delete
    ).toBe(true);
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, can_delete: false }).can_delete
    ).toBe(false);
  });

  it("menjadi false bila tidak dikirim, bukan undefined", () => {
    const { can_delete, ...tanpa } = barisPrisma;
    expect(ExpenseTypeModel.fromMap(tanpa).can_delete).toBe(false);
  });

  /**
   * CACAT: teks "0" dari MySQL menjadi teks "0" yang justru bernilai BENAR.
   *
   * fromMap menulis `data.can_delete || false`. Operator `||` hanya menoleh
   * pada nilai jatuh; teks "0" adalah nilai BANGKIT di JavaScript, jadi ia
   * lolos apa adanya dan tersimpan sebagai teks "0" pada bidang yang diketik
   * `boolean`. Tidak ada penerjemahan teks sama sekali di model ini —
   * bandingkan dengan CustomerModel dan ProductBrandModel yang setidaknya
   * membandingkannya dengan "1".
   *
   * Akibatnya bagi pemakai adalah yang paling parah dari seluruh cacat di
   * berkas ini: frontend menulis `if (item.can_delete)` untuk menampilkan
   * tombol hapus. Nilai "0" lolos pemeriksaan itu, jadi tombol hapus MUNCUL
   * untuk jenis pengeluaran yang sebenarnya TIDAK BOLEH dihapus karena masih
   * dipakai transaksi. Pengguna menekannya dan baru tahu setelah server
   * menolak — atau lebih buruk, bila server tidak memeriksa ulang, data
   * transaksi kehilangan acuan jenisnya.
   */
  it('CACAT: teks "0" lolos sebagai teks dan bernilai benar', () => {
    const m = ExpenseTypeModel.fromMap({ ...barisPrisma, can_delete: "0" });

    expect(m.can_delete).toBe("0" as unknown as boolean);
    expect(m.can_delete).not.toBe(false);
    // Inilah yang membuat tombol hapus muncul untuk data yang terkunci.
    expect(Boolean(m.can_delete)).toBe(true);
  });

  it('CACAT: teks "1" tetap teks, bukan boolean true', () => {
    const m = ExpenseTypeModel.fromMap({ ...barisPrisma, can_delete: "1" });

    expect(m.can_delete).toBe("1" as unknown as boolean);
    expect(m.can_delete).not.toBe(true);
  });

  /**
   * CACAT: angka dari TinyInt tidak seragam — 1 tetap angka, 0 menjadi false.
   *
   * `1 || false` menghasilkan 1 (angka lolos karena bangkit), sedangkan
   * `0 || false` menghasilkan false (angka nol adalah nilai jatuh). Jadi
   * bidang yang sama bisa berupa angka atau boolean tergantung nilainya.
   *
   * Akibatnya frontend yang membandingkan dengan `=== true` gagal pada data
   * yang boleh dihapus, tetapi berhasil pada data yang tidak boleh dihapus.
   * Perilakunya tidak konsisten dan sulit ditelusuri.
   */
  it("CACAT: angka 1 tetap angka sedangkan angka 0 menjadi false", () => {
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, can_delete: 1 }).can_delete
    ).toBe(1 as unknown as boolean);
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, can_delete: 0 }).can_delete
    ).toBe(false);
  });
});

describe("Penanganan kolom boolean is_delete", () => {
  it("menerima boolean asli", () => {
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, is_delete: true }).is_delete
    ).toBe(true);
  });

  it("menjadi false bila tidak dikirim", () => {
    const { is_delete, ...tanpa } = barisPrisma;
    expect(ExpenseTypeModel.fromMap(tanpa).is_delete).toBe(false);
  });

  /**
   * CACAT: is_delete memakai pola `||` yang sama, dengan akibat terbalik.
   *
   * Teks "0" — yang di basis data berarti "TIDAK terhapus" — lolos sebagai
   * teks bangkit. Frontend yang menyaring `list.filter(x => !x.is_delete)`
   * membuang jenis pengeluaran yang MASIH AKTIF dari daftar pilihan.
   *
   * Akibatnya pengguna tidak bisa memilih jenis pengeluaran itu saat mencatat
   * pengeluaran baru, seolah-olah jenisnya sudah dihapus padahal tidak.
   */
  it('CACAT: teks "0" membuat jenis aktif dikira terhapus', () => {
    const m = ExpenseTypeModel.fromMap({ ...barisPrisma, is_delete: "0" });

    expect(m.is_delete).toBe("0" as unknown as boolean);
    expect(Boolean(m.is_delete)).toBe(true);
  });

  it("CACAT: angka 1 tetap angka sedangkan angka 0 menjadi false", () => {
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, is_delete: 1 }).is_delete
    ).toBe(1 as unknown as boolean);
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, is_delete: 0 }).is_delete
    ).toBe(false);
  });
});

describe("Larik bersarang children", () => {
  const anak = {
    id: 9,
    name: "Bahan Bakar",
    description: "BBM kendaraan",
    created_by: 1,
    parent_id: 8,
    can_delete: "0",
  };

  it("larik yang dikirim ikut terbawa", () => {
    const m = ExpenseTypeModel.fromMap({ ...barisPrisma, children: [anak] });

    expect(m.children).toHaveLength(1);
    expect(m.children![0].name).toBe("Bahan Bakar");
  });

  it("larik kosong tetap larik kosong", () => {
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, children: [] }).children
    ).toEqual([]);
  });

  it("larik yang tidak dikirim menjadi larik kosong, bukan undefined", () => {
    expect(ExpenseTypeModel.fromMap(barisPrisma).children).toEqual([]);
  });

  it("larik null juga menjadi larik kosong karena null adalah nilai jatuh", () => {
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, children: null }).children
    ).toEqual([]);
  });

  /**
   * CACAT: anak-anak TIDAK dilewatkan fromMap, jadi tetap objek mentah.
   *
   * fromMap menyalin `data.children` apa adanya. Akibatnya setiap anak lolos
   * dari seluruh penerjemahan yang berlaku bagi induknya: can_delete tidak
   * diberi nilai cadangan, is_delete tidak diberi nilai cadangan, created_at
   * tidak diisi, dan objeknya bukan instance ExpenseTypeModel.
   *
   * Akibatnya bagi pemakai: pada layar bertingkat, baris induk dan baris anak
   * berperilaku berbeda untuk kolom yang sama. Anak yang tidak punya
   * can_delete di basis data akan kehilangan kuncinya sama sekali (induk
   * mendapat false), sehingga tombol hapus pada baris anak menghilang tanpa
   * alasan yang terlihat. Bila suatu saat penerjemahan boolean di fromMap
   * diperbaiki, baris anak TETAP rusak karena tidak melewatinya.
   */
  it("CACAT: children bukan instance ExpenseTypeModel dan tidak diterjemahkan", () => {
    const m = ExpenseTypeModel.fromMap({ ...barisPrisma, children: [anak] });

    expect(m.children![0]).not.toBeInstanceOf(ExpenseTypeModel);
    // can_delete anak tidak melewati `|| false` maupun penerjemahan apa pun.
    expect(m.children![0].can_delete).toBe("0" as unknown as boolean);
    // created_at anak tidak diisi, padahal induknya selalu diisi.
    expect(m.children![0].created_at).toBeUndefined();
  });

  it("CACAT: anak tanpa can_delete kehilangan kuncinya, berbeda dari induknya", () => {
    const m = ExpenseTypeModel.fromMap({
      ...barisPrisma,
      children: [
        { id: 9, name: "Tol", description: "Tol", created_by: 1, parent_id: 8 },
      ],
    });

    expect(m.children![0].can_delete).toBeUndefined();
    // Induknya, dengan masukan yang sama-sama tidak menyertakan can_delete,
    // justru mendapat false. Dua perilaku berbeda pada bidang yang sama.
    const { can_delete, ...indukTanpa } = barisPrisma;
    expect(ExpenseTypeModel.fromMap(indukTanpa).can_delete).toBe(false);
  });
});

/**
 * CACAT: bidang `parent` tidak pernah bisa terisi.
 *
 * Kelasnya mengumumkan `parent?: ExpenseTypeModel | null`, tetapi jalurnya
 * terputus di TIGA tempat sekaligus: antarmuka IExpenseType tidak memuatnya,
 * konstruktor tidak menugasinya, dan fromMap tidak meneruskannya.
 *
 * Akibatnya bagi pemakai: layar yang ingin menampilkan "Bahan Bakar (di bawah
 * Kendaraan)" tidak pernah menerima nama induknya, hanya parent_id berupa
 * angka. Frontend terpaksa memuat seluruh daftar jenis pengeluaran lebih dulu
 * hanya untuk menerjemahkan satu angka menjadi nama.
 */
describe("Bidang yang tidak pernah terisi", () => {
  it("CACAT: parent tetap undefined walau ada di baris basis data", () => {
    const m = ExpenseTypeModel.fromMap({
      ...barisPrisma,
      parent_id: 3,
      parent: { id: 3, name: "Operasional", description: "x", created_by: 1 },
    });

    expect(m.parent).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("Operasional");
  });
});
