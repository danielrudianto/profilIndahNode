import { PrismaClient } from "@prisma/client";

export class SalesDepositPaymentRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /*
    Total pembayaran deposit per hari — pasangan sumHarian pembayaran
    faktur untuk grafik laporan uang masuk; DOR ikut terhitung.
  */
  async sumHarian(
    mulai: Date,
    sebelum: Date
  ): Promise<{ date: Date; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
        SELECT sales_deposit_payment.date AS tanggal, SUM(sales_deposit_payment.value) AS nilai
        FROM sales_deposit_payment
        JOIN sales_deposit_code ON sales_deposit_payment.sales_deposit_code_id = sales_deposit_code.id
        WHERE sales_deposit_payment.date >= ${mulai}
        AND sales_deposit_payment.date < ${sebelum}
        AND sales_deposit_code.is_delete = 0
        GROUP BY sales_deposit_payment.date
      `;

    return result.map((x) => {
      return { date: x.tanggal, value: Number(x.nilai) };
    });
  }

  async fetchPaymentsByDate(
    date: Date
  ): Promise<{ payment_method_id: number | null; value: number }[]> {
    const result = await this.prisma.sales_deposit_payment.groupBy({
      by: ["payment_method_id"],
      _sum: {
        value: true,
      },
      where: {
        date: date,
        sales_deposit_code: {
          is_delete: false,
        },
      },
    });

    return result.map((x) => {
      return {
        payment_method_id: x.payment_method_id,
        value: Number(x._sum.value),
      };
    });
  }

  async fetchDORPaymentsByDateRange(startDate: Date, endDate: Date) {
    const result = await this.prisma.sales_deposit_payment.findMany({
      where: {
        sales_deposit_code: {
          is_delete: false,
        },
        payment_method_id: 0,
        AND: [
          {
            date: {
              gte: startDate,
            },
          },
          {
            date: {
              lte: endDate,
            },
          },
        ],
      },
      select: {
        value: true,
        sales_deposit_code: {
          select: {
            sales: true,
          },
        },
      },
    });

    const salesNames = Array.from(
      new Set(result.map((x) => x.sales_deposit_code?.sales))
    );

    const salesSummary = salesNames
      .filter((x) => x != null)
      .map((salesName) => ({
        sales: salesName,
        value: result
          .filter((x) => x.sales_deposit_code?.sales === salesName)
          .reduce((sum, x) => sum + Number(x.value), 0),
      }));

    return salesSummary;
  }

  async fetchDORPaymentsByDate(date: Date) {
    const result = await this.prisma.sales_deposit_payment.findMany({
      where: {
        date: date,
        sales_deposit_code: {
          is_delete: false,
        },
        payment_method_id: 0,
      },
      select: {
        value: true,
        sales_deposit_code: {
          select: {
            sales: true,
          },
        },
      },
    });

    const salesNames = Array.from(
      new Set(result.map((x) => x.sales_deposit_code?.sales))
    );

    const salesSummary = salesNames
      .filter((x) => x != null)
      .map((salesName) => ({
        sales: salesName,
        value: result
          .filter((x) => x.sales_deposit_code?.sales === salesName)
          .reduce((sum, x) => sum + Number(x.value), 0),
      }));

    return salesSummary;
  }
}
