import { rentangBulanUTC } from "../../src/utils/date.helper";

/**
 * Arsip faktur penjualan dan penerimaan barang pernah kehilangan dokumen hari
 * terakhir setiap bulan. Penyebabnya batas bulan dibangun dengan konstruktor
 * waktu lokal, sedangkan kolom `date` bertipe @db.Date dan Prisma membacanya
 * sebagai tengah malam UTC. Pada mesin UTC+8 batas atasnya mundur ke tanggal
 * sebelumnya, dan batas bawahnya ikut mundur sehingga hari terakhir bulan
 * sebelumnya justru ikut terjaring.
 *
 * Tes ini menahan kedua tepi itu. Ia sengaja dijalankan pada zona waktu
 * server yang sebenarnya (Asia/Makassar, UTC+8) supaya kegagalannya muncul
 * di sini, bukan di layar kasir.
 */
describe("rentangBulanUTC", () => {
  const zonaAsli = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "Asia/Makassar";
  });

  afterAll(() => {
    process.env.TZ = zonaAsli;
  });

  /** Nilai yang dikembalikan Prisma untuk kolom @db.Date. */
  const baris = (iso: string) => new Date(`${iso}T00:00:00Z`);

  it("berlabuh pada tengah malam UTC, bukan tengah malam lokal", () => {
    const { mulai, sebelum } = rentangBulanUTC(2026, 8);

    expect(mulai.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(sebelum.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("memuat hari terakhir bulan — kasus yang dulu hilang", () => {
    const { mulai, sebelum } = rentangBulanUTC(2026, 8);
    const tigaPuluhSatu = baris("2026-08-31");

    expect(tigaPuluhSatu >= mulai).toBe(true);
    expect(tigaPuluhSatu < sebelum).toBe(true);
  });

  it("memuat hari pertama bulan", () => {
    const { mulai, sebelum } = rentangBulanUTC(2026, 8);
    const satu = baris("2026-08-01");

    expect(satu >= mulai).toBe(true);
    expect(satu < sebelum).toBe(true);
  });

  it("menolak hari terakhir bulan sebelumnya — kebocoran tepi bawah", () => {
    const { mulai } = rentangBulanUTC(2026, 8);

    expect(baris("2026-07-31") >= mulai).toBe(false);
  });

  it("menolak hari pertama bulan berikutnya", () => {
    const { sebelum } = rentangBulanUTC(2026, 8);

    expect(baris("2026-09-01") < sebelum).toBe(false);
  });

  it("menyeberangi pergantian tahun", () => {
    const { mulai, sebelum } = rentangBulanUTC(2026, 12);

    expect(mulai.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(sebelum.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(baris("2026-12-31") < sebelum).toBe(true);
  });

  it("mengurus Februari tahun kabisat", () => {
    const { sebelum } = rentangBulanUTC(2028, 2);

    expect(baris("2028-02-29") < sebelum).toBe(true);
    expect(baris("2028-03-01") < sebelum).toBe(false);
  });

  it("tetap benar pada setiap bulan sepanjang tahun", () => {
    const hariTerakhir = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    hariTerakhir.forEach((hari, i) => {
      const bulan = i + 1;
      const { mulai, sebelum } = rentangBulanUTC(2026, bulan);
      const akhir = baris(
        `2026-${bulan.toString().padStart(2, "0")}-${hari
          .toString()
          .padStart(2, "0")}`,
      );

      expect(akhir >= mulai).toBe(true);
      expect(akhir < sebelum).toBe(true);
    });
  });
});
