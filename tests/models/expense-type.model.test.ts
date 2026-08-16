import ExpenseTypeModel from "../../src/models/expense-type.model";

/**
 * Perilaku ExpenseTypeModel setelah tipe pengeluaran menjadi dua tingkat
 * dengan induk baku: induk (parent_id null) lahir dari seeder dan terkunci,
 * anak bebas dikelola dan selalu menunjuk salah satu induk.
 *
 * Dua hal berubah dari model lamanya dan dijaga di sini: bidang can_delete
 * dan parent hilang (halaman daftar tidak lagi menawarkannya), dan anak-anak
 * pada `children` kini DILEWATKAN konstruktor sehingga penerjemahan nilai
 * cadangan berlaku sama untuk induk dan anak — dulu anak lolos mentah.
 *
 * Yang sengaja TIDAK berubah ikut dijaga: pola `||` pada created_at dan
 * is_delete masih menerima nilai bangkit apa adanya, jadi cacat teks "0"
 * dari MySQL masih ada dan didokumentasikan di bawah.
 */

const barisPrisma = {
  id: 8,
  name: "Kendaraan",
  description: "Biaya kendaraan operasional",
  created_by: 1,
  created_at: new Date("2024-02-01T00:00:00.000Z"),
  parent_id: null,
  is_delete: false,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin seluruh bidang identitas", () => {
    const m = ExpenseTypeModel.fromMap(barisPrisma);

    expect(m.id).toBe(8);
    expect(m.name).toBe("Kendaraan");
    expect(m.description).toBe("Biaya kendaraan operasional");
    expect(m.created_by).toBe(1);
  });

  it("menyalin parent_id, termasuk null untuk kategori induk", () => {
    expect(ExpenseTypeModel.fromMap(barisPrisma).parent_id).toBeNull();
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, parent_id: 3 }).parent_id
    ).toBe(3);
  });

  it("parent_id yang tidak dikirim menjadi null, bukan undefined", () => {
    const { parent_id, ...tanpa } = barisPrisma;
    expect(ExpenseTypeModel.fromMap(tanpa).parent_id).toBeNull();
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

  it("tidak lagi membawa bidang can_delete maupun parent", () => {
    const m = ExpenseTypeModel.fromMap({
      ...barisPrisma,
      can_delete: true,
      parent: { id: 3, name: "Operasional" },
    });

    expect((m as any).can_delete).toBeUndefined();
    expect((m as any).parent).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("Operasional");
  });
});

describe("Bidang tanggal", () => {
  it("meneruskan created_at dari basis data apa adanya bila ada", () => {
    expect(
      ExpenseTypeModel.fromMap(barisPrisma).created_at?.toISOString()
    ).toBe("2024-02-01T00:00:00.000Z");
  });

  /**
   * CACAT WARISAN: created_at yang hilang dipalsukan menjadi waktu sekarang.
   *
   * Konstruktornya masih menulis `data.created_at || new Date()`. Jenis
   * pengeluaran lama yang kolom tanggalnya tidak ikut termuat tampak seolah
   * baru dibuat detik ini, tanpa isyarat bahwa nilainya palsu.
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
   * CACAT WARISAN: teks "0" dari MySQL lolos sebagai teks yang bernilai
   * BENAR — `||` hanya menoleh pada nilai jatuh. Penyaring
   * `list.filter(x => !x.is_delete)` akan membuang jenis yang masih aktif.
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

  it("larik null juga menjadi larik kosong", () => {
    expect(
      ExpenseTypeModel.fromMap({ ...barisPrisma, children: null }).children
    ).toEqual([]);
  });

  /**
   * SEMBUH: anak kini dilewatkan konstruktor, jadi baris induk dan baris anak
   * berperilaku sama untuk kolom yang sama. Dulu anak disalin mentah dan
   * lolos dari seluruh penerjemahan nilai cadangan.
   */
  it("anak menjadi instance ExpenseTypeModel dengan nilai cadangan yang sama", () => {
    const m = ExpenseTypeModel.fromMap({ ...barisPrisma, children: [anak] });

    expect(m.children![0]).toBeInstanceOf(ExpenseTypeModel);
    // is_delete anak yang tidak dikirim mendapat false, sama seperti induk.
    expect(m.children![0].is_delete).toBe(false);
    // created_at anak diisi oleh konstruktor, sama seperti induk.
    expect(m.children![0].created_at).toBeInstanceOf(Date);
  });

  it("anak yang sudah berupa instance tidak dibungkus dua kali", () => {
    const instanceAnak = ExpenseTypeModel.fromMap(anak);
    const m = ExpenseTypeModel.fromMap({
      ...barisPrisma,
      children: [instanceAnak],
    });

    expect(m.children![0]).toBe(instanceAnak);
  });
});
