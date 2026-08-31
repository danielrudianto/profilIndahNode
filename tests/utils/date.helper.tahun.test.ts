import { rentangTahunUTC } from "../../src/utils/date.helper";

/**
 * Laporan beban tahunan pernah kehilangan 31 Desember setiap tahun.
 *
 * Batas atasnya ditulis `new Date(year + 1, 0, 0)` — hari ke-0 Januari tahun
 * berikutnya, yang dalam JavaScript berarti 31 Desember tahun INI. Dipasangkan
 * dengan operator `lt`, hari itu terbuang. Geseran UTC+8 memundurkannya satu
 * hari lagi, sehingga 30 Desember ikut hilang.
 *
 * Seperti kembaran bulanannya, tes ini berjalan pada zona waktu server yang
 * sebenarnya supaya kegagalannya muncul di sini, bukan di laporan akhir tahun.
 */
describe("rentangTahunUTC", () => {
  const zonaAsli = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "Asia/Makassar";
  });

  afterAll(() => {
    process.env.TZ = zonaAsli;
  });

  /** Nilai yang dikembalikan Prisma untuk kolom @db.Date. */
  const baris = (iso: string) => new Date(`${iso}T00:00:00Z`);

  it("berlabuh pada tengah malam UTC", () => {
    const { mulai, sebelum } = rentangTahunUTC(2026);

    expect(mulai.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(sebelum.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("memuat 31 Desember — kasus yang dulu hilang", () => {
    const { mulai, sebelum } = rentangTahunUTC(2026);
    const akhirTahun = baris("2026-12-31");

    expect(akhirTahun >= mulai).toBe(true);
    expect(akhirTahun < sebelum).toBe(true);
  });

  it("memuat 30 Desember — hari kedua yang hilang karena geseran zona", () => {
    const { sebelum } = rentangTahunUTC(2026);

    expect(baris("2026-12-30") < sebelum).toBe(true);
  });

  it("memuat 1 Januari", () => {
    const { mulai, sebelum } = rentangTahunUTC(2026);
    const awalTahun = baris("2026-01-01");

    expect(awalTahun >= mulai).toBe(true);
    expect(awalTahun < sebelum).toBe(true);
  });

  it("menolak 31 Desember tahun sebelumnya", () => {
    const { mulai } = rentangTahunUTC(2026);

    expect(baris("2025-12-31") >= mulai).toBe(false);
  });

  it("menolak 1 Januari tahun berikutnya", () => {
    const { sebelum } = rentangTahunUTC(2026);

    expect(baris("2027-01-01") < sebelum).toBe(false);
  });

  it("mengurus tahun kabisat", () => {
    const { mulai, sebelum } = rentangTahunUTC(2028);
    const kabisat = baris("2028-02-29");

    expect(kabisat >= mulai).toBe(true);
    expect(kabisat < sebelum).toBe(true);
  });
});
