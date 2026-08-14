import {
  mysql_real_escape_string,
  translateDate,
  translateFaktur,
  translateKeyword,
  translateNPWP,
  translatePage,
  translatePageSize,
  translateSalesName,
} from "../src/utils/escape.helper";

/**
 * Perilaku helper penerjemah masukan.
 *
 * Kedelapan fungsi di sini berdiri di perbatasan: nilainya datang langsung dari
 * req.query dan req.body, lalu diteruskan ke repository. Nilai apa pun yang
 * lolos dari sini akan sampai ke basis data.
 *
 * Berkas ini menuliskan perilaku yang BERLAKU SEKARANG, termasuk tiga cacat
 * yang ditemukan saat menulisnya. Cacatnya sengaja ikut dikunci — bukan karena
 * benar, melainkan supaya perbaikannya menjadi keputusan sadar yang membuat tes
 * ini gagal, bukan perubahan diam-diam. Setiap kasus semacam itu diberi tanda
 * CACAT beserta akibatnya.
 */

describe("mysql_real_escape_string", () => {
  it("membiarkan teks biasa apa adanya", () => {
    expect(mysql_real_escape_string("Baja Ringan 2mm")).toBe("Baja Ringan 2mm");
  });

  it("melarikan kutip tunggal dan ganda", () => {
    expect(mysql_real_escape_string(`O'Brien`)).toBe(`O\\'Brien`);
    expect(mysql_real_escape_string(`dia "bilang"`)).toBe(`dia \\"bilang\\"`);
  });

  it("melarikan garis miring terbalik", () => {
    expect(mysql_real_escape_string("a\\b")).toBe("a\\\\b");
  });

  it("melarikan persen, jokernya LIKE", () => {
    expect(mysql_real_escape_string("50%")).toBe("50\\%");
  });

  it("melarikan aksara kendali", () => {
    expect(mysql_real_escape_string("a\nb")).toBe("a\\nb");
    expect(mysql_real_escape_string("a\rb")).toBe("a\\rb");
    expect(mysql_real_escape_string("a\tb")).toBe("a\\tb");
    expect(mysql_real_escape_string("a\0b")).toBe("a\\0b");
  });

  it("menangani teks kosong", () => {
    expect(mysql_real_escape_string("")).toBe("");
  });

  /**
   * CACAT: garis bawah tidak dilarikan.
   *
   * Pada klausa LIKE, `_` adalah joker satu aksara sama seperti `%`. Fungsi ini
   * melarikan `%` tetapi melewatkan `_`, sehingga pencarian "BJ_100" ikut
   * mencocokkan "BJ1100" dan "BJA100". Akibatnya pencarian, bukan keamanan —
   * nilainya tetap tidak bisa keluar dari kutip.
   */
  it("CACAT: garis bawah tidak dilarikan walau ia joker LIKE", () => {
    expect(mysql_real_escape_string("BJ_100")).toBe("BJ_100");
  });
});

describe("translateKeyword", () => {
  it("mengembalikan teks kosong untuk nilai yang tidak dikirim", () => {
    expect(translateKeyword(undefined)).toBe("");
    expect(translateKeyword(null)).toBe("");
    expect(translateKeyword("")).toBe("");
  });

  it("membiarkan teks biasa apa adanya", () => {
    expect(translateKeyword("baja")).toBe("baja");
  });

  it("membuka penyandian persen", () => {
    expect(translateKeyword("baja%20ringan")).toBe("baja ringan");
    expect(translateKeyword("%C3%A9")).toBe("é");
  });

  /**
   * CACAT: melempar URIError pada penyandian persen yang tidak lengkap.
   *
   * decodeURIComponent melempar bila `%` tidak diikuti dua digit heksadesimal.
   * Nilai ini datang langsung dari req.query pada 32 pemanggilan, jadi
   * permintaan sesederhana `GET /product?keyword=%` menghasilkan 500 — bukan
   * hasil pencarian kosong. Pengguna yang mencari tanda persen, atau menempel
   * teks yang mengandungnya, mematahkan halaman.
   *
   * Perbaikannya kecil (bungkus dengan try/catch dan kembalikan teks aslinya),
   * tetapi mengubah status yang diterima pemanggil, jadi perlu diputuskan
   * terpisah.
   */
  it("CACAT: melempar untuk penyandian persen yang cacat", () => {
    expect(() => translateKeyword("%")).toThrow(URIError);
    expect(() => translateKeyword("%zz")).toThrow(URIError);
    expect(() => translateKeyword("diskon 50%")).toThrow(URIError);
  });
});

describe("translatePage", () => {
  it("memakai halaman 1 sebagai bawaan", () => {
    expect(translatePage(undefined)).toBe(1);
    expect(translatePage(null)).toBe(1);
    expect(translatePage("")).toBe(1);
    expect(translatePage(0)).toBe(1);
  });

  it("menerima angka maupun teks angka", () => {
    expect(translatePage(5)).toBe(5);
    expect(translatePage("5")).toBe(5);
  });

  it("mengembalikan 1 untuk nilai bukan angka", () => {
    expect(translatePage("abc")).toBe(1);
    expect(translatePage({})).toBe(1);
  });

  it("menaikkan nilai di bawah 1 menjadi 1", () => {
    expect(translatePage(-5)).toBe(1);
    expect(translatePage(0.4)).toBe(1);
  });

  it("membulatkan pecahan ke bawah", () => {
    expect(translatePage(3.9)).toBe(3);
  });
});

