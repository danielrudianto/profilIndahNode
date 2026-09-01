/**
 * Daftar asal CORS dipisah menurut lingkungan.
 *
 * Dua alamat localhost dulu ikut terdaftar di produksi, sehingga halaman yang
 * berjalan di laptop siapa pun boleh memanggil API produksi. Token yang sah
 * tetap dituntut, jadi bukan pintu yang menganga — tetapi juga tidak ada
 * gunanya di sana.
 *
 * Modulnya membaca NODE_ENV pada saat DIMUAT, bukan pada tiap pemanggilan.
 * Karena itu setiap kasus memuat ulang modulnya lewat jest.isolateModules
 * setelah menyetel NODE_ENV; mengubah variabelnya saja tidak berpengaruh
 * apa-apa pada modul yang sudah terlanjur dimuat, dan tes yang menyangka
 * sebaliknya akan lolos tanpa menguji apa pun.
 */
describe("daftar asal CORS", () => {
  const asliNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = asliNodeEnv;
  });

  const muat = (nodeEnv: string): string[] => {
    process.env.NODE_ENV = nodeEnv;
    let daftar: string[] = [];
    jest.isolateModules(() => {
      daftar =
        require("../../src/constants/allowed-origin.constant").allowedOrigins;
    });
    return daftar;
  };

  it("tidak memuat localhost di produksi", () => {
    const daftar = muat("production");

    expect(daftar.some((a) => a.includes("localhost"))).toBe(false);
  });

  it("memuat localhost di luar produksi", () => {
    const daftar = muat("development");

    expect(daftar).toContain("http://localhost:2100");
    expect(daftar).toContain("http://localhost:5173");
  });

  it("memuat seluruh asal produksi di kedua lingkungan", () => {
    const produksi = muat("production");
    const pengembangan = muat("development");

    for (const asal of produksi) {
      expect(pengembangan).toContain(asal);
    }
    expect(produksi).toContain("https://v20.profilindah.id");
    expect(produksi).toContain("https://warehouse.profilindah.id");
  });

  /*
    Seluruh asal produksi HARUS https. Satu saja yang http membuat token yang
    dikirim balasannya bisa dibaca di jaringan bersama — dan kesalahan seperti
    itu tidak menimbulkan galat apa pun, hanya bekerja diam-diam.
  */
  it("hanya mengizinkan https di produksi", () => {
    const daftar = muat("production");

    for (const asal of daftar) {
      expect(asal.startsWith("https://")).toBe(true);
    }
  });

  it("tidak memuat wildcard", () => {
    const daftar = muat("production");

    expect(daftar).not.toContain("*");
    expect(daftar.some((a) => a.includes("*"))).toBe(false);
  });
});
