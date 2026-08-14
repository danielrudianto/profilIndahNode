import BillModel from "../../src/models/bill.model";

/**
 * Keadaan BillModel.
 *
 * Berbeda dengan model lain di direktori ini, src/models/bill.model.ts hanya
 * memuat kerangka kosong — `class BillModel {}` tanpa satu pun bidang,
 * konstruktor, maupun fromMap. Tidak ada yang bisa diuji dari perilaku
 * penerjemahan baris basis data, karena penerjemahan itu tidak ada.
 *
 * Catatan ini dituliskan sebagai tes, bukan sekadar komentar, supaya keadaannya
 * terkunci. "Bill" adalah nama lama untuk faktur penjualan di basis data ini —
 * jejaknya masih terlihat pada nama relasi di model lain
 * (user_bill_code_created_byTouser, tabel sales_invoice_code yang dulu bernama
 * bill_code). Pekerjaan penerjemahannya sekarang seluruhnya dipegang
 * SalesInvoiceModel.
 *
 * Akibatnya bagi pengguna: tidak ada. Kelas ini tidak dipakai satu berkas pun di
 * src/. Tetapi keberadaannya menyesatkan pembaca kode yang mencari model faktur
 * dan mengira berkas inilah tempatnya, lalu menambahkan bidang di sini padahal
 * yang terkirim ke frontend berasal dari sales-invoice.model.ts.
 */

describe("BillModel", () => {
  it("adalah kelas kosong tanpa fromMap", () => {
    expect(typeof BillModel).toBe("function");
    expect(
      (BillModel as unknown as Record<string, unknown>).fromMap
    ).toBeUndefined();
  });

  it("instansnya tidak memiliki bidang apa pun", () => {
    const m = new BillModel();

    expect(m).toBeInstanceOf(BillModel);
    expect(Object.keys(m)).toEqual([]);
    // Diserialkan menjadi objek kosong: tidak ada satu pun data yang dibawa.
    expect(JSON.stringify(m)).toBe("{}");
  });

  it("tidak memiliki method sendiri di prototipenya", () => {
    expect(Object.getOwnPropertyNames(BillModel.prototype)).toEqual([
      "constructor",
    ]);
  });
});
