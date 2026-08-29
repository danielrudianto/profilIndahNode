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

  /**
   * Jumlah pekerjaan yang masih menunggu orang, untuk lencana di menu.
   *
   * Satu kueri berisi tiga subkueri hitung, bukan tiga perjalanan terpisah:
   * ini diminta berulang oleh setiap layar yang terbuka, dan tiga kali
   * bolak-balik untuk tiga angka kecil adalah pemborosan yang mengalikan
   * dirinya sendiri sepanjang hari.
   *
   * Yang dihitung SELALU keadaan sekarang, tidak pernah disimpan di cache.
   * Lencana yang basi lebih buruk daripada tidak ada lencana: ia memberi tahu
   * bahwa tidak ada yang menunggu, padahal ada.
   */
  async fetchBadgeCounts(): Promise<{
    overpayment: number;
    goodReceipt: number;
    adjustment: number;
    stock: number;
  }> {
    const hasil = await this.prisma.$queryRaw<any[]>`
      SELECT
        (SELECT COUNT(*) FROM overpayment WHERE is_resolved = 0) AS overpayment,
        (SELECT COUNT(*) FROM good_receipt_code
          WHERE is_confirm = 0 AND is_delete = 0) AS goodReceipt,
        (SELECT COUNT(*) FROM adjustment_case_code
          WHERE is_confirm = 0 AND is_delete = 0) AS adjustment,
        (
          -- Stok bermasalah: minus, ATAU di bawah ambangnya sendiri.
          --
          -- Satu angka, bukan dua. Lencana menjawab "ada yang perlu dilihat";
          -- pembagian menipis-versus-minus ada di halamannya, dan menaruhnya
          -- di menu berarti dua angka yang harus ditafsirkan sambil lewat.
          --
          -- Ini satu-satunya bagian yang memindai seluruh tabel barang:
          -- ambangnya membandingkan dua kolom pada tabel BERBEDA, dan
          -- perbandingan seperti itu tidak bisa dibantu indeks apa pun.
          -- Itulah alasan seluruh hasil ini disimpan sebentar di cache.
          SELECT COUNT(*)
          FROM product
          LEFT JOIN product_stock ON product_stock.id = product.id
          WHERE product.is_delete = 0
            AND (
              COALESCE(product_stock.stock, 0) < 0
              OR COALESCE(product_stock.stock, 0) < GREATEST(
                   product.minimum_stock,
                   COALESCE(product.minimum_stock_recommendation, 0)
                 )
            )
        ) AS stock`;

    const b = hasil[0] ?? {};
    return {
      overpayment: Number(b.overpayment ?? 0),
      goodReceipt: Number(b.goodReceipt ?? 0),
      adjustment: Number(b.adjustment ?? 0),
      stock: Number(b.stock ?? 0),
    };
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
          -- Biaya admin sengaja TIDAK ikut: ini angka omzet hari ini, dan
          -- biaya admin uang titipan untuk bank, bukan penghasilan toko.
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
            + c.delivery + c.service + c.admin_fee - c.discount AS total
        FROM (
          SELECT id, name, is_paid, date, customer_id,
            delivery, service, admin_fee, discount
          FROM sales_invoice_code
          WHERE is_delete = false
          ORDER BY date DESC, id DESC
          LIMIT 5
        ) AS c
        LEFT JOIN customer cust ON cust.id = c.customer_id
        LEFT JOIN sales_invoice si ON si.sales_invoice_code_id = c.id
        GROUP BY c.id, c.name, c.is_paid, c.date, cust.name,
          c.delivery, c.service, c.admin_fee, c.discount
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
