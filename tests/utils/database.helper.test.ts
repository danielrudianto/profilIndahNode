import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/**
 * Penjaga singleton Prisma.
 *
 * PrismaClient membuka kumpulan koneksinya sendiri. Delapan berkas model dulu
 * memanggil `new PrismaClient()` masing-masing, sehingga satu proses membuka
 * sembilan kumpulan koneksi ke MySQL sekaligus — bentuk kebocoran yang tidak
 * memunculkan galat apa pun sampai basis datanya kehabisan koneksi saat ramai.
 *
 * Semuanya sudah diarahkan ke satu instance di src/utils/database.helper.ts.
 * Berkas ini menjaga agar tidak ada yang membuat instance baru lagi, dan agar
 * pola singleton-nya sendiri tetap utuh.
 */

const AKAR = join(__dirname, "..", "..", "src");
const BERKAS_SINGLETON = join(AKAR, "utils", "database.helper.ts");

function telusuri(dir: string, kumpulan: string[] = []): string[] {
  for (const nama of readdirSync(dir)) {
    const jalur = join(dir, nama);
    if (statSync(jalur).isDirectory()) telusuri(jalur, kumpulan);
    else if (nama.endsWith(".ts")) kumpulan.push(jalur);
  }
  return kumpulan;
}

describe("Hanya ada satu tempat yang membuat PrismaClient", () => {
  it("tidak ada berkas lain yang memanggil new PrismaClient()", () => {
    const pelanggar = telusuri(AKAR)
      .filter((f) => f !== BERKAS_SINGLETON)
      .filter((f) => {
        const isi = readFileSync(f, "utf8");
        // Baris yang seluruhnya komentar diabaikan: repo ini menyimpan banyak
        // kode lama sebagai komentar, dan menghitungnya membuat penjaga ini
        // menyala untuk kode yang tidak pernah dijalankan.
        const aktif = isi
          .split("\n")
          .filter((baris) => !/^\s*(\/\/|\*|\/\*)/.test(baris))
          .join("\n");
        return /new\s+PrismaClient\s*\(/.test(aktif);
      })
      .map((f) => f.replace(AKAR, "src"));

    expect(pelanggar).toEqual([]);
  });

  it("berkas singleton itu sendiri memang membuatnya", () => {
    const isi = readFileSync(BERKAS_SINGLETON, "utf8");
    expect(isi).toMatch(/new\s+PrismaClient\s*\(/);
  });
});

describe("Pola singleton", () => {
  it("impor berulang memberi instance yang sama", () => {
    const pertama = require("../../src/utils/database.helper").prisma;
    const kedua = require("../../src/utils/database.helper").prisma;
    expect(kedua).toBe(pertama);
  });

  /**
   * Instance disimpan di globalThis supaya bertahan melewati pemuatan ulang
   * modul saat pengembangan — nodemon me-restart berkas, dan tanpa ini setiap
   * restart menambah satu kumpulan koneksi lagi ke basis data yang sama.
   *
   * Penyimpanan itu SENGAJA dilewati pada production, di mana proses tidak
   * memuat ulang modul dan menyimpan instance di globalThis hanya menambah
   * rujukan yang tidak pernah dilepas.
   */
  it("menyimpan instance di globalThis di luar production", () => {
    const { prisma } = require("../../src/utils/database.helper");
    const global = globalThis as unknown as { prisma?: unknown };

    expect(process.env.NODE_ENV).not.toBe("production");
    expect(global.prisma).toBe(prisma);
  });

  it("instance yang diekspor punya bentuk klien Prisma", () => {
    const { prisma } = require("../../src/utils/database.helper");
    expect(typeof prisma.$transaction).toBe("function");
    expect(typeof prisma.$queryRaw).toBe("function");
    expect(typeof prisma.$disconnect).toBe("function");
  });
});
