import { Prisma } from "@prisma/client";

import { StockCardModel } from "../../src/models/stock-card.model";
import { CustomerModel } from "../../src/models/customer.model";
import SupplierModel from "../../src/models/supplier.model";
import { ProductUnitModel } from "../../src/models/product-unit.model";

/**
 * Perilaku StockCardModel.
 *
 * Kartu stok adalah riwayat keluar-masuk barang: satu baris per mutasi,
 * lengkap dengan sisa stok setelah mutasi itu. Angkanya dipakai pengguna untuk
 * mencocokkan stok fisik dengan catatan, jadi nilai yang salah di sini tidak
 * hanya merusak tampilan — ia membuat selisih stok yang dikejar orang gudang
 * tidak pernah ketemu.
 *
 * Berbeda dengan model lain di repo ini, fromMap StockCardModel meneruskan
 * SELURUH bidang konstruktornya. Masalahnya ada di tempat lain:
 *
 *   Dua bidang tanggal dibungkus `new Date(...)` tanpa penjagaan, jadi nilai
 *   yang tidak dikirim menjadi Invalid Date.
 *
 *   `quantity` dan `display_quantity` dibungkus Number() tanpa penjagaan,
 *   sementara `stock` dijaga dengan pemeriksaan null — tiga kolom angka
 *   bersebelahan dengan dua aturan berbeda.
 */

const barisPrisma = {
  id: 55,
  date: "2026-03-03T00:00:00.000Z",
  product_id: 12,
  product_unit_id: 41,
  quantity: "30",
  display_quantity: "3",
  stock: "270",
  document_name: "SI-2026-0001",
  supplier_id: null,
  customer_id: 7,
  sales_invoice_id: 91,
  sales_invoice_code_id: 2,
  adjustment_case_id: null,
  adjustment_case_code_id: null,
  good_receipt_id: null,
  good_receipt_code_id: null,
  sales_return_id: null,
  sales_return_code_id: null,
  created_at: "2026-03-03T04:05:06.000Z",
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin identitas dan nama dokumen", () => {
    const m = StockCardModel.fromMap(barisPrisma);

    expect(m.id).toBe(55);
    expect(m.product_id).toBe(12);
    expect(m.product_unit_id).toBe(41);
    expect(m.document_name).toBe("SI-2026-0001");
  });

  it("menyalin lawan transaksi", () => {
    const m = StockCardModel.fromMap(barisPrisma);

    expect(m.customer_id).toBe(7);
    expect(m.supplier_id).toBeNull();
  });

  it("menyalin setiap penunjuk dokumen sumber satu per satu", () => {
    // Delapan kolom ini menentukan mutasi berasal dari nota mana. Kalau salah
    // satu tidak ikut tersalin, tautan "lihat dokumen" di layar kartu stok
    // mati tanpa penjelasan.
    const m = StockCardModel.fromMap({
      ...barisPrisma,
      adjustment_case_id: 3,
      adjustment_case_code_id: 4,
      good_receipt_id: 5,
      good_receipt_code_id: 6,
      sales_return_id: 7,
      sales_return_code_id: 8,
    });

    expect(m.sales_invoice_id).toBe(91);
    expect(m.sales_invoice_code_id).toBe(2);
    expect(m.adjustment_case_id).toBe(3);
    expect(m.adjustment_case_code_id).toBe(4);
    expect(m.good_receipt_id).toBe(5);
    expect(m.good_receipt_code_id).toBe(6);
    expect(m.sales_return_id).toBe(7);
    expect(m.sales_return_code_id).toBe(8);
  });

  it("menjaga penunjuk dokumen yang kosong tetap null", () => {
    const m = StockCardModel.fromMap(barisPrisma);

    expect(m.adjustment_case_id).toBeNull();
    expect(m.good_receipt_id).toBeNull();
    expect(m.sales_return_id).toBeNull();
  });

  it("menghasilkan instance StockCardModel, bukan objek biasa", () => {
    expect(StockCardModel.fromMap(barisPrisma)).toBeInstanceOf(StockCardModel);
  });

  it("meneruskan seluruh bidang konstruktor tanpa ada yang tertinggal", () => {
    const m = StockCardModel.fromMap(barisPrisma) as unknown as Record<
      string,
      unknown
    >;

    for (const bidang of [
      "id",
      "date",
      "product_id",
      "product_unit_id",
      "display_quantity",
      "quantity",
      "stock",
      "document_name",
      "supplier_id",
      "customer_id",
      "sales_invoice_id",
      "sales_invoice_code_id",
      "adjustment_case_id",
      "adjustment_case_code_id",
      "good_receipt_id",
      "good_receipt_code_id",
      "sales_return_id",
      "sales_return_code_id",
      "created_at",
    ]) {
      // Termasuk yang bernilai null: yang diperiksa adalah kuncinya ada.
      expect(Object.prototype.hasOwnProperty.call(m, bidang)).toBe(true);
    }
  });
});