describe("translatePageSize", () => {
  it("memakai 10 sebagai bawaan", () => {
    expect(translatePageSize(undefined)).toBe(10);
    expect(translatePageSize(null)).toBe(10);
    expect(translatePageSize(0)).toBe(10);
  });

  it("menerima nilai dalam rentang 1-100", () => {
    expect(translatePageSize(25)).toBe(25);
    expect(translatePageSize("25")).toBe(25);
    expect(translatePageSize(1)).toBe(1);
    expect(translatePageSize(100)).toBe(100);
  });

  it("jatuh ke bawaan untuk nilai di luar rentang", () => {
    expect(translatePageSize(101)).toBe(10);
    expect(translatePageSize(-1)).toBe(10);
    expect(translatePageSize("abc")).toBe(10);
  });

  it("membulatkan pecahan ke bawah", () => {
    expect(translatePageSize(25.9)).toBe(25);
  });
});

describe("translateNPWP", () => {
  it("mengembalikan null untuk nilai yang tidak dikirim", () => {
    expect(translateNPWP(undefined)).toBeNull();
    expect(translateNPWP(null)).toBeNull();
    expect(translateNPWP("")).toBeNull();
  });

  it("menerima panjang 15 dan 16", () => {
    expect(translateNPWP("123456789012345")).toBe("123456789012345");
    expect(translateNPWP("1234567890123456")).toBe("1234567890123456");
  });

  it("menolak panjang lain", () => {
    expect(translateNPWP("12345")).toBeNull();
    expect(translateNPWP("12345678901234567")).toBeNull();
  });

  it("mengubah angka menjadi teks", () => {
    expect(translateNPWP(123456789012345)).toBe("123456789012345");
  });

  /**
   * CACAT: objek kosong lolos sebagai NPWP.
   *
   * Pemeriksaannya memakai `npwp.toString()`, dan String({}) menghasilkan
   * "[object Object]" yang panjangnya PERSIS 15 aksara — sama dengan panjang
   * NPWP yang sah. Akibatnya `{ npwp: {} }` pada POST /customer maupun
   * /supplier tersimpan sebagai NPWP bertuliskan "[object Object]".
   *
   * Skema Zod domain itu tidak menutupnya: npwp diperiksa dengan exists()
   * sehingga nilai apa pun lolos asalkan dikirim.
   */
  it("CACAT: objek kosong tersimpan sebagai '[object Object]'", () => {
    expect(translateNPWP({})).toBe("[object Object]");
  });

  it("larik tidak ikut lolos karena panjang teksnya berbeda", () => {
    expect(translateNPWP([1, 2])).toBeNull();
  });
});

describe("translateFaktur", () => {
  it("mengembalikan null untuk nilai yang tidak dikirim", () => {
    expect(translateFaktur(undefined)).toBeNull();
    expect(translateFaktur(null)).toBeNull();
    expect(translateFaktur("")).toBeNull();
  });

  it("hanya menerima panjang 16", () => {
    expect(translateFaktur("1234567890123456")).toBe("1234567890123456");
    expect(translateFaktur("123456789012345")).toBeNull();
    expect(translateFaktur("12345678901234567")).toBeNull();
  });

  it("objek kosong TIDAK lolos di sini karena panjangnya 15", () => {
    expect(translateFaktur({})).toBeNull();
  });
});

describe("translateSalesName", () => {
  it("mengembalikan null untuk nilai kosong", () => {
    expect(translateSalesName(null)).toBeNull();
    expect(translateSalesName("")).toBeNull();
  });

  it("mengubah nama menjadi huruf besar", () => {
    expect(translateSalesName("budi")).toBe("BUDI");
    expect(translateSalesName("Budi Santoso")).toBe("BUDI SANTOSO");
  });

  it("tidak memangkas spasi", () => {
    expect(translateSalesName("  budi  ")).toBe("  BUDI  ");
  });
});

describe("translateDate", () => {
  it("memakai waktu sekarang untuk nilai yang tidak dikirim", () => {
    const sebelum = Date.now();
    const hasil = translateDate(undefined);
    expect(hasil).toBeInstanceOf(Date);
    expect(hasil.getTime()).toBeGreaterThanOrEqual(sebelum);
  });

  it("mengurai teks tanggal yang sah", () => {
    expect(translateDate("2026-05-01").toISOString()).toBe(
      new Date("2026-05-01").toISOString()
    );
  });

  it("jatuh ke waktu sekarang untuk teks tanggal yang tidak sah", () => {
    const hasil = translateDate("bukan tanggal");
    expect(hasil).toBeInstanceOf(Date);
    expect(isNaN(hasil.getTime())).toBe(false);
  });

  it("meneruskan objek Date apa adanya", () => {
    const tanggal = new Date("2026-05-01");
    expect(translateDate(tanggal)).toBe(tanggal);
  });

  /**
   * CACAT: nilai bukan teks diteruskan tanpa diubah, meski tipe baliknya Date.
   *
   * Tanda tangannya menjanjikan Date, tetapi cabang terakhir mengembalikan
   * masukannya apa adanya. Angka epoch — bentuk yang wajar dikirim klien —
   * keluar sebagai number, bukan Date. TypeScript tidak menangkapnya karena
   * parameternya bertipe `any`.
   *
   * Akibatnya bergantung pemanggil: Prisma menolak number pada kolom DateTime,
   * sehingga hasilnya 500 dari lapisan basis data, bukan 400 dari validasi.
   */
  it("CACAT: angka epoch keluar sebagai number, bukan Date", () => {
    const hasil = translateDate(1700000000000) as unknown;
    expect(hasil).toBe(1700000000000);
    expect(hasil).not.toBeInstanceOf(Date);
  });
});
