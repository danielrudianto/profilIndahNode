import { Prisma } from "@prisma/client";
import AdjustmentCaseModel from "../../src/models/adjustment-case.model";
import { CompanyModel } from "../../src/models/company.model";
import { ProductModel } from "../../src/models/product.model";
import { ProductUnitViewModel } from "../../src/models/product-unit.model";
import { UserViewModel } from "../../src/models/user.model";

/**
 * Perilaku AdjustmentCaseModel.
 *
 * Model penyesuaian stok: satu dokumen berisi daftar barang yang jumlahnya
 * dikoreksi. Dokumen ini perlu dikonfirmasi sebelum berpengaruh pada stok,
 * jadi bidang is_confirm, confirmed_by, dan confirmed_at adalah inti dari
 * jejak auditnya.
 *
 * Justru di sanalah letak cacat terberat model ini: konstruktornya MENIMPA
 * dua bidang konfirmasi dengan nilai tetap, mengabaikan apa pun yang dikirim
 * fromMap. Rinciannya ada pada blok "Bidang konfirmasi" di bawah.
 */

const barisPrisma = {
  id: 31,
  name: "ADJ/2026/004",
  date: new Date("2026-05-20T00:00:00.000Z"),
  created_by: 6,
  created_at: new Date("2026-05-20T03:15:00.000Z"),
  is_confirm: false,
  is_delete: false,
  company_id: 2,
  adjustment_case: [],
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin bidang identitas dokumen", () => {
    const m = AdjustmentCaseModel.fromMap(barisPrisma);

    expect(m.id).toBe(31);
    expect(m.name).toBe("ADJ/2026/004");
    expect(m.created_by).toBe(6);
    expect(m.company_id).toBe(2);
  });

  it("menyalin created_at apa adanya", () => {
    const m = AdjustmentCaseModel.fromMap(barisPrisma);

    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at?.toISOString()).toBe("2026-05-20T03:15:00.000Z");
  });

  it("company_id boleh null untuk penyesuaian lintas perusahaan", () => {
    expect(
      AdjustmentCaseModel.fromMap({ ...barisPrisma, company_id: null })
        .company_id
    ).toBeNull();
  });

  it("menghasilkan instance AdjustmentCaseModel, bukan objek biasa", () => {
    expect(AdjustmentCaseModel.fromMap(barisPrisma)).toBeInstanceOf(
      AdjustmentCaseModel
    );
  });
});

describe("Bidang tanggal", () => {
  it("meneruskan Date apa adanya bila basis data memang mengirim Date", () => {
    expect(AdjustmentCaseModel.fromMap(barisPrisma).date).toBeInstanceOf(Date);
  });

  /**
   * CACAT: `date` tidak dibungkus new Date().
   *
   * Nilainya disalin mentah, jadi teks tetap teks pada bidang yang diketik
   * `Date`. Kode pemanggil yang memakai `.toISOString()` atau membandingkan
   * dua tanggal penyesuaian akan melempar galat atau memberi urutan salah.
   */
  it("CACAT: date berupa teks tetap teks, bukan Date", () => {
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      date: "2026-05-20",
    });

    expect(m.date).not.toBeInstanceOf(Date);
    expect(typeof m.date).toBe("string");
  });

  it("CACAT: date yang hilang membuat kuncinya lenyap dari JSON", () => {
    const { date, ...tanpa } = barisPrisma;
    const m = AdjustmentCaseModel.fromMap(tanpa);

    expect(m.date).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain('"date"');
  });
});

/**
 * CACAT TERBERAT: confirmed_by dan confirmed_at ditimpa nilai tetap.
 *
 * Konstruktornya menulis, tanpa syarat apa pun:
 *
 *     this.confirmed_by = null;
 *     this.confirmed_at = new Date();
 *
 * Bukan `data.confirmed_by` dan `data.confirmed_at`. Padahal fromMap dengan
 * rajin meneruskan kedua nilai itu dari basis data — nilainya dibuang di
 * langkah terakhir.
 *
 * Akibatnya bagi pemakai ada dua, dan keduanya serius:
 *
 *   Siapa yang mengonfirmasi penyesuaian stok TIDAK PERNAH bisa ditampilkan.
 *   Nilainya selalu null. Penyesuaian stok adalah operasi yang mengubah nilai
 *   persediaan tanpa transaksi jual-beli, jadi hilangnya jejak "siapa yang
 *   menyetujui" menghapus satu-satunya pengendalian internal atas dokumen ini.
 *
 *   Tanggal konfirmasi SELALU berupa jam permintaan berlangsung, bahkan untuk
 *   dokumen yang belum dikonfirmasi sama sekali. Frontend yang menampilkan
 *   "dikonfirmasi pada ..." akan menuliskan tanggal hari ini pada setiap
 *   dokumen di daftar, dan nilainya berubah setiap kali halaman dimuat ulang.
 */
