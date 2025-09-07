import { PrismaClient } from "@prisma/client";

export class SalesDepositPaymentRepository {
  private prisma: PrismaClient;
  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async fetchPaymentsByDate(
    date: Date
  ): Promise<{ payment_method_id: number | null; value: number }[]> {
    try {
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
    } catch (error) {
      throw error;
    }
  }

  async fetchDORPaymentsByDate(date: Date) {
    try {
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
    } catch (error) {
      throw error;
    }
  }
}
