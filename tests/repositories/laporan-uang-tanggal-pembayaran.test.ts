import { readFileSync } from "fs";
import { join } from "path";

/**
 * Penjaga: laporan penerimaan uang harian disaring pada TANGGAL PEMBAYARAN.
 *
 * Bentuk lamanya menyaring `sales_invoice_code.date` dan tidak pernah
 * menyentuh `sales_invoice_payment.date` sama sekali, sehingga laporannya
 * menjawab "pembayaran atas faktur yang bertanggal hari ini" — bukan "uang
 * yang diterima hari ini", yang adalah judulnya.
 *
 * Dua akibatnya berlawanan arah, dan keduanya terjadi di produksi. Pelunasan
 * piutang Rp 103.000 hari ini atas faktur kemarin HILANG dari laporan;
 * sebaliknya, pembayaran susulan atas faktur hari ini ikut TERHITUNG di hari
 * ini walau uangnya belum datang.
 *
 * YANG DIJAGA TES INI hanyalah bentuk kuerinya, bukan hasilnya. Ia membaca
 * berkas sumber, bukan menjalankan SQL — MySQL tidak tersedia di jajaran uji
 * ini. Jadi ia menahan kemunduran, bukan membuktikan angkanya benar.
 */
describe("laporan unduh penerimaan uang disaring pada tanggal pembayaran", () => {
  const sumber = readFileSync(
    join(
      __dirname,
      "..",
      "..",
      "src",
      "repositories",
      "sales-invoice-payment.repository.ts"
    ),
    "utf8"
  );

  /** Badan downloadReport saja — bukan seluruh berkas. */
  const badan = (() => {
    const mulai = sumber.indexOf("async downloadReport(");
    expect(mulai).toBeGreaterThan(-1);
    const habis = sumber.indexOf("\n  async ", mulai + 1);
    return sumber.slice(mulai, habis === -1 ? undefined : habis);
  })();

  it("menyaring WHERE pada sales_invoice_payment.date", () => {
    expect(badan).toMatch(/WHERE\s+sales_invoice_payment\.date\s*=\s*\?/);
  });

  it("tidak lagi menyaring WHERE pada tanggal fakturnya", () => {
    expect(badan).not.toMatch(/WHERE\s+sales_invoice_code\.date\s*=\s*\?/);
  });

  /*
    Tabel turunan nilai faktur harus tetap terbatas. Tanpa batas apa pun ia
    mengagregasi seluruh sales_invoice — hampir sejuta baris — untuk laporan
    satu hari, dan itulah bentuk yang dulu sengaja diperbaiki.
  */
  it("membatasi tabel turunan nilai faktur pada faktur yang dibayar hari itu", () => {
    expect(badan).toMatch(/EXISTS\s*\(/);
    expect(badan).toMatch(/sip2\.date\s*=\s*\?/);
  });
});