describe("Bidang tanggal", () => {
  it("mengubah teks tanggal menjadi Date", () => {
    const m = StockCardModel.fromMap(barisPrisma);

    expect(m.date).toBeInstanceOf(Date);
    expect(m.date.toISOString()).toBe("2026-03-03T00:00:00.000Z");
    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at.toISOString()).toBe("2026-03-03T04:05:06.000Z");
  });

  it("menyalin objek Date dari Prisma menjadi Date baru dengan nilai sama", () => {
    const asli = new Date("2026-03-03T00:00:00.000Z");
    const m = StockCardModel.fromMap({ ...barisPrisma, date: asli });

    expect(m.date).toEqual(asli);
    expect(m.date).not.toBe(asli);
  });

  /**
   * CACAT: tanggal yang tidak dikirim menjadi Invalid Date.
   *
   * Kedua bidang dibungkus `new Date(...)` tanpa memeriksa nilainya lebih
   * dulu. `new Date(undefined)` menghasilkan Invalid Date, yang berubah
   * menjadi null saat diserialkan ke JSON.
   *
   * Akibatnya bagi pengguna: baris kartu stok tampil tanpa tanggal, dan
   * pengurutan berdasarkan tanggal di frontend menjadi acak karena setiap
   * perbandingan dengan Invalid Date bernilai salah. Riwayat mutasi bisa
   * tampil tidak berurutan, sehingga kolom sisa stok terlihat tidak masuk akal
   * padahal datanya benar.
   */
  it("CACAT: date dan created_at yang hilang menjadi Invalid Date", () => {
    const { date, created_at, ...tanpa } = barisPrisma;
    const m = StockCardModel.fromMap(tanpa);

    expect(m.date).toBeInstanceOf(Date);
    expect(isNaN(m.date.getTime())).toBe(true);
    expect(isNaN(m.created_at.getTime())).toBe(true);

    const json = JSON.parse(JSON.stringify(m));
    expect(json.date).toBeNull();
    expect(json.created_at).toBeNull();
  });

  /**
   * CACAT: tanggal bernilai null menjadi 1 Januari 1970.
   *
   * `new Date(null)` sama dengan `new Date(0)` — bukan Invalid Date, melainkan
   * awal epoch. Nilainya tampak sah sehingga tidak ada yang curiga.
   *
   * Akibatnya bagi pengguna: mutasi tanpa tanggal muncul di paling atas
   * riwayat dengan tanggal 1 Januari 1970, dan ikut terhitung pada laporan
   * periode mana pun yang batas bawahnya lebih awal dari itu.
   */
  it("CACAT: tanggal bernilai null menjadi 1970-01-01, bukan Invalid Date", () => {
    const m = StockCardModel.fromMap({ ...barisPrisma, date: null });

    expect(m.date.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });
});

