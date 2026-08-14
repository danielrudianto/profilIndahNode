import { readFileSync } from "fs";
import { join } from "path";
import ErrorList from "../src/constants/error-list.constant";

/**
 * Penjaga paritas antara katalog key dan berkas terjemahan.
 *
 * Sejak nilai ErrorList berubah menjadi key i18n, backend tidak lagi mengirim
 * kalimat — ia mengirim key, dan frontend yang menerjemahkannya memakai
 * docs/i18n/id.json. Kalau key ditambahkan tanpa terjemahannya, tidak ada yang
 * gagal: build lolos, tes lolos, dan cacatnya baru muncul di layar pengguna
 * sebagai tulisan seperti "validation.package.nameTooLong".
 *
 * Berkas ini menutup celah itu dari kedua arah sekaligus.
 */

const terjemahan = JSON.parse(
  readFileSync(join(__dirname, "..", "docs", "i18n", "id.json"), "utf8")
);

/** Telusuri key bertitik pada objek bertingkat. */
function ambil(key: string): unknown {
  return key
    .split(".")
    .reduce<any>((simpul, bagian) => simpul?.[bagian], terjemahan);
}

/** Kumpulkan seluruh key daun dari berkas terjemahan. */
function daunTerjemahan(simpul: any, awalan = ""): string[] {
  return Object.entries(simpul).flatMap(([bagian, nilai]) => {
    const jalur = awalan ? `${awalan}.${bagian}` : bagian;
    return typeof nilai === "string" ? [jalur] : daunTerjemahan(nilai, jalur);
  });
}

const keyErrorList = [...new Set(Object.values(ErrorList) as string[])];
const keyTerjemahan = daunTerjemahan(terjemahan);

describe("Katalog galat dan berkas terjemahan harus sepadan", () => {
  it("setiap key ErrorList punya terjemahan", () => {
    const hilang = keyErrorList.filter((k) => typeof ambil(k) !== "string");
    expect(hilang).toEqual([]);
  });

  it("setiap terjemahan dipakai oleh ErrorList", () => {
    const yatim = keyTerjemahan.filter((k) => !keyErrorList.includes(k));
    expect(yatim).toEqual([]);
  });

  it("tidak ada terjemahan yang kosong", () => {
    const kosong = keyTerjemahan.filter(
      (k) => String(ambil(k)).trim().length === 0
    );
    expect(kosong).toEqual([]);
  });
});

describe("Bentuk key mengikuti kesepakatan", () => {
  it("seluruhnya bertitik dan tanpa spasi", () => {
    const salahBentuk = keyErrorList.filter(
      (k) => !/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/.test(k)
    );
    expect(salahBentuk).toEqual([]);
  });

  it("tidak ada nilai yang masih berupa kalimat Indonesia", () => {
    // Kalimat lama selalu mengandung spasi; key tidak pernah.
    const kalimat = keyErrorList.filter((k) => k.includes(" "));
    expect(kalimat).toEqual([]);
  });
});
