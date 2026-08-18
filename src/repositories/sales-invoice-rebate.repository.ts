import { PrismaClient, Prisma } from "@prisma/client";
import { ISalesInvoiceRebate } from "../interfaces/sales-invoice-rebate.interface";
import { SalesInvoiceRebateModel } from "../models/sales-invoice-rebate.model";

/**
 * Pengembalian diskon berupa uang kepada pelanggan.
 *
 * TIDAK PERNAH MENYENTUH TOTAL FAKTUR. Fakturnya tetap menunjukkan harga
 * penuh — itulah yang dilihat pemberi kerja si pembeli, dan justru itu sebabnya
 * potongannya diberikan sebagai uang, bukan sebagai potongan harga. Yang
 * dicatat di sini semata arus kas keluar yang terikat pada sebuah faktur.
 */
export class SalesInvoiceRebateRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * tx diisi ketika pemanggilnya sudah berada di dalam transaksi interaktif —
   * pembuatan faktur memanggilnya dari sana, dan pengembaliannya harus ikut
   * dibatalkan bila fakturnya gagal tersimpan.
   */
  async create(
    data: ISalesInvoiceRebate,
    tx?: Prisma.TransactionClient
  ): Promise<SalesInvoiceRebateModel> {
    const db = tx ?? this.prisma;

    const result = await db.sales_invoice_rebate.create({
      data: {
        sales_invoice_code_id: data.sales_invoice_code_id,
        value: data.value,
        payment_method_id: data.payment_method_id,
        date: data.date,
        receiver_name: data.receiver_name,
        bank_name: data.bank_name,
        account_number: data.account_number,
        created_by: data.created_by,
        created_at: data.created_at ?? new Date(),
      },
      include: {
        payment_method: true,
      },
    });

    return SalesInvoiceRebateModel.fromMap(result);
  }

  async fetchByInvoiceID(id: number): Promise<SalesInvoiceRebateModel[]> {
    const result = await this.prisma.sales_invoice_rebate.findMany({
      where: { sales_invoice_code_id: id },
      include: { payment_method: true },
    });

    return result.map((x) => SalesInvoiceRebateModel.fromMap(x));
  }

  /**
   * Jumlah uang yang dikembalikan pada satu tanggal, dipecah per metode.
   *
   * Inilah yang membuat rekonsiliasi sore hari cocok: kas dan bank berkurang
   * sebanyak ini tanpa ada satu pun faktur yang nilainya turun.
   */
  /*
    Pengembalian diskon per hari (uang keluar) — jalur grafik laporan
    uang masuk.
  */
  async sumHarian(
    mulai: Date,
    sebelum: Date
  ): Promise<{ date: Date; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
        SELECT date AS tanggal, SUM(value) AS nilai
        FROM sales_invoice_rebate
        WHERE date >= ${mulai} AND date < ${sebelum}
        GROUP BY date
      `;
    return result.map((x) => {
      return { date: x.tanggal, value: Number(x.nilai) };
    });
  }

  async sumByDate(
    date: Date
  ): Promise<{ payment_method_id: number | null; value: number }[]> {
    const result = await this.prisma.sales_invoice_rebate.groupBy({
      by: ["payment_method_id"],
      _sum: { value: true },
      where: { date: date },
    });

    return result.map((x) => ({
      payment_method_id: x.payment_method_id,
      value: Number(x._sum.value),
    }));
  }
}
