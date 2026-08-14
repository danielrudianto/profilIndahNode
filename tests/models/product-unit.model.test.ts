import { Prisma } from "@prisma/client";

import {
  ProductUnitModel,
  ProductUnitViewModel,
} from "../../src/models/product-unit.model";

/**
 * Perilaku ProductUnitModel dan ProductUnitViewModel.
 *
 * Satuan produk menyimpan angka konversi (mis. 1 IKAT = 10 BATANG) beserta
 * harga jual dan harga beli untuk satuan itu. Angka konversi dipakai untuk
 * mengurangi stok dan menghitung nilai nota, jadi kesalahan konversi tidak
 * berhenti di tampilan — ia ikut mengubah jumlah stok dan nominal tagihan.
 *
 * Dua kelas di berkas ini terlihat kembar, tetapi berbeda dalam dua hal yang
 * menentukan: penjagaan nilai kosong pada harga, dan — yang paling penting —
 * ProductUnitViewModel.fromMap mengembalikan objek literal, bukan hasil `new`.
 */

const barisPrisma = {
  id: 41,
  product_id: 12,
  unit: "IKAT",
  conversion: "10",
  is_delete: false,
  created_by: 5,
  created_at: new Date("2026-01-10T00:00:00.000Z"),
  sales_price: "150000.50",
  sales_discount: "5",
  purchase_price: "120000",
  purchase_discount: "0",
};

describe("ProductUnitModel.fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas satu per satu", () => {
    const m = ProductUnitModel.fromMap(barisPrisma);

    expect(m.id).toBe(41);
    expect(m.product_id).toBe(12);
    expect(m.unit).toBe("IKAT");
  });

  it("menyalin jejak pembuatan", () => {
    const m = ProductUnitModel.fromMap(barisPrisma);

    expect(m.created_by).toBe(5);
    expect(m.created_at).toBe(barisPrisma.created_at);
  });

  it("menghasilkan instance ProductUnitModel", () => {
    expect(ProductUnitModel.fromMap(barisPrisma)).toBeInstanceOf(
      ProductUnitModel
    );
  });

  it("meneruskan seluruh bidang konstruktor tanpa ada yang tertinggal", () => {
    const m = ProductUnitModel.fromMap(barisPrisma) as unknown as Record<
      string,
      unknown
    >;

    for (const bidang of [
      "id",
      "product_id",
      "unit",
      "conversion",
      "is_delete",
      "created_by",
      "created_at",
      "sales_price",
      "sales_discount",
      "purchase_price",
      "purchase_discount",
    ]) {
      expect(m[bidang]).toBeDefined();
    }
  });
});

describe("ProductUnitModel: bidang angka", () => {
  it("mengubah teks desimal menjadi angka", () => {
    const m = ProductUnitModel.fromMap(barisPrisma);

    expect(m.conversion).toBe(10);
    expect(m.sales_price).toBe(150000.5);
    expect(m.sales_discount).toBe(5);
    expect(m.purchase_price).toBe(120000);
    expect(m.purchase_discount).toBe(0);
  });

  it("mengubah Prisma.Decimal menjadi angka biasa", () => {
    const m = ProductUnitModel.fromMap({
      ...barisPrisma,
      conversion: new Prisma.Decimal("12"),
      sales_price: new Prisma.Decimal("99999.99"),
    });

    expect(typeof m.conversion).toBe("number");
    expect(m.conversion).toBe(12);
    expect(m.sales_price).toBe(99999.99);
  });

  /**
   * CACAT: angka yang tidak ikut di-select menjadi NaN.
   *
   * Kelima bidang angka dibungkus Number() tanpa penjagaan, jadi kolom yang
   * tidak dikirim berubah menjadi NaN dan diserialkan sebagai null.
   *
   * Akibatnya bagi pengguna: `conversion` bernilai NaN membuat perhitungan
   * stok (`quantity * conversion`) ikut NaN. Kartu stok bisa menyimpan jumlah
   * yang tidak masuk akal, dan total nota tampil kosong — tanpa satu pun galat
   * yang menandakan ada yang salah.
   */
  it("CACAT: konversi dan harga yang tidak dikirim menjadi NaN", () => {
    const m = ProductUnitModel.fromMap({ id: 41, unit: "IKAT" });

    expect(m.conversion).toBeNaN();
    expect(m.sales_price).toBeNaN();
    expect(m.sales_discount).toBeNaN();
    expect(m.purchase_price).toBeNaN();
    expect(m.purchase_discount).toBeNaN();

    expect(JSON.parse(JSON.stringify(m)).conversion).toBeNull();
    // Inilah akibat sesungguhnya: aritmatika ikut menjadi NaN.
    expect(3 * m.conversion).toBeNaN();
  });

  /**
   * CACAT: harga null menjadi 0.
   *
   * `Number(null)` bernilai 0, sehingga harga yang sengaja dikosongkan di
   * basis data tampil sebagai harga nol rupiah — barang bisa dijual gratis
   * bila frontend memakai nilai itu tanpa memeriksa.
   */
  it("CACAT: harga bernilai null menjadi angka 0", () => {
    const m = ProductUnitModel.fromMap({ ...barisPrisma, sales_price: null });
    expect(m.sales_price).toBe(0);
  });
});

