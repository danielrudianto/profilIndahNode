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
          sales_deposit_code: {
            is_delete: false,
            date: new Date(date),
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
}
