import { PrismaClient } from "@prisma/client";
import { SalesInvoicePaymentModel } from "../model/sales-invoice-payment.model";

export class SalesInvoicePaymentRepository {
  private prisma: PrismaClient;
  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async fetchPaymentsBySalesInvoiceCodeID(id: number) {
    try {
      const result = await this.prisma.sales_invoice_payment.findMany({
        where: {
          sales_invoice_code_id: id,
        },
        include: {
          payment_method: true,
        },
      });

      return result.map((x) => {
        return SalesInvoicePaymentModel.fromMap(x);
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchPaymentsByDate(
    date: Date
  ): Promise<{ payment_method_id: number | null; value: number }[]> {
    try {
      const result = await this.prisma.sales_invoice_payment.groupBy({
        by: ["payment_method_id"],
        _sum: {
          value: true,
        },
        where: {
          sales_invoice_code: {
            is_delete: false,
            date: date,
          },
        },
      });

      console.log(result);

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