describe("ProductUnitModel: penanganan kolom boolean is_delete", () => {
  it("meneruskan boolean asli", () => {
    expect(
      ProductUnitModel.fromMap({ ...barisPrisma, is_delete: true }).is_delete
    ).toBe(true);
  });

  it("membiarkan is_delete undefined bila tidak dikirim", () => {
    const { is_delete, ...tanpa } = barisPrisma;
    expect(ProductUnitModel.fromMap(tanpa).is_delete).toBeUndefined();
  });

  /**
   * CACAT: is_delete tidak diterjemahkan sama sekali.
   *
   * Tidak ada blok if/else if seperti pada model lain — nilainya disalin apa
   * adanya. Angka 1 tetap angka, dan teks "0" adalah nilai TRUTHY.
   *
   * Akibatnya bagi pengguna: satuan yang sudah dihapus tetap muncul di
   * dropdown satuan pada form penjualan (bila frontend menyaring dengan
   * `is_delete === true`), atau sebaliknya seluruh satuan lenyap dari dropdown
   * (bila menyaring dengan `if (is_delete)` sementara nilainya "0").
   */
  it("CACAT: angka dan teks pada is_delete diteruskan mentah", () => {
    expect(
      ProductUnitModel.fromMap({ ...barisPrisma, is_delete: 1 }).is_delete
    ).toBe(1);

    const teksNol = ProductUnitModel.fromMap({
      ...barisPrisma,
      is_delete: "0",
    });
    expect(teksNol.is_delete).toBe("0");
    expect(Boolean(teksNol.is_delete)).toBe(true);
  });
});

describe("ProductUnitViewModel: bentuk ringkas yang ditempel pada produk", () => {
  const barisRingkas = {
    id: 41,
    product_id: 12,
    unit: "IKAT",
    conversion: "10",
    sales_price: "150000",
    sales_discount: "5",
    purchase_price: "120000",
    purchase_discount: "0",
  };

  it("menyalin identitas dan mengubah angka", () => {
    const v = ProductUnitViewModel.fromMap(barisRingkas);

    expect(v.id).toBe(41);
    expect(v.product_id).toBe(12);
    expect(v.unit).toBe("IKAT");
    expect(v.conversion).toBe(10);
    expect(v.sales_price).toBe(150000);
    expect(v.sales_discount).toBe(5);
    expect(v.purchase_price).toBe(120000);
    expect(v.purchase_discount).toBe(0);
  });

  it("menjaga harga yang tidak dikirim tetap undefined, tidak menjadi NaN", () => {
    // Berbeda dengan ProductUnitModel, keempat harga di sini dijaga dengan
    // pemeriksaan == undefined lebih dulu. Ini perilaku yang benar dan sengaja
    // dikunci supaya tidak ikut hilang bila kode dirapikan kelak.
    const { sales_price, purchase_price, ...tanpa } = barisRingkas;
    const v = ProductUnitViewModel.fromMap(tanpa);

    expect(v.sales_price).toBeUndefined();
    expect(v.purchase_price).toBeUndefined();
  });

  it("menjaga harga bernilai null tetap undefined, tidak menjadi 0", () => {
    const v = ProductUnitViewModel.fromMap({
      ...barisRingkas,
      sales_price: null,
    });

    expect(v.sales_price).toBeUndefined();
  });

  it("tidak membocorkan kolom lain seperti is_delete atau created_by", () => {
    const v = ProductUnitViewModel.fromMap({
      ...barisRingkas,
      is_delete: true,
      created_by: 5,
    }) as unknown as Record<string, unknown>;

    expect(v.is_delete).toBeUndefined();
    expect(v.created_by).toBeUndefined();
  });

  /**
   * CACAT: fromMap mengembalikan objek biasa, BUKAN instance kelasnya.
   *
   * Tipe kembaliannya dituliskan `: ProductUnitViewModel`, tetapi isinya objek
   * literal tanpa `new`. TypeScript menerimanya karena bentuknya cocok
   * (structural typing), jadi tidak ada peringatan apa pun saat kompilasi.
   *
   * Akibatnya: setiap satuan yang ditempel pada produk kehilangan prototipe
   * kelasnya. Pemeriksaan instanceof gagal, dan method apa pun yang kelak
   * ditambahkan ke kelas ini (mis. penghitung harga setelah diskon) tidak akan
   * tersedia — pemanggilnya melempar "is not a function" di runtime meskipun
   * TypeScript menyatakan aman.
   */
  it("CACAT: hasil fromMap bukan instance ProductUnitViewModel", () => {
    const v = ProductUnitViewModel.fromMap(barisRingkas);

    expect(v).not.toBeInstanceOf(ProductUnitViewModel);
    expect(Object.getPrototypeOf(v)).toBe(Object.prototype);
  });

  /**
   * CACAT: konversi yang tidak dikirim menjadi NaN.
   *
   * Hanya keempat harga yang dijaga; `conversion` tetap dibungkus Number()
   * tanpa pemeriksaan. Padahal justru konversi inilah yang dipakai mengalikan
   * jumlah barang saat memotong stok — NaN di sini merambat langsung ke jumlah
   * stok yang tersimpan.
   */
  it("CACAT: conversion yang tidak dikirim menjadi NaN", () => {
    const { conversion, ...tanpa } = barisRingkas;
    expect(ProductUnitViewModel.fromMap(tanpa).conversion).toBeNaN();
  });
});
