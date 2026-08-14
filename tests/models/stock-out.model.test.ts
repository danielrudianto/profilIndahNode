import { Prisma } from "@prisma/client";

import { StockOutModel } from "../../src/models/stock-out.model";
import { StockInModel } from "../../src/models/stock-in.model";
import { IStockoutModel } from "../../src/interfaces/stock-out.interface";

/**
 * Perilaku StockOutModel.
 *
 * Baris stock_out adalah pengambilan barang dari satu lot masuk (stock_in)
 * dengan metode FIFO: `stock_in_id` menunjuk lot asalnya dan `price` menyimpan
 * harga pokok lot itu. Harga pokok inilah yang dipakai menghitung laba kotor,
 * jadi nilai yang salah di sini langsung mengubah angka laba di laporan.
 *
 * Seperti StockInModel, kelas ini TIDAK punya `fromMap` — hanya konstruktor.
 * Karena itu berkas ini menguji konstruktor dan bentuk datanya saja.
 *
 * Ciri khas konstruktor ini: enam bidang memakai `|| null` dan `|| 0` sebagai
 * nilai bawaan. Operator `||` bereaksi pada SEMUA nilai falsy, bukan hanya
 * undefined — dan itulah sumber cacat yang dikunci di bawah.
 */

const dataKeluar: IStockoutModel = {
  id: 33,
  date: new Date("2026-04-05T00:00:00.000Z"),
  product_id: 12,
  quantity: 20,
  sales_invoice_id: 91,
  sales_invoice_code_id: 2,
  adjustment_case_id: null,
  adjustment_case_code_id: null,
  stock_in_id: 21,
  price: 12000,
};

describe("Konstruktor menyalin bidang dari data masukan", () => {
  it("menyalin identitas satu per satu", () => {
    const m = new StockOutModel(dataKeluar);

    expect(m.id).toBe(33);
    expect(m.product_id).toBe(12);
    expect(m.quantity).toBe(20);
  });

  it("menyalin tanggal dan harga pokok", () => {
    const m = new StockOutModel(dataKeluar);

    expect(m.date).toBe(dataKeluar.date);
    expect(m.price).toBe(12000);
  });

  it("menyalin penunjuk dokumen sumber dan lot asal", () => {
    const m = new StockOutModel(dataKeluar);

    expect(m.sales_invoice_id).toBe(91);
    expect(m.sales_invoice_code_id).toBe(2);
    expect(m.stock_in_id).toBe(21);
  });

  it("menjaga penunjuk yang bernilai null tetap null", () => {
    const m = new StockOutModel(dataKeluar);

    expect(m.adjustment_case_id).toBeNull();
    expect(m.adjustment_case_code_id).toBeNull();
  });

  it("menghasilkan instance StockOutModel", () => {
    expect(new StockOutModel(dataKeluar)).toBeInstanceOf(StockOutModel);
  });

  it("membiarkan id undefined pada baris yang belum tersimpan", () => {
    const { id, ...tanpaId } = dataKeluar;
    expect(new StockOutModel(tanpaId).id).toBeUndefined();
  });
});

describe("Bidang yang ada di kelas tetapi tidak diisi konstruktor", () => {
  /**
   * CACAT: relasi stock_in tidak pernah ditugasi.
   *
   * Kelasnya mendeklarasikan `stock_in?: StockInModel`, tetapi konstruktornya
   * tidak menyentuhnya sama sekali dan IStockoutModel pun tidak memuatnya.
   *
   * Akibatnya: lot asal barang keluar tidak pernah bisa ikut terkirim, jadi
   * layar penelusuran "barang ini diambil dari penerimaan mana" tidak punya
   * data untuk ditampilkan. Bidangnya juga hilang dari JSON, sehingga cacat
   * ini tidak terlihat sampai ada yang mencarinya.
   */
  it("CACAT: stock_in selalu undefined dan hilang dari JSON", () => {
    const dengaRelasi = {
      ...dataKeluar,
      stock_in: new StockInModel({
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
      }),
    } as unknown as IStockoutModel;

    const m = new StockOutModel(dengaRelasi);

    expect(m.stock_in).toBeUndefined();
    expect(JSON.stringify(m)).not.toContain('stock_in"');
    expect(Object.keys(m)).not.toContain("stock_in");
  });

  it("hanya membentuk sepuluh bidang", () => {
    expect(Object.keys(new StockOutModel(dataKeluar))).toEqual([
      "id",
      "product_id",
      "quantity",
      "sales_invoice_id",
      "sales_invoice_code_id",
      "adjustment_case_id",
      "adjustment_case_code_id",
      "date",
      "stock_in_id",
      "price",
    ]);
  });
});

