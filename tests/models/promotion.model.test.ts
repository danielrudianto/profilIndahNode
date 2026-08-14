import { Prisma } from "@prisma/client";
import PromotionModel from "../../src/models/promotion.model";
import { ProductBrandModel } from "../../src/models/product-brand.model";
import SupplierModel from "../../src/models/supplier.model";
import { UserViewModel } from "../../src/models/user.model";

/**
 * Perilaku PromotionModel.
 *
 * Model promosi punya satu keanehan yang tidak ada di model lain: nama kolom
 * di basis data BERBEDA dari nama bidang di kelas. Kolomnya bernama `start`
 * dan `end`, sedangkan bidangnya bernama `startDate` dan `endDate`. fromMap
 * yang menjembatani keduanya.
 *
 * Penjembatanan itu berjalan satu arah saja dan tanpa penjagaan: `new
 * Date(data.start)` dipanggil tanpa memeriksa apakah nilainya ada. Objek yang
 * dibentuk dari sumber yang sudah memakai nama startDate — misalnya objek
 * yang bolak-balik lewat JSON, atau badan permintaan dari klien — menghasilkan
 * Invalid Date. Rinciannya di blok "Bidang tanggal".
 */

const barisPrisma = {
  id: 15,
  name: "Diskon Akhir Tahun",
  description: "Promo pembelian dari pemasok",
  start: new Date("2026-11-01T00:00:00.000Z"),
  end: new Date("2026-12-31T00:00:00.000Z"),
  target: new Prisma.Decimal("50000000"),
  created_by: 2,
  created_at: new Date("2026-10-01T00:00:00.000Z"),
  supplier_id: 4,
  is_delete: false,
  deleted_by: null,
  deleted_at: null,
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin bidang identitas promosi", () => {
    const m = PromotionModel.fromMap(barisPrisma);

    expect(m.id).toBe(15);
    expect(m.name).toBe("Diskon Akhir Tahun");
    expect(m.description).toBe("Promo pembelian dari pemasok");
    expect(m.supplier_id).toBe(4);
    expect(m.created_by).toBe(2);
  });

  it("menyalin created_at apa adanya tanpa membungkusnya ulang", () => {
    const m = PromotionModel.fromMap(barisPrisma);

    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("menghasilkan instance PromotionModel, bukan objek biasa", () => {
    expect(PromotionModel.fromMap(barisPrisma)).toBeInstanceOf(PromotionModel);
  });
});

