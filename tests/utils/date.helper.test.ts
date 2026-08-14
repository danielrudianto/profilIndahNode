import { rentangBulan, rentangTahun } from "../../src/utils/date.helper";

/** Bentuk tanggal lokal sebagai YYYY-MM-DD supaya mudah dibaca saat gagal. */
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/** Apakah sebuah tanggal termasuk dalam rentang setengah terbuka. */
const termasuk = (d: Date, r: { mulai: Date; sebelum: Date }) =>
  d >= r.mulai && d < r.sebelum;

describe("rentangBulan", () => {
  it("dimulai pada tanggal 1 bulan yang diminta", () => {
    expect(ymd(rentangBulan(2026, 5).mulai)).toBe("2026-05-01");
    expect(ymd(rentangBulan(2026, 1).mulai)).toBe("2026-01-01");
    expect(ymd(rentangBulan(2026, 12).mulai)).toBe("2026-12-01");
  });

  it("batas atasnya tanggal 1 bulan berikutnya, bukan hari terakhir", () => {
    // Inilah inti perbaikannya. Kode lama memakai new Date(year, month, 0)
    // yang menghasilkan 31 Mei — sehingga dengan `lt`, seluruh tanggal 31 Mei
    // tidak ikut terhitung.
    expect(ymd(rentangBulan(2026, 5).sebelum)).toBe("2026-06-01");
  });

  it("berpindah tahun dengan benar pada bulan Desember", () => {
    const r = rentangBulan(2026, 12);
    expect(ymd(r.mulai)).toBe("2026-12-01");
    expect(ymd(r.sebelum)).toBe("2027-01-01");
  });

  it("mencakup hari terakhir bulan — kasus yang dulu hilang", () => {
    expect(termasuk(new Date(2026, 4, 31), rentangBulan(2026, 5))).toBe(true);
    expect(termasuk(new Date(2026, 3, 30), rentangBulan(2026, 4))).toBe(true);
    expect(termasuk(new Date(2026, 11, 31), rentangBulan(2026, 12))).toBe(true);
  });

  it("menolak hari pertama bulan berikutnya", () => {
    expect(termasuk(new Date(2026, 5, 1), rentangBulan(2026, 5))).toBe(false);
  });

  it("menolak hari terakhir bulan sebelumnya", () => {
    expect(termasuk(new Date(2026, 3, 30), rentangBulan(2026, 5))).toBe(false);
  });

  it("menangani Februari, termasuk tahun kabisat", () => {
    expect(termasuk(new Date(2026, 1, 28), rentangBulan(2026, 2))).toBe(true);
    // 2028 kabisat, 29 Februari harus ikut terhitung.
    expect(termasuk(new Date(2028, 1, 29), rentangBulan(2028, 2))).toBe(true);
    expect(ymd(rentangBulan(2028, 2).sebelum)).toBe("2028-03-01");
  });

  it("perilaku lama membuktikan bug: batas hari terakhir melewatkan sehari", () => {
    // Rekonstruksi rumus lama, sebagai penjaga supaya tidak kembali dipakai.
    const batasLama = new Date(2026, 5, 0); // menghasilkan 31 Mei
    const hariTerakhir = new Date(2026, 4, 31);
    expect(hariTerakhir < batasLama).toBe(false);
    expect(hariTerakhir < rentangBulan(2026, 5).sebelum).toBe(true);
  });
});

describe("rentangTahun", () => {
  it("mencakup satu tahun penuh", () => {
    const r = rentangTahun(2026);
    expect(ymd(r.mulai)).toBe("2026-01-01");
    expect(ymd(r.sebelum)).toBe("2027-01-01");
  });

  it("mencakup 31 Desember — kasus yang dulu hilang", () => {
    expect(termasuk(new Date(2026, 11, 31), rentangTahun(2026))).toBe(true);
  });

  it("menolak tanggal di luar tahun tersebut", () => {
    expect(termasuk(new Date(2025, 11, 31), rentangTahun(2026))).toBe(false);
    expect(termasuk(new Date(2027, 0, 1), rentangTahun(2026))).toBe(false);
  });
});
