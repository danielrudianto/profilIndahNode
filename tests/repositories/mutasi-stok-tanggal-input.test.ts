import { StockCardRepository } from "../../src/repositories/stock-card.repository";

/**
 * Stok awal laporan mutasi "menurut tanggal input" dihitung MUNDUR dari stok
 * kini, bukan dibaca dari kolom `stock` milik kartu stok.
 *
 * Kolom itu adalah saldo berjalan menurut TANGGAL DOKUMEN, sementara jendela
 * laporannya ditentukan TANGGAL INPUT. Dua urutan itu berbeda begitu ada
 * dokumen yang dimundurkan tanggalnya — dan pada saat itu laporannya menutup
 * di angka yang tidak pernah sama dengan stok barangnya.
 *
 * Skenario di bawah adalah kejadian nyatanya: faktur bertanggal 29 Agustus
 * diinput 3 September sebanyak −15. Di kartu ia duduk jauh di belakang, dan
 * baris terakhir yang diinput sebelum hari itu bersaldo 9 — sehingga versi
 * lama menutup di 9 − 15 = −6 padahal stok barangnya 8.
 */
describe("mutasi stok menurut tanggal input", () => {
  /** Prisma tiruan secukupnya: hanya yang disentuh cabang "created". */
  function prismaTiruan(opsi: {
    stokKini: number;
    diinputSesudahHariItu: number;
    barisHariItu: { quantity: number }[];
  }) {
    return {
      product_stock: {
        findUnique: jest.fn().mockResolvedValue({ stock: opsi.stokKini }),
      },
      stock_card: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { quantity: opsi.diinputSesudahHariItu },
        }),
        findMany: jest.fn().mockResolvedValue(
          opsi.barisHariItu.map((x, i) => ({
            id: i + 1,
            product_id: 7,
            quantity: x.quantity,
            display_quantity: x.quantity,
            date: new Date("2026-08-29"),
            created_at: new Date("2026-09-03T03:41:00Z"),
            stock: null,
            customer: null,
            supplier: null,
            product_unit: null,
          }))
        ),
      },
    } as any;
  }

  const jalankan = (prisma: any) =>
    new StockCardRepository(prisma).fetchMutation({
      productID: 7,
      date: new Date(2026, 8, 3),
      viewBy: "created",
    });

  it("menutup pada stok kini ketika tidak ada input sesudah hari itu", async () => {
    const hasil = await jalankan(
      prismaTiruan({
        stokKini: 8,
        diinputSesudahHariItu: 0,
        barisHariItu: [{ quantity: -15 }],
      })
    );

    // 8 − (−15) = 23, dan pemanggilnya menutup kembali di 23 + (−15) = 8.
    expect(hasil!.previous).toBe(23);
  });

  it("mengurangi mutasi yang diinput sesudah hari itu", async () => {
    const hasil = await jalankan(
      prismaTiruan({
        stokKini: 8,
        diinputSesudahHariItu: -4,
        barisHariItu: [{ quantity: -15 }],
      })
    );

    // Akhir hari itu 8 − (−4) = 12; awalnya 12 − (−15) = 27.
    expect(hasil!.previous).toBe(27);
  });

  /*
    Hari tanpa satu pun input tetap harus menyebut stok yang benar, bukan nol.
    Halaman ini kerap dibuka pada tanggal yang kebetulan sepi.
  */
  it("menyebut stok yang sama untuk hari tanpa mutasi", async () => {
    const hasil = await jalankan(
      prismaTiruan({
        stokKini: 8,
        diinputSesudahHariItu: 0,
        barisHariItu: [],
      })
    );

    expect(hasil!.previous).toBe(8);
  });
});