describe("Nilai bawaan dengan operator ||", () => {
  it("mengubah penunjuk yang tidak dikirim menjadi null", () => {
    const { sales_invoice_id, stock_in_id, ...tanpa } = dataKeluar;
    const m = new StockOutModel(tanpa as IStockoutModel);

    expect(m.sales_invoice_id).toBeNull();
    expect(m.stock_in_id).toBeNull();
  });

  it("mengubah harga yang tidak dikirim menjadi 0", () => {
    const { price, ...tanpa } = dataKeluar;
    expect(new StockOutModel(tanpa as IStockoutModel).price).toBe(0);
  });

  /**
   * CACAT: id bernilai 0 berubah menjadi null.
   *
   * `data.stock_in_id || null` bereaksi pada seluruh nilai falsy, termasuk
   * angka 0. Setiap penunjuk yang memang bernilai 0 — id nol memang tidak
   * lazim, tetapi tabel hasil impor data lama kerap memakainya — hilang
   * menjadi null.
   *
   * Akibatnya bagi pengguna: barang keluar kehilangan tautan ke lot asalnya,
   * sehingga harga pokok FIFO tidak bisa ditelusuri kembali dan pembatalan
   * nota tidak tahu lot mana yang sisanya harus dikembalikan.
   */
  it("CACAT: penunjuk bernilai 0 berubah menjadi null", () => {
    const m = new StockOutModel({
      ...dataKeluar,
      sales_invoice_id: 0,
      sales_invoice_code_id: 0,
      adjustment_case_id: 0,
      adjustment_case_code_id: 0,
      stock_in_id: 0,
    });

    expect(m.sales_invoice_id).toBeNull();
    expect(m.sales_invoice_code_id).toBeNull();
    expect(m.adjustment_case_id).toBeNull();
    expect(m.adjustment_case_code_id).toBeNull();
    expect(m.stock_in_id).toBeNull();
  });

  /**
   * CACAT: harga pokok yang tidak valid diam-diam menjadi 0.
   *
   * `data.price || 0` menelan NaN, null, dan undefined menjadi nol tanpa
   * memberi tanda apa pun.
   *
   * Akibatnya bagi pengguna: harga pokok nol membuat laporan laba rugi
   * menghitung seluruh nilai penjualan sebagai laba. Angkanya tampak sah —
   * tidak ada null, tidak ada NaN, tidak ada galat — sehingga kesalahan ini
   * hanya ketahuan saat seseorang mempertanyakan laba yang terlalu besar.
   */
  it("CACAT: harga pokok NaN atau null menjadi 0 tanpa tanda apa pun", () => {
    const nan = new StockOutModel({
      ...dataKeluar,
      price: Number("bukan angka"),
    });
    const kosong = new StockOutModel({
      ...dataKeluar,
      price: null,
    } as unknown as IStockoutModel);

    expect(nan.price).toBe(0);
    expect(kosong.price).toBe(0);
  });

  it("menjaga harga pokok yang memang bernilai 0 tetap 0", () => {
    // Barang hadiah berharga pokok nol tetap tercatat nol — kebetulan benar,
    // karena nilai bawaannya juga nol.
    expect(new StockOutModel({ ...dataKeluar, price: 0 }).price).toBe(0);
  });
});

describe("Bentuk data dan penerjemahan nilai", () => {
  /**
   * CACAT: kelas ini tidak punya fromMap sama sekali.
   *
   * Tidak ada satu pun tempat yang menerjemahkan baris basis data menjadi
   * StockOutModel, sehingga tidak ada konversi Number() maupun penjagaan
   * tanggal seperti pada model lain. Setiap pemanggil harus menanganinya
   * sendiri, dan aturan konversinya tersebar di banyak berkas.
   */
  it("CACAT: tidak ada fromMap untuk membaca baris basis data", () => {
    expect(
      (StockOutModel as unknown as Record<string, unknown>).fromMap
    ).toBeUndefined();
  });

  /**
   * CACAT: jumlah dan harga berbentuk teks diteruskan mentah.
   *
   * quantity disalin apa adanya dan price hanya lewat `|| 0`, jadi keduanya
   * tetap teks bila datang dari query SQL mentah.
   *
   * Akibatnya bagi pengguna: penjumlahan harga pokok dengan operator +
   * menyambung teks alih-alih menjumlahkan angka, sehingga total harga pokok
   * pada laporan bisa menjadi bilangan raksasa yang tidak masuk akal.
   */
  it("CACAT: jumlah dan harga berbentuk teks tetap teks", () => {
    const dariSqlMentah = {
      ...dataKeluar,
      quantity: "20",
      price: "12000",
    } as unknown as IStockoutModel;

    const m = new StockOutModel(dariSqlMentah);

    expect(typeof m.quantity).toBe("string");
    expect(typeof m.price).toBe("string");
    expect((m.price as unknown as string) + "5000").toBe("120005000");
  });

  it("CACAT: Prisma.Decimal diteruskan sebagai objek dan diserialkan menjadi teks", () => {
    const dariPrisma = {
      ...dataKeluar,
      price: new Prisma.Decimal("12000.50"),
    } as unknown as IStockoutModel;

    const m = new StockOutModel(dariPrisma);

    expect(m.price).toBeInstanceOf(Prisma.Decimal);
    expect(JSON.parse(JSON.stringify(m)).price).toBe("12000.5");
  });

  /**
   * CACAT: tanggal tidak pernah dinormalkan menjadi Date.
   *
   * Tipe bidangnya dijanjikan Date, tetapi konstruktornya menyalin apa adanya.
   * Kode pemanggil yang memanggil `stockOut.date.getTime()` melempar TypeError
   * bila nilainya ternyata teks — dan TypeScript tidak memperingatkan karena
   * tipenya sudah terlanjur dinyatakan Date.
   */
  it("CACAT: teks tanggal tetap teks, bukan Date", () => {
    const m = new StockOutModel({
      ...dataKeluar,
      date: "2026-04-05 00:00:00",
    } as unknown as IStockoutModel);

    expect(typeof m.date).toBe("string");
    expect(m.date).not.toBeInstanceOf(Date);
  });
});
