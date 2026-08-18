import { alokasiDiskonFaktur } from "../src/utils/hpp.helper";

describe("alokasiDiskonFaktur", () => {
  it("tanpa diskon: alokasi nol semua", () => {
    expect(alokasiDiskonFaktur([100, 200], 0)).toEqual([0, 0]);
  });

  it("diskon negatif diperlakukan seperti nol", () => {
    expect(alokasiDiskonFaktur([100, 200], -5)).toEqual([0, 0]);
  });

  it("total baris nol: alokasi nol semua", () => {
    expect(alokasiDiskonFaktur([0, 0], 50)).toEqual([0, 0]);
  });

  it("terbagi pro-rata mengikuti nilai baris", () => {
    expect(alokasiDiskonFaktur([100, 300], 40)).toEqual([10, 30]);
  });

  it("satu baris menanggung seluruh diskon", () => {
    expect(alokasiDiskonFaktur([250], 25)).toEqual([25]);
  });

  it("jumlah alokasi selalu persis sama dengan diskon", () => {
    const alokasi = alokasiDiskonFaktur([100, 100, 100], 100);
    const total = alokasi.reduce((a, b) => a + b, 0);
    expect(Math.round(total * 100) / 100).toBe(100);
  });

  it("sisa pembulatan jatuh ke baris terbesar", () => {
    // 10 / 3 = 3,33 per baris; sisa 0,01 ke baris ketiga yang terbesar.
    const alokasi = alokasiDiskonFaktur([100, 100, 101], 10);
    expect(alokasi[2]).toBeGreaterThan(alokasi[0]);
    expect(alokasi.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 10);
  });

  it("diskon sama dengan total: harga bersih jadi nol", () => {
    expect(alokasiDiskonFaktur([60, 40], 100)).toEqual([60, 40]);
  });

  it("angka rupiah nyata tidak kehilangan sen", () => {
    // Meniru faktur nyata: tiga baris timpang, diskon Rp 7.077.860.
    const baris = [12_500_000, 3_333_333.33, 987_654.32];
    const alokasi = alokasiDiskonFaktur(baris, 7_077_860);
    const total = alokasi.reduce((a, b) => a + b, 0);
    expect(Math.round(total * 100) / 100).toBe(7_077_860);
    // Proporsional: baris terbesar menanggung bagian terbesar.
    expect(alokasi[0]).toBeGreaterThan(alokasi[1]);
    expect(alokasi[1]).toBeGreaterThan(alokasi[2]);
  });
});