describe("Bidang konfirmasi", () => {
  const sudahDikonfirmasi = {
    ...barisPrisma,
    is_confirm: true,
    confirmed_by: 77,
    confirmed_at: new Date("2026-05-21T09:00:00.000Z"),
  };

  it("CACAT: confirmed_by dari basis data dibuang dan selalu menjadi null", () => {
    const m = AdjustmentCaseModel.fromMap(sudahDikonfirmasi);

    expect(m.confirmed_by).toBeNull();
    expect(m.confirmed_by).not.toBe(77);
  });

  it("CACAT: confirmed_at dari basis data dibuang dan diganti waktu sekarang", () => {
    const m = AdjustmentCaseModel.fromMap(sudahDikonfirmasi);

    expect(m.confirmed_at).toBeInstanceOf(Date);
    expect(m.confirmed_at!.toISOString()).not.toBe("2026-05-21T09:00:00.000Z");
    expect(m.confirmed_at!.getTime()).toBeGreaterThan(
      new Date("2025-01-01").getTime()
    );
  });

  it("CACAT: dokumen yang BELUM dikonfirmasi pun mendapat confirmed_at hari ini", () => {
    const m = AdjustmentCaseModel.fromMap(barisPrisma);

    expect(m.is_confirm).toBe(false);
    // Tidak dikonfirmasi, tetapi tetap punya tanggal konfirmasi.
    expect(m.confirmed_at).toBeInstanceOf(Date);
    expect(JSON.stringify(m)).toContain("confirmed_at");
  });

  it("CACAT: dua pemanggilan berturut-turut menghasilkan confirmed_at berbeda", () => {
    const a = AdjustmentCaseModel.fromMap(sudahDikonfirmasi);
    for (let i = 0; i < 2_000_000; i++) {
      // menghabiskan waktu sesaat agar jam bergerak
    }
    const b = AdjustmentCaseModel.fromMap(sudahDikonfirmasi);

    // Nilainya bergantung jam, bukan pada data — jadi tidak pernah stabil.
    expect(b.confirmed_at!.getTime()).toBeGreaterThanOrEqual(
      a.confirmed_at!.getTime()
    );
  });
});

describe("Penanganan kolom boolean", () => {
  it("meneruskan boolean asli apa adanya", () => {
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      is_confirm: true,
      is_delete: true,
    });

    expect(m.is_confirm).toBe(true);
    expect(m.is_delete).toBe(true);
  });

  it("membiarkan bidang boolean undefined bila tidak dikirim", () => {
    const { is_confirm, is_delete, ...tanpa } = barisPrisma;
    const m = AdjustmentCaseModel.fromMap(tanpa);

    expect(m.is_confirm).toBeUndefined();
    expect(m.is_delete).toBeUndefined();
  });

  /**
   * CACAT: is_confirm dan is_delete tidak diterjemahkan sama sekali.
   *
   * Tidak ada percabangan boolean/teks; nilainya disalin mentah. Kolom TinyInt
   * yang kembali sebagai angka atau teks ikut terkirim apa adanya walaupun
   * bidangnya diketik `boolean`.
   *
   * Akibat yang paling merugikan: teks "0" bernilai benar di JavaScript, jadi
   * dokumen penyesuaian yang BELUM dikonfirmasi akan tampak sudah
   * dikonfirmasi. Tombol "konfirmasi" hilang dari layar dan dokumen itu tidak
   * pernah bisa diselesaikan pengguna.
   */
  it("CACAT: angka 1/0 lolos sebagai angka, bukan boolean", () => {
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      is_confirm: 1,
      is_delete: 0,
    });

    expect(m.is_confirm).toBe(1 as unknown as boolean);
    expect(m.is_delete).toBe(0 as unknown as boolean);
  });

  it('CACAT: teks "0" lolos sebagai teks yang justru bernilai benar', () => {
    const m = AdjustmentCaseModel.fromMap({ ...barisPrisma, is_confirm: "0" });

    expect(m.is_confirm).toBe("0" as unknown as boolean);
    expect(Boolean(m.is_confirm)).toBe(true);
  });
});