describe("Bidang tanggal", () => {
  it("menerjemahkan kolom start menjadi bidang startDate", () => {
    const m = PromotionModel.fromMap(barisPrisma);

    expect(m.startDate).toBeInstanceOf(Date);
    expect(m.startDate.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("menerjemahkan kolom end menjadi bidang endDate", () => {
    const m = PromotionModel.fromMap(barisPrisma);

    expect(m.endDate).toBeInstanceOf(Date);
    expect(m.endDate!.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("membungkus teks menjadi Date, berbeda dari model lain", () => {
    const m = PromotionModel.fromMap({ ...barisPrisma, start: "2026-11-01" });

    expect(m.startDate).toBeInstanceOf(Date);
    expect(m.startDate.getUTCFullYear()).toBe(2026);
  });

  it("promosi tanpa tanggal berakhir mendapat endDate null", () => {
    expect(
      PromotionModel.fromMap({ ...barisPrisma, end: null }).endDate
    ).toBeNull();
  });

  it("kolom end yang tidak dikirim juga menjadi null, bukan Invalid Date", () => {
    const { end, ...tanpa } = barisPrisma;
    expect(PromotionModel.fromMap(tanpa).endDate).toBeNull();
  });

  /**
   * CACAT: startDate menjadi Invalid Date bila kolom start tidak ada.
   *
   * `new Date(undefined)` menghasilkan Invalid Date, dan tidak ada penjagaan
   * seperti yang dipakai untuk `end`. Bidangnya diketik `Date` wajib.
   *
   * Akibatnya bagi pemakai: Invalid Date menjadi `null` saat diserialkan ke
   * JSON, jadi frontend menerima tanggal mulai kosong. Lebih jauh, promosi
   * yang tanggal mulainya rusak tidak akan pernah cocok pada perbandingan
   * "apakah promosi sedang berjalan hari ini" — SEMUA perbandingan dengan
   * Invalid Date bernilai salah — sehingga promosi yang sah tidak pernah
   * dianggap aktif.
   */
  it("CACAT: start yang hilang menjadi Invalid Date dan tersaji null", () => {
    const { start, ...tanpa } = barisPrisma;
    const m = PromotionModel.fromMap(tanpa);

    expect(m.startDate).toBeInstanceOf(Date);
    expect(isNaN(m.startDate.getTime())).toBe(true);
    expect(JSON.parse(JSON.stringify(m)).startDate).toBeNull();
  });

  /**
   * CACAT: objek yang sudah memakai nama startDate/endDate tidak dikenali.
   *
   * fromMap HANYA membaca `data.start` dan `data.end`. Objek promosi yang
   * datang dengan nama bidang milik kelasnya sendiri — hasil bolak-balik lewat
   * JSON, cache, atau badan permintaan dari klien — kehilangan kedua tanggal
   * itu: startDate menjadi Invalid Date dan endDate menjadi null.
   *
   * Akibatnya bagi pemakai: menyimpan ulang sebuah promosi yang baru saja
   * dibaca dari API akan MENGHAPUS masa berlakunya tanpa peringatan. Promosi
   * yang semula berakhir 31 Desember menjadi tanpa tanggal berakhir.
   */
  it("CACAT: bidang startDate/endDate pada masukan diabaikan sama sekali", () => {
    const m = PromotionModel.fromMap({
      ...barisPrisma,
      start: undefined,
      end: undefined,
      startDate: new Date("2026-11-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    });

    expect(isNaN(m.startDate.getTime())).toBe(true);
    expect(m.endDate).toBeNull();
  });

  it("deleted_at berupa teks dibungkus menjadi Date", () => {
    const m = PromotionModel.fromMap({
      ...barisPrisma,
      deleted_at: "2026-12-01T00:00:00.000Z",
    });

    expect(m.deleted_at).toBeInstanceOf(Date);
    expect(m.deleted_at!.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("deleted_at yang tidak dikirim menjadi null, bukan Invalid Date", () => {
    const { deleted_at, ...tanpa } = barisPrisma;
    expect(PromotionModel.fromMap(tanpa).deleted_at).toBeNull();
  });
});

describe("Bidang angka target", () => {
  it("mengubah Prisma.Decimal menjadi angka biasa", () => {
    const m = PromotionModel.fromMap(barisPrisma);

    expect(m.target).toBe(50000000);
    expect(typeof m.target).toBe("number");
  });

  it("mengubah teks menjadi angka", () => {
    expect(
      PromotionModel.fromMap({ ...barisPrisma, target: "1250.5" }).target
    ).toBe(1250.5);
  });

  /**
   * CACAT: target yang tidak dikirim menjadi NaN, lalu null di JSON.
   *
   * `Number(undefined)` adalah NaN. Target adalah nilai pembelian yang harus
   * dicapai agar promosi berlaku, jadi bidang ini menentukan apakah seorang
   * pengguna berhak mendapat promosi.
   *
   * Akibatnya bagi pemakai: perbandingan `pembelian >= target` dengan NaN
   * SELALU bernilai salah, sehingga promosi tidak pernah bisa dicapai siapa
   * pun. Di layar, targetnya tampil kosong karena NaN diserialkan menjadi
   * null. Tidak ada galat di sisi server.
   */
  it("CACAT: target yang hilang menjadi NaN dan tersaji null", () => {
    const { target, ...tanpa } = barisPrisma;
    const m = PromotionModel.fromMap(tanpa);

    expect(Number.isNaN(m.target)).toBe(true);
    expect(JSON.parse(JSON.stringify(m)).target).toBeNull();
    expect(100_000_000 >= m.target).toBe(false);
  });
});

describe("Penanganan kolom boolean is_delete", () => {
  it("menerima boolean asli", () => {
    expect(
      PromotionModel.fromMap({ ...barisPrisma, is_delete: true }).is_delete
    ).toBe(true);
  });

  /**
   * CACAT: is_delete tidak diterjemahkan sama sekali.
   *
   * Nilainya disalin mentah walaupun diketik `boolean` wajib. Kolom TinyInt
   * yang kembali sebagai angka atau teks lolos apa adanya, dan bila kolomnya
   * tidak dikirim, bidang wajib itu justru hilang dari JSON.
   *
   * Teks "0" bernilai benar di JavaScript, jadi promosi yang MASIH BERLAKU
   * dikira sudah dihapus dan tidak ditawarkan kepada pengguna.
   */
  it("CACAT: angka dan teks lolos apa adanya, bukan menjadi boolean", () => {
    expect(
      PromotionModel.fromMap({ ...barisPrisma, is_delete: 1 }).is_delete
    ).toBe(1 as unknown as boolean);

    const teksNol = PromotionModel.fromMap({ ...barisPrisma, is_delete: "0" });
    expect(teksNol.is_delete).toBe("0" as unknown as boolean);
    expect(Boolean(teksNol.is_delete)).toBe(true);
  });

  it("CACAT: is_delete yang hilang membuat bidang wajib itu lenyap dari JSON", () => {
    const { is_delete, ...tanpa } = barisPrisma;
    const m = PromotionModel.fromMap(tanpa);

    expect(m.is_delete).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain("is_delete");
  });
});

describe("Larik bersarang promotion_rules", () => {
  it("menyalin id, rule, dan value tiap aturan", () => {
    const m = PromotionModel.fromMap({
      ...barisPrisma,
      promotion_rules: [
        { id: 1, rule: "minimum_pembelian", value: "10000000" },
      ],
    });

    expect(m.promotion_rules).toHaveLength(1);
    expect(m.promotion_rules![0].id).toBe(1);
    expect(m.promotion_rules![0].rule).toBe("minimum_pembelian");
    expect(m.promotion_rules![0].value).toBe("10000000");
  });

  it("larik kosong tetap larik kosong", () => {
    expect(
      PromotionModel.fromMap({ ...barisPrisma, promotion_rules: [] })
        .promotion_rules
    ).toEqual([]);
  });

  it("larik yang tidak dikirim tetap undefined", () => {
    expect(PromotionModel.fromMap(barisPrisma).promotion_rules).toBeUndefined();
  });

  /**
   * CACAT: promotion_code_id pada tiap aturan dibuang.
   *
   * Antarmuka IPromotion memuat `promotion_code_id` pada promotion_rules,
   * tetapi baik fromMap maupun konstruktor hanya menyalin id, rule, dan value.
   * Menariknya, promotion_brand pada model yang SAMA justru menyalinnya —
   * jadi dua larik bersarang berperilaku berbeda tanpa alasan.
   *
   * Akibatnya bagi pemakai: frontend yang menyunting aturan promosi tidak tahu
   * aturan itu milik promosi yang mana bila lariknya dipindah-pindah antar
   * bagian layar.
   */
  it("CACAT: promotion_code_id aturan tidak ikut terbawa", () => {
    const m = PromotionModel.fromMap({
      ...barisPrisma,
      promotion_rules: [
        { id: 1, rule: "minimum_pembelian", value: "1", promotion_code_id: 15 },
      ],
    });
    const aturan = m.promotion_rules![0] as unknown as Record<string, unknown>;

    expect(aturan.promotion_code_id).toBeUndefined();
    // Padahal larik bersarang lain di model yang sama menyalinnya.
    const n = PromotionModel.fromMap({
      ...barisPrisma,
      promotion_brand: [{ id: 1, product_brand_id: 3, promotion_code_id: 15 }],
    });
    expect(n.promotion_brand![0].promotion_code_id).toBe(15);
  });
});

describe("Larik bersarang promotion_brand", () => {
  it("menyalin kunci merek dan menerjemahkan relasi mereknya", () => {
    const m = PromotionModel.fromMap({
      ...barisPrisma,
      promotion_brand: [
        {
          id: 1,
          product_brand_id: 3,
          promotion_code_id: 15,
          product_brand: { id: 3, name: "Krakatau", created_by: 1 },
        },
      ],
    });
    const merek = m.promotion_brand![0];

    expect(merek.id).toBe(1);
    expect(merek.product_brand_id).toBe(3);
    expect(merek.promotion_code_id).toBe(15);
    expect(merek.product_brand).toBeInstanceOf(ProductBrandModel);
    expect(merek.product_brand!.name).toBe("Krakatau");
  });

  it("merek yang tidak disertakan menjadi undefined, bukan galat", () => {
    const m = PromotionModel.fromMap({
      ...barisPrisma,
      promotion_brand: [{ id: 1, product_brand_id: 3 }],
    });

    expect(m.promotion_brand![0].product_brand).toBeUndefined();
  });

  it("larik kosong tetap larik kosong, larik yang tidak dikirim tetap undefined", () => {
    expect(
      PromotionModel.fromMap({ ...barisPrisma, promotion_brand: [] })
        .promotion_brand
    ).toEqual([]);
    expect(PromotionModel.fromMap(barisPrisma).promotion_brand).toBeUndefined();
  });
});

describe("Relasi pemasok", () => {
  it("pemasok yang dikirim menjadi instance SupplierModel lewat fromMap", () => {
    const m = PromotionModel.fromMap({
      ...barisPrisma,
      supplier: {
        id: 4,
        name: "CV Baja Utama",
        address: "Jl. Baja 9",
        npwp: null,
        created_by: 1,
        created_at: new Date("2024-01-01"),
        can_delete: "1",
      },
    });

    expect(m.supplier).toBeInstanceOf(SupplierModel);
    expect(m.supplier!.name).toBe("CV Baja Utama");
    // Di sini fromMap dipakai, jadi can_delete benar-benar diterjemahkan —
    // berbeda dengan GoodReceiptModel yang memakai konstruktor.
    expect(m.supplier!.can_delete).toBe(true);
  });

  it("pemasok yang tidak diminta tetap undefined", () => {
    expect(PromotionModel.fromMap(barisPrisma).supplier).toBeUndefined();
  });
});

describe("Relasi pengguna pembuat, pengubah, dan penghapus", () => {
  const barisUser = { id: 2, name: "Andi", username: "andi", role: 1 };

  it("ketiganya menjadi UserViewModel bila dikirim", () => {
    const m = PromotionModel.fromMap({
      ...barisPrisma,
      promotion_code_created_by: barisUser,
      promotion_code_updated_by: barisUser,
      promotion_code_deleted_by: barisUser,
    });

    expect(m.promotion_code_created_by).toBeInstanceOf(UserViewModel);
    expect(m.promotion_code_updated_by).toBeInstanceOf(UserViewModel);
    expect(m.promotion_code_deleted_by).toBeInstanceOf(UserViewModel);
  });

  /**
   * CACAT: ketiga relasi pengguna diperlakukan tidak konsisten saat kosong.
   *
   * Nilai cadangannya berbeda-beda: pembuat menjadi undefined, sedangkan
   * pengubah dan penghapus menjadi null. Ketiganya ditulis dengan pola yang
   * sama persis (`data.x ? ... : nilai`), hanya nilai cadangannya yang beda.
   *
   * Akibatnya bagi pemakai: pada balasan yang sama, satu relasi pengguna
   * hilang dari JSON sementara dua lainnya muncul sebagai null. Frontend yang
   * memeriksa dengan cara yang sama untuk ketiganya harus menangani dua bentuk
   * kekosongan yang berbeda, dan tidak ada cara membedakan "belum pernah
   * diubah" dari "relasi tidak ikut dimuat".
   */
  it("CACAT: pembuat menjadi undefined sedangkan pengubah dan penghapus menjadi null", () => {
    const m = PromotionModel.fromMap(barisPrisma);

    expect(m.promotion_code_created_by).toBeUndefined();
    expect(m.promotion_code_updated_by).toBeNull();
    expect(m.promotion_code_deleted_by).toBeNull();

    const json = JSON.stringify(m);
    expect(json).not.toContain("promotion_code_created_by");
    expect(json).toContain('"promotion_code_updated_by":null');
  });
});