describe("Bidang angka: jumlah dan sisa stok", () => {
  it("mengubah teks desimal menjadi angka", () => {
    const m = StockCardModel.fromMap(barisPrisma);

    expect(m.quantity).toBe(30);
    expect(m.display_quantity).toBe(3);
    expect(m.stock).toBe(270);
  });

  it("mengubah Prisma.Decimal menjadi angka biasa", () => {
    const m = StockCardModel.fromMap({
      ...barisPrisma,
      quantity: new Prisma.Decimal("30.5"),
      stock: new Prisma.Decimal("269.5"),
    });

    expect(typeof m.quantity).toBe("number");
    expect(m.quantity).toBe(30.5);
    expect(m.stock).toBe(269.5);
  });

  it("menjaga stock bernilai null tetap null, tidak menjadi 0", () => {
    // stock null berarti "sisa stok tidak dihitung untuk baris ini" — beda
    // makna dengan stok nol. Penjagaannya sudah benar dan dikunci di sini.
    expect(
      StockCardModel.fromMap({ ...barisPrisma, stock: null }).stock
    ).toBeNull();
  });

  it("menjaga stock bernilai nol tetap 0", () => {
    expect(StockCardModel.fromMap({ ...barisPrisma, stock: 0 }).stock).toBe(0);
  });

  /**
   * CACAT: stock yang tidak dikirim menjadi null, tertukar dengan null asli.
   *
   * Pemeriksaannya memakai `== null` yang longgar, jadi undefined ikut
   * tertangkap dan diubah menjadi null. Kolom yang lupa di-select tidak bisa
   * dibedakan dari sisa stok yang memang sengaja dikosongkan.
   */
  it("CACAT: stock yang tidak dikirim ikut menjadi null", () => {
    const { stock, ...tanpa } = barisPrisma;
    expect(StockCardModel.fromMap(tanpa).stock).toBeNull();
  });

  /**
   * CACAT: quantity dan display_quantity tidak dijaga seperti stock.
   *
   * Keduanya dibungkus Number() polos, jadi kolom yang tidak dikirim menjadi
   * NaN dan diserialkan sebagai null — sementara `stock` di baris yang sama
   * memang menghasilkan null yang sah. Dua perilaku berbeda dalam satu objek.
   *
   * Akibatnya bagi pengguna: jumlah mutasi tampil kosong, dan penjumlahan
   * kartu stok untuk mencari total masuk/keluar ikut menjadi NaN — laporan
   * mutasi barang tampil kosong tanpa satu pun pesan galat.
   */
  it("CACAT: quantity dan display_quantity yang hilang menjadi NaN", () => {
    const { quantity, display_quantity, ...tanpa } = barisPrisma;
    const m = StockCardModel.fromMap(tanpa);

    expect(m.quantity).toBeNaN();
    expect(m.display_quantity).toBeNaN();
    expect(JSON.parse(JSON.stringify(m)).quantity).toBeNull();
  });

  /**
   * CACAT: quantity bernilai null menjadi 0, bukan null.
   *
   * `Number(null)` bernilai 0, jadi mutasi tanpa jumlah tercatat sebagai
   * mutasi nol — barisnya tetap muncul di riwayat tetapi tidak menjelaskan
   * apa-apa bagi pengguna yang sedang mencari selisih stok.
   */
  it("CACAT: quantity bernilai null menjadi angka 0", () => {
    expect(
      StockCardModel.fromMap({ ...barisPrisma, quantity: null }).quantity
    ).toBe(0);
  });
});

