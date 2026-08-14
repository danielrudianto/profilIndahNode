import { toPositiveInt } from "../src/utils/sql.helper";

/**
 * toPositiveInt menjaga nilai yang disisipkan ke klausa LIMIT/OFFSET.
 * Yang diuji di sini bukan "apakah fungsinya jalan", tapi apakah ia benar-benar
 * menolak nilai yang bisa dipakai menyuntik SQL.
 */
describe("toPositiveInt", () => {
  it("meneruskan bilangan bulat non-negatif apa adanya", () => {
    expect(toPositiveInt(0, 10)).toBe(0);
    expect(toPositiveInt(1, 10)).toBe(1);
    expect(toPositiveInt(250, 10)).toBe(250);
  });

  it("menerima angka dalam bentuk teks, karena body JSON sering mengirim begitu", () => {
    expect(toPositiveInt("25", 10)).toBe(25);
    expect(toPositiveInt("0", 10)).toBe(0);
  });

  it("memakai nilai cadangan untuk bilangan negatif", () => {
    expect(toPositiveInt(-1, 10)).toBe(10);
    expect(toPositiveInt("-50", 10)).toBe(10);
  });

  it("memakai nilai cadangan untuk nilai yang bukan angka", () => {
    expect(toPositiveInt(undefined, 10)).toBe(10);
    expect(toPositiveInt(null, 10)).toBe(10);
    expect(toPositiveInt("", 10)).toBe(10);
    expect(toPositiveInt("abc", 10)).toBe(10);
    expect(toPositiveInt(NaN, 10)).toBe(10);
    expect(toPositiveInt(Infinity, 10)).toBe(10);
    expect(toPositiveInt({}, 10)).toBe(10);
  });

  it("tidak pernah mengembalikan teks yang bisa menyuntik SQL", () => {
    // Inilah alasan fungsi ini ada. Sebelum ada pemeriksaan ini, nilai seperti
    // di bawah masuk apa adanya ke dalam teks query.
    const jahat = [
      "1; DROP TABLE user",
      "1 UNION SELECT password FROM user",
      "10 OR 1=1",
      "1--",
    ];
    for (const nilai of jahat) {
      const hasil = toPositiveInt(nilai, 10);
      expect(typeof hasil).toBe("number");
      expect(Number.isInteger(hasil)).toBe(true);
      expect(hasil).toBe(10);
    }
  });

  it("memotong pecahan, karena LIMIT 1.5 bukan SQL yang sah", () => {
    expect(toPositiveInt(10.9, 5)).toBe(10);
    expect(toPositiveInt("3.7", 5)).toBe(3);
  });
});
