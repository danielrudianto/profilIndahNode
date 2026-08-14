import { Prisma } from "@prisma/client";

import { StockInModel } from "../../src/models/stock-in.model";
import { IStockIn } from "../../src/interfaces/stock-in.interface";

/**
 * Perilaku StockInModel.
 *
 * Baris stock_in adalah satu lot barang masuk: jumlah, harga beli, dan
 * `residue` — sisa lot yang belum terjual. Ketiganya dipakai untuk penilaian
 * persediaan dengan metode FIFO; repository menghitung nilai persediaan dengan
 * `SUM(stock_in.price * stock_in.residue)`.
 *
 * Berbeda dengan model lain di repo ini, kelas ini TIDAK punya `fromMap`. Ia
 * hanya bisa dibentuk lewat konstruktor bertipe IStockIn, sehingga tidak ada
 * satu pun tempat yang menerjemahkan baris Prisma menjadi model ini. Karena
 * itu berkas ini menguji konstruktor dan bentuk datanya saja, sesuai keadaan
 * kode sekarang.
 */

const dataMasuk: IStockIn = {
  id: 21,
  date: new Date("2026-04-01T00:00:00.000Z"),
  company_id: 1,
  quantity: 100,
  price: 12000,
  good_receipt_id: 5,
  good_receipt_code_id: 2,
  adjustment_case_id: null,
  adjustment_case_code_id: null,
  product_id: 12,
};

describe("Konstruktor menyalin bidang dari data masukan", () => {
  it("menyalin identitas satu per satu", () => {
    const m = new StockInModel(dataMasuk);

    expect(m.id).toBe(21);
    expect(m.product_id).toBe(12);
    expect(m.company_id).toBe(1);
  });

  it("menyalin jumlah, harga, dan tanggal", () => {
    const m = new StockInModel(dataMasuk);

    expect(m.quantity).toBe(100);
    expect(m.price).toBe(12000);
    expect(m.date).toBe(dataMasuk.date);
  });

  it("menyalin setiap penunjuk dokumen sumber", () => {
    const m = new StockInModel(dataMasuk);

    expect(m.good_receipt_id).toBe(5);
    expect(m.good_receipt_code_id).toBe(2);
    expect(m.adjustment_case_id).toBeNull();
    expect(m.adjustment_case_code_id).toBeNull();
  });

  it("menghasilkan instance StockInModel", () => {
    expect(new StockInModel(dataMasuk)).toBeInstanceOf(StockInModel);
  });

  it("membentuk objek dengan sebelas bidang, tidak lebih", () => {
    // Dikunci supaya bidang baru yang ditambahkan ke kelas tetapi lupa
    // ditugaskan di konstruktor langsung terlihat di tes ini.
    expect(Object.keys(new StockInModel(dataMasuk))).toEqual([
      "id",
      "date",
      "company_id",
      "quantity",
      "price",
      "good_receipt_id",
      "good_receipt_code_id",
      "adjustment_case_id",
      "adjustment_case_code_id",
      "product_id",
      "residue",
    ]);
  });

  it("membiarkan id undefined pada lot yang belum tersimpan", () => {
    const { id, ...tanpaId } = dataMasuk;
    expect(new StockInModel(tanpaId).id).toBeUndefined();
  });
});

