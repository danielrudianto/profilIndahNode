import { PrismaClient } from "@prisma/client";

/**
 * Angka-angka dashboard administrator (layar 9c) — SEKALI panggil.
 *
 * Semua query bertanggal menerima tanggalnya dari controller, bukan
 * memakai CURDATE(): server dan toko bisa berbeda zona waktu, dan
 * "hari ini" yang dimaksud adalah hari menurut penggunanya.
 */
export class DashboardRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async ringkasan(hariIni: Date, mingguLalu: Date) {
    const [
      fakturHariIni,
      barangHariIni,
      beliHariIni,
      depositHariIni,
      promosi,
      grafikMingguan,
      fakturTerakhir,
    ] = await this.prisma.$transaction([
      // Faktur penjualan hari ini: jumlah dokumen, yang belum lunas,
      // dan komponen dokumen (kirim + layanan - diskon dokumen).
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*) AS n,
          COALESCE(SUM(is_paid = 0), 0) AS belum_lunas,
          COALESCE(SUM(delivery + service - discount), 0) AS tambahan
        FROM sales_invoice_code
        WHERE date = ${hariIni} AND is_delete = false`,
      this.prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(si.quantity * (si.price - si.discount)), 0) AS nilai
        FROM sales_invoice si
        JOIN sales_invoice_code c ON c.id = si.sales_invoice_code_id
        WHERE c.date = ${hariIni} AND c.is_delete = false`,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(DISTINCT c.id) AS n,
          COALESCE(SUM(gr.quantity * (gr.price - gr.discount)), 0) AS nilai
        FROM good_receipt_code c
        LEFT JOIN good_receipt gr ON gr.good_receipt_code_id = c.id
        WHERE c.date = ${hariIni} AND c.is_delete = false`,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(DISTINCT c.id) AS n,
          COALESCE(SUM(sd.quantity * (sd.price - sd.discount)), 0) AS nilai
        FROM sales_deposit_code c
        LEFT JOIN sales_deposit sd ON sd.sales_deposit_code_id = c.id
        WHERE c.date = ${hariIni} AND c.is_delete = false`,
      // Promosi yang sedang berjalan; end NULL berarti kontinu.
      this.prisma.$queryRaw<any[]>`
        SELECT id, name, end AS berakhir
        FROM promotion_code
        WHERE is_delete = false
        AND start <= ${hariIni}
        AND (end IS NULL OR end >= ${hariIni})
        ORDER BY end IS NULL, end ASC
        LIMIT 4`,
      this.prisma.$queryRaw<any[]>`
        SELECT c.date AS tanggal,
          COALESCE(SUM(si.quantity * (si.price - si.discount)), 0) AS nilai
        FROM sales_invoice_code c
        JOIN sales_invoice si ON si.sales_invoice_code_id = c.id
        WHERE c.date >= ${mingguLalu} AND c.date <= ${hariIni}
        AND c.is_delete = false
        GROUP BY c.date
        ORDER BY c.date ASC`,
      // Lima faktur terakhir beserta totalnya. Lima kodenya dipilih
      // dulu di tabel dalam; menghitung total dari tabel baris untuk
      // SEMUA faktur hanya demi lima teratas memakan detik.
      this.prisma.$queryRaw<any[]>`
        SELECT c.id, c.name, c.is_paid, c.date, cust.name AS customer,
          COALESCE(SUM(si.quantity * (si.price - si.discount)), 0)
            + c.delivery + c.service - c.discount AS total
        FROM (
          SELECT id, name, is_paid, date, customer_id,
            delivery, service, discount
          FROM sales_invoice_code
          WHERE is_delete = false
          ORDER BY date DESC, id DESC
          LIMIT 5
        ) AS c
        LEFT JOIN customer cust ON cust.id = c.customer_id
        LEFT JOIN sales_invoice si ON si.sales_invoice_code_id = c.id
        GROUP BY c.id, c.name, c.is_paid, c.date, cust.name,
          c.delivery, c.service, c.discount
        ORDER BY c.date DESC, c.id DESC`,
    ]);

    // Jumlah seluruh promosi berjalan + yang berakhir dalam seminggu.
    const promosiRingkas = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS n,
        COALESCE(SUM(end IS NOT NULL AND end < DATE_ADD(${hariIni}, INTERVAL 7 DAY)), 0) AS berakhir_seminggu
      FROM promotion_code
      WHERE is_delete = false
      AND start <= ${hariIni}
      AND (end IS NULL OR end >= ${hariIni})`;

    return {
      sales: {
        value:
          Number(barangHariIni[0]?.nilai ?? 0) +
          Number(fakturHariIni[0]?.tambahan ?? 0),
        count: Number(fakturHariIni[0]?.n ?? 0),
        unpaid: Number(fakturHariIni[0]?.belum_lunas ?? 0),
      },
      purchase: {
        value: Number(beliHariIni[0]?.nilai ?? 0),
        count: Number(beliHariIni[0]?.n ?? 0),
      },
      deposit: {
        value: Number(depositHariIni[0]?.nilai ?? 0),
        count: Number(depositHariIni[0]?.n ?? 0),
      },
      promotion: {
        count: Number(promosiRingkas[0]?.n ?? 0),
        endingSoon: Number(promosiRingkas[0]?.berakhir_seminggu ?? 0),
        rows: promosi.map((p) => ({
          id: Number(p.id),
          name: p.name,
          end: p.berakhir,
        })),
      },
      week: grafikMingguan.map((g) => ({
        date: g.tanggal,
        value: Number(g.nilai),
      })),
      invoices: fakturTerakhir.map((f) => ({
        id: Number(f.id),
        name: f.name,
        customer: f.customer,
        isPaid: Boolean(f.is_paid),
        date: f.date,
        total: Number(f.total),
      })),
    };
  }
}

export default DashboardRepository;