describe("Larik barang bersarang (adjustment_case)", () => {
  const barangLengkap = {
    id: 91,
    product_id: 12,
    product_unit_id: 34,
    quantity: new Prisma.Decimal("-5"),
    product: {
      id: 12,
      reference: "PRF-012",
      description: "Pipa 3 inci",
      unit: "BATANG",
      product_brand_id: 3,
      product_type_id: 4,
    },
    product_unit: {
      id: 34,
      unit: "LUSIN",
      conversion: new Prisma.Decimal("12"),
    },
  };

  it("mengubah quantity menjadi angka biasa, termasuk nilai negatif", () => {
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      adjustment_case: [barangLengkap],
    });

    expect(m.adjustment_case[0].quantity).toBe(-5);
    expect(typeof m.adjustment_case[0].quantity).toBe("number");
  });

  it("membentuk ProductModel dari produk yang menempel", () => {
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      adjustment_case: [barangLengkap],
    });
    const item = m.adjustment_case[0];

    expect(item.product).toBeInstanceOf(ProductModel);
    expect(item.product!.reference).toBe("PRF-012");
    expect(item.product!.unit).toBe("BATANG");
    expect(item.product!.product_brand_id).toBe(3);
  });

  it("membentuk ProductUnitViewModel dengan conversion berupa angka", () => {
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      adjustment_case: [barangLengkap],
    });
    const unit = m.adjustment_case[0].product_unit!;

    expect(unit).toBeInstanceOf(ProductUnitViewModel);
    expect(unit.unit).toBe("LUSIN");
    expect(unit.conversion).toBe(12);
    // product_id satuan diambil dari item, bukan dari objek satuannya.
    expect(unit.product_id).toBe(12);
  });

  it("satuan null tetap null untuk barang bersatuan dasar", () => {
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      adjustment_case: [{ ...barangLengkap, product_unit: null }],
    });

    expect(m.adjustment_case[0].product_unit).toBeNull();
  });

  it("satuan yang tidak dikirim juga menjadi null, bukan undefined", () => {
    const { product_unit, ...tanpaUnit } = barangLengkap;
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      adjustment_case: [tanpaUnit],
    });

    // `== null` juga bernilai benar untuk undefined, jadi keduanya menyatu.
    expect(m.adjustment_case[0].product_unit).toBeNull();
  });

  it("larik kosong tetap larik kosong", () => {
    expect(
      AdjustmentCaseModel.fromMap({ ...barisPrisma, adjustment_case: [] })
        .adjustment_case
    ).toEqual([]);
  });

  it("larik yang tidak dikirim menjadi larik kosong, bukan undefined", () => {
    const { adjustment_case, ...tanpa } = barisPrisma;
    expect(AdjustmentCaseModel.fromMap(tanpa).adjustment_case).toEqual([]);
  });

  /**
   * CACAT: barang tanpa relasi produk membuat fromMap MELEMPAR galat.
   *
   * Berbeda dengan model lain yang menjaga relasinya (`item.product ==
   * undefined ? undefined : ...`), di sini produknya langsung dibongkar:
   * `new ProductModel({ id: ac.product.id, ... })` tanpa pemeriksaan apa pun.
   *
   * Akibatnya bagi pemakai: bila sebuah kueri lupa menyertakan `include:
   * { product: true }`, atau bila barang mengacu pada produk yang sudah
   * terhapus dari basis data sehingga relasinya null, permintaan HTTP-nya
   * GAGAL TOTAL dengan galat 500 — bukan sekadar kehilangan satu kolom.
   * Seluruh halaman penyesuaian stok tidak bisa dibuka, dan galatnya berupa
   * TypeError yang tidak menyebut dokumen mana yang bermasalah.
   */
  it("CACAT: barang tanpa produk melempar TypeError, bukan sekadar undefined", () => {
    expect(() =>
      AdjustmentCaseModel.fromMap({
        ...barisPrisma,
        adjustment_case: [
          { id: 1, product_id: 12, product_unit_id: null, quantity: 1 },
        ],
      })
    ).toThrow(TypeError);
  });

  it("CACAT: produk bernilai null juga melempar galat yang sama", () => {
    expect(() =>
      AdjustmentCaseModel.fromMap({
        ...barisPrisma,
        adjustment_case: [
          { id: 1, product_id: 12, quantity: 1, product: null },
        ],
      })
    ).toThrow(/Cannot read properties of null/);
  });

  /**
   * CACAT: quantity yang hilang menjadi NaN, lalu null di JSON.
   *
   * `Number(undefined)` adalah NaN. Frontend menerima `"quantity": null` pada
   * bidang yang diketik `number` wajib, sehingga jumlah koreksi stok tampil
   * kosong dan setiap penjumlahan di sisi klien ikut menjadi NaN.
   */
  it("CACAT: quantity yang hilang menjadi NaN dan tersaji null", () => {
    const { quantity, ...tanpaQty } = barangLengkap;
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      adjustment_case: [tanpaQty],
    });

    expect(Number.isNaN(m.adjustment_case[0].quantity)).toBe(true);
    expect(
      JSON.parse(JSON.stringify(m)).adjustment_case[0].quantity
    ).toBeNull();
  });
});