describe("Relasi bersarang", () => {
  const barisCustomer = {
    id: 7,
    name: "Toko Maju",
    address: "Jl. Melati 10",
    npwp: null,
    pic: "Budi",
    phone_number: "0811222333",
    created_by: 3,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    is_delete: false,
  };

  const barisSupplier = {
    id: 9,
    name: "PT Baja Sentosa",
    address: "Jl. Industri 5",
    npwp: "1234567890",
    created_by: 3,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    is_delete: false,
  };

  const barisUnit = {
    id: 41,
    product_id: 12,
    unit: "IKAT",
    conversion: "10",
    sales_price: "150000",
    sales_discount: "0",
    purchase_price: "120000",
    purchase_discount: "0",
  };

  it("memetakan customer menjadi CustomerModel", () => {
    const m = StockCardModel.fromMap({
      ...barisPrisma,
      customer: barisCustomer,
    });

    expect(m.customer).toBeInstanceOf(CustomerModel);
    expect(m.customer?.name).toBe("Toko Maju");
    expect(m.customer?.pic).toBe("Budi");
  });

  it("memetakan supplier menjadi SupplierModel", () => {
    const m = StockCardModel.fromMap({
      ...barisPrisma,
      supplier: barisSupplier,
    });

    expect(m.supplier).toBeInstanceOf(SupplierModel);
    expect(m.supplier?.name).toBe("PT Baja Sentosa");
  });

  it("memetakan product_unit menjadi ProductUnitModel dan mengubah konversinya", () => {
    const m = StockCardModel.fromMap({
      ...barisPrisma,
      product_unit: barisUnit,
    });

    expect(m.product_unit).toBeInstanceOf(ProductUnitModel);
    expect(m.product_unit?.conversion).toBe(10);
    expect(m.product_unit?.unit).toBe("IKAT");
  });

  it("mengubah relasi bernilai null menjadi null", () => {
    const m = StockCardModel.fromMap({
      ...barisPrisma,
      customer: null,
      supplier: null,
      product_unit: null,
    });

    expect(m.customer).toBeNull();
    expect(m.supplier).toBeNull();
    expect(m.product_unit).toBeNull();
  });

  /**
   * CACAT: relasi yang tidak di-include berubah menjadi null, bukan undefined.
   *
   * fromMap menulis tiga cabang: `== null` lebih dulu, baru `== undefined`.
   * Karena `undefined == null` bernilai benar, cabang pertama sudah menangkap
   * keduanya — cabang undefined-nya kode mati yang tidak pernah dijalankan.
   *
   * Akibatnya: balasan kartu stok SELALU memuat `customer: null`,
   * `supplier: null`, dan `product_unit: null` walau query-nya memang tidak
   * meminta relasi itu. Frontend tidak bisa membedakan "pelanggannya memang
   * tidak ada" dari "relasinya tidak ikut dimuat", sehingga layar bisa
   * menampilkan mutasi penjualan seolah tanpa pelanggan.
   */
  it("CACAT: relasi yang tidak di-include menjadi null, cabang undefined tidak pernah tercapai", () => {
    const m = StockCardModel.fromMap(barisPrisma);

    expect(m.customer).toBeNull();
    expect(m.supplier).toBeNull();
    expect(m.product_unit).toBeNull();
    expect(m.customer).not.toBeUndefined();
  });

  /**
   * CACAT: cacat CustomerModel ikut terbawa ke kartu stok.
   *
   * customer dibentuk lewat CustomerModel.fromMap, yang tidak meneruskan
   * updated_by, updated_at, deleted_by, deleted_at, dan membuang can_delete
   * berbentuk angka.
   *
   * Akibatnya bagi pengguna: data pelanggan pada kartu stok selalu lebih
   * miskin daripada yang tersimpan di basis data, dan tidak ada cara
   * memperbaikinya dari sisi kartu stok — perbaikannya harus di CustomerModel.
   */
  it("CACAT: can_delete berbentuk angka pada customer bersarang ikut hilang", () => {
    const m = StockCardModel.fromMap({
      ...barisPrisma,
      customer: { ...barisCustomer, can_delete: 1, updated_by: 4 },
    });

    expect(m.customer?.can_delete).toBeUndefined();
    expect(m.customer?.updated_by).toBeUndefined();
  });
});