describe("Bidang residue", () => {
  it("mengisi residue dengan jumlah penuh saat lot baru dibuat", () => {
    // Untuk lot yang baru masuk, sisa memang sama dengan jumlahnya.
    expect(new StockInModel(dataMasuk).residue).toBe(100);
  });

  /**
   * CACAT: residue SELALU disamakan dengan quantity, tidak pernah bisa diisi.
   *
   * Konstruktornya menulis `this.residue = data.quantity`, dan IStockIn bahkan
   * tidak punya bidang residue — jadi tidak ada cara memberi tahu model bahwa
   * sebagian lot sudah terjual.
   *
   * Akibatnya bila model ini dipakai untuk membaca baris stock_in yang sudah
   * ada: lot yang tinggal bersisa 5 dari 100 akan dilaporkan bersisa 100.
   * Nilai persediaan (harga x sisa) membengkak berkali lipat, dan pengambilan
   * FIFO mengira masih ada barang yang sebenarnya sudah habis terjual —
   * penjualan bisa diproses untuk stok yang tidak ada.
   *
   * Yang menyelamatkan sekarang hanyalah kenyataan bahwa repository menulis
   * kolom residue-nya sendiri dan tidak pernah memakai kelas ini.
   */
  it("CACAT: residue mengabaikan sisa sebenarnya dan mengikuti quantity", () => {
    const lotHampirHabis = {
      ...dataMasuk,
      quantity: 100,
      // Sisa sebenarnya di basis data hanya 5; nilainya tidak punya tempat di
      // IStockIn, jadi harus dipaksakan supaya bisa diuji.
      residue: 5,
    } as unknown as IStockIn;

    const m = new StockInModel(lotHampirHabis);

    expect(m.residue).toBe(100);
    expect(m.residue).not.toBe(5);
  });
});

describe("Bentuk data dan penerjemahan nilai", () => {
  /**
   * CACAT: kelas ini tidak punya fromMap sama sekali.
   *
   * Semua model lain punya `fromMap` sebagai satu-satunya pintu masuk dari
   * baris basis data, lengkap dengan konversi Number() dan penanganan relasi.
   * StockInModel tidak punya, sehingga tidak ada tempat yang menerjemahkan
   * kolom Decimal MySQL menjadi angka JavaScript.
   *
   * Akibatnya: setiap pemanggil harus mengingat sendiri untuk mengonversi
   * harga dan jumlah. Repository stock_in memang melakukannya dengan Number()
   * di tempat masing-masing, tetapi ini berarti aturan konversinya tersebar dan
   * mudah terlewat pada kode baru.
   */
  it("CACAT: tidak ada fromMap, jadi tidak ada satu pun tempat konversi baris basis data", () => {
    expect(
      (StockInModel as unknown as Record<string, unknown>).fromMap
    ).toBeUndefined();
  });

  /**
   * CACAT: nilai uang berbentuk teks atau Decimal diteruskan mentah.
   *
   * Konstruktornya menyalin `price` dan `quantity` apa adanya tanpa Number().
   * Bila objeknya dibentuk dari baris mentah (query SQL langsung atau JSON
   * antrean), harga tetap berupa teks.
   *
   * Akibatnya bagi pengguna: penjumlahan nilai persediaan dengan operator +
   * menyambung teks alih-alih menjumlahkan — "12000" + "5000" menjadi
   * "120005000". Angka rupiah di laporan bisa membengkak menjadi bilangan yang
   * tidak masuk akal, dan tidak ada galat apa pun yang menandainya.
   */
  it("CACAT: harga berbentuk teks tetap teks dan menyambung saat dijumlahkan", () => {
    const dariSqlMentah = {
      ...dataMasuk,
      price: "12000",
      quantity: "100",
    } as unknown as IStockIn;

    const m = new StockInModel(dariSqlMentah);

    expect(typeof m.price).toBe("string");
    expect(typeof m.quantity).toBe("string");
    // residue ikut menjadi teks karena disalin dari quantity.
    expect(typeof m.residue).toBe("string");
    // Inilah akibatnya pada aritmatika di controller.
    expect((m.price as unknown as string) + "5000").toBe("120005000");
  });

  it("CACAT: Prisma.Decimal diteruskan sebagai objek, bukan angka", () => {
    const dariPrisma = {
      ...dataMasuk,
      price: new Prisma.Decimal("12000.50"),
    } as unknown as IStockIn;

    const m = new StockInModel(dariPrisma);

    expect(typeof m.price).toBe("object");
    expect(m.price).toBeInstanceOf(Prisma.Decimal);
    // Diserialkan sebagai teks, bukan angka — frontend menerima "12000.5".
    expect(JSON.parse(JSON.stringify(m)).price).toBe("12000.5");
  });
});
