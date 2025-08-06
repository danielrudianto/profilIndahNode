import { PrismaClient } from "@prisma/client";
import {
  ISalesInvoicePayment,
  SalesInvoicePaymentModel,
} from "../model/sales-invoice-payment.model";

export class SalesInvoicePaymentRepository {
  private prisma: PrismaClient;
  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: ISalesInvoicePayment) {
    try {
      const result = await this.prisma.sales_invoice_payment.create({
        data: {
          value: data.value,
          payment_method_id: data.payment_method_id,
          date: data.date,
          sales_invoice_code_id: data.sales_invoice_code_id,
        },
      });

      return SalesInvoicePaymentModel.fromMap(result);
    } catch (error) {
      throw error;
    }
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
          date: date,
          sales_invoice_code: {
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
      const result = await this.prisma.sales_invoice_payment.findMany({
        where: {
          date: date,
          sales_invoice_code: {
            is_delete: false,
          },
          payment_method_id: 0,
        },
        select: {
          value: true,
          sales_invoice_code: {
            select: {
              sales: true,
            },
          },
        },
      });

      const salesNames = Array.from(
        new Set(result.map((x) => x.sales_invoice_code?.sales))
      );

      const salesSummary = salesNames.map((salesName) => ({
        sales: salesName,
        value: result
          .filter((x) => x.sales_invoice_code?.sales === salesName)
          .reduce((sum, x) => sum + Number(x.value), 0),
      }));

      return salesSummary;
    } catch (error) {
      throw error;
    }
  }
}
