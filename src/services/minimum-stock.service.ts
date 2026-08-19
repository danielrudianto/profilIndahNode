import { PrismaClient } from "@prisma/client";

/*
  Rekomendasi stok minimum — rumus reorder point:

    minimum = (d̄ × L) + (z × σd × √L)

  d̄ dan σd dihitung dari penjualan harian JENDELA hari terakhir, dan hari
  tanpa penjualan dihitung nol — melewatkannya membuat rata-rata melambung.
  L (lead time hari) dan z (tingkat layanan) bisa ditimpa lewat env
  MIN_STOCK_LEAD_DAYS / MIN_STOCK_SERVICE_Z / MIN_STOCK_WINDOW_DAYS.

  Ditulis ke kolom minimum_stock_recommendation — TERPISAH dari
  minimum_stock manual, jadi angka yang pernah diset orang tidak tertimpa.
  Produk berdata tipis (kurang dari 3 hari penjualan di jendela) diberi
  NULL: lebih jujur tidak menghitung daripada sok yakin.

  Dipanggil dua pintu: CLI start:calculate-minimum-stock dan jadwal
  mingguan milik worker.
*/
export class MinimumStockService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async calculate(): Promise<void> {
    const prisma = this.prisma;

    const jendela = Number(process.env.MIN_STOCK_WINDOW_DAYS ?? 90);
    const leadTime = Number(process.env.MIN_STOCK_LEAD_DAYS ?? 7);
    const z = Number(process.env.MIN_STOCK_SERVICE_Z ?? 1.65);

    console.info(
      `[info]: Menghitung rekomendasi stok minimum — jendela ${jendela} hari, lead time ${leadTime} hari, z ${z}`
    );

    /* Agregat per produk atas jumlah penjualan PER HARI di jendela. */
    const agregat = await prisma.$queryRaw<any[]>`
      SELECT t.product_id,
        COUNT(*) AS hariJual,
        SUM(t.q) AS total,
        SUM(t.q * t.q) AS totalKuadrat
      FROM (
        SELECT si.product_id, sic.date AS hari, SUM(si.quantity) AS q
        FROM sales_invoice si
        JOIN sales_invoice_code sic ON sic.id = si.sales_invoice_code_id
        WHERE sic.is_delete = false
          AND sic.date >= DATE_SUB(CURDATE(), INTERVAL ${jendela} DAY)
        GROUP BY si.product_id, sic.date
      ) t
      GROUP BY t.product_id`;

    /* Mulai dari lembar bersih supaya rekomendasi basi tidak tertinggal. */
    await prisma.$executeRaw`UPDATE product SET minimum_stock_recommendation = NULL`;

    let terisi = 0;
    for (const baris of agregat) {
      const hariJual = Number(baris.hariJual);
      if (hariJual < 3) {
        continue;
      }

      const total = Number(baris.total);
      const totalKuadrat = Number(baris.totalKuadrat);
      /* Rata-rata dan deviasi POPULASI atas seluruh jendela, hari kosong = 0. */
      const rata = total / jendela;
      const ragam = Math.max(totalKuadrat / jendela - rata * rata, 0);
      const deviasi = Math.sqrt(ragam);

      const rekomendasi = Math.ceil(
        rata * leadTime + z * deviasi * Math.sqrt(leadTime)
      );
      if (rekomendasi <= 0) {
        continue;
      }

      await prisma.product.update({
        where: { id: Number(baris.product_id) },
        data: { minimum_stock_recommendation: rekomendasi },
      });
      terisi++;
      if (terisi % 500 === 0) {
        console.info(`[info]: ${terisi} produk terisi...`);
      }
    }

    console.info(
      `[info]: Selesai — ${terisi} produk diberi rekomendasi dari ${agregat.length} produk yang terjual di jendela.`
    );
  }
}
