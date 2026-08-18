import { SalesInvoiceRepository } from "../../src/repositories/sales-invoice.repository";
import { SalesDepositRepository } from "../../src/repositories/sales-deposit.repository";

/**
 * Penomoran dokumen tahan tabrakan.
 *
 * Kolom name UNIQUE dan nomornya diundi dari ruang 10^8 per tahun — pada
 * volume ribuan dokumen setahun, mengundi nomor yang sudah terpakai bukan
 * kemungkinan teoretis melainkan kepastian sesekali (birthday problem).
 * generateAvailableName memeriksa undiannya ke basis data dan mengundi
 * ulang sampai dapat nomor kosong.
 */
describe("generateAvailableName — faktur penjualan", () => {
  function repoDengan(findUnique: jest.Mock) {
    return new SalesInvoiceRepository({
      sales_invoice_code: { findUnique },
    } as never);
  }

  it("mengembalikan undian pertama bila nomornya belum terpakai", async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const repo = repoDengan(findUnique);

    const nama = await repo.generateAvailableName(new Date("2026-08-18"));

    expect(nama).toMatch(/^INV-2026-\d{8}$/);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("mengundi ulang ketika nomornya sudah ada", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValue(null);
    const repo = repoDengan(findUnique);

    const nama = await repo.generateAvailableName(new Date("2026-08-18"));

    expect(nama).toMatch(/^INV-2026-\d{8}$/);
    expect(findUnique).toHaveBeenCalledTimes(3);
    /* Nomor yang dikembalikan adalah undian TERAKHIR, bukan yang bentrok. */
    expect(findUnique.mock.calls[2][0].where.name).toBe(nama);
  });

  it("menyerah setelah lima percobaan — constraint UNIQUE jaring terakhirnya", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 1 });
    const repo = repoDengan(findUnique);

    const nama = await repo.generateAvailableName(new Date("2026-08-18"));

    expect(nama).toMatch(/^INV-2026-\d{8}$/);
    expect(findUnique).toHaveBeenCalledTimes(5);
  });
});

describe("generateAvailableName — deposit", () => {
  it("berpola DPS dan mengundi ulang saat bentrok", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 9 })
      .mockResolvedValue(null);
    const repo = new SalesDepositRepository({
      sales_deposit_code: { findUnique },
    } as never);

    const nama = await repo.generateAvailableName(new Date("2026-08-18"));

    expect(nama).toMatch(/^DPS-2026-\d{8}$/);
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