describe("Relasi perusahaan", () => {
  const barisCompany = {
    id: 2,
    name: "PT Profil Indah",
    address: "Jl. Industri 1",
    npwp: null,
    created_by: 1,
    created_at: new Date("2020-01-01T00:00:00.000Z"),
  };

  it("perusahaan yang dikirim menjadi instance CompanyModel", () => {
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      company: barisCompany,
    });

    expect(m.company).toBeInstanceOf(CompanyModel);
    expect(m.company!.name).toBe("PT Profil Indah");
  });

  it("perusahaan yang tidak diminta tetap undefined", () => {
    expect(AdjustmentCaseModel.fromMap(barisPrisma).company).toBeUndefined();
  });

  /**
   * CACAT: cabang `== null` pada company adalah kode mati.
   *
   * Urutannya: `data.company == undefined ? undefined : data.company == null ?
   * null : ...`. Di JavaScript `null == undefined` bernilai BENAR, jadi nilai
   * null sudah tertangkap cabang pertama dan cabang null di bawahnya tidak
   * pernah tercapai. Bidangnya bahkan diketik `CompanyModel | null` — nilai
   * null itu memang diharapkan ada, tetapi mustahil muncul.
   *
   * Akibatnya bagi pemakai: penyesuaian stok lintas perusahaan (company_id
   * null di basis data — keadaan yang sah) kehilangan kunci `company` sama
   * sekali dari JSON. Frontend tidak bisa membedakannya dari dokumen yang
   * relasi perusahaannya memang tidak diminta pada kueri daftar, sehingga
   * kolom perusahaan tampil kosong tanpa keterangan.
   */
  it("CACAT: perusahaan null menjadi undefined dan kuncinya hilang dari JSON", () => {
    const m = AdjustmentCaseModel.fromMap({ ...barisPrisma, company: null });

    expect(m.company).toBeUndefined();
    expect(m.company).not.toBeNull();
    expect(JSON.stringify(m)).not.toContain('"company"');
  });

  /**
   * CACAT: id perusahaan hilang karena CompanyModel.fromMap tidak menyalinnya.
   *
   * Cacatnya berasal dari CompanyModel, tetapi akibatnya terasa di sini:
   * objek perusahaan pada dokumen penyesuaian tidak punya id, jadi frontend
   * tidak bisa menautkannya ke halaman perusahaan maupun mencocokkannya
   * dengan daftar yang sudah dimuat.
   */
  it("CACAT: company.id tidak ikut terbawa", () => {
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      company: barisCompany,
    });

    expect(m.company!.id).toBeUndefined();
  });
});

describe("Relasi pengguna pembuat", () => {
  it("pengguna pembuat menjadi UserViewModel", () => {
    const m = AdjustmentCaseModel.fromMap({
      ...barisPrisma,
      user_adjustment_case_code_created_byTouser: {
        id: 6,
        name: "Joko",
        username: "joko",
        role: 6,
      },
    });

    expect(m.user_adjustment_case_code_created_byTouser).toBeInstanceOf(
      UserViewModel
    );
    expect(m.user_adjustment_case_code_created_byTouser!.name).toBe("Joko");
  });

  it("null maupun tidak dikirim sama-sama menjadi undefined", () => {
    expect(
      AdjustmentCaseModel.fromMap(barisPrisma)
        .user_adjustment_case_code_created_byTouser
    ).toBeUndefined();
    expect(
      AdjustmentCaseModel.fromMap({
        ...barisPrisma,
        user_adjustment_case_code_created_byTouser: null,
      }).user_adjustment_case_code_created_byTouser
    ).toBeUndefined();
  });
});
