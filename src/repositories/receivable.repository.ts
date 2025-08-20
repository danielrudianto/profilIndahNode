import { Prisma, PrismaClient } from "@prisma/client";
import { SalesInvoiceModel } from "../model/sales-invoice.model";
import { SalesInvoicePaymentModel } from "../model/sales-invoice-payment.model";

export class ReceivableRepository {
  redisClient: any;
  prisma: PrismaClient;
  constructor(redisClient: any, prisma: any) {
    this.redisClient = redisClient;
    this.prisma = prisma;
  }
  async addReceivableValue(value: number): Promise<void> {
    // add to redisClient
    try {
      await this.redisClient.incrByFloat("receivable_value", value);
    } catch (error) {
      console.error(`[error]: Error on adding receivable value ${error}`);
      throw error;
    }
  }

  async getReceivableValue(): Promise<number> {
    const value = await this.redisClient.get("receivable_value");
    if (value === null) {
      return 0; // Return 0 if no value is set
    } else {
      return Number(value);
    }
  }

  async create(data: {
    sales_invoice_code_id: number;
    date: Date;
    amount: number;
    payment_method_id: number | null;
    is_paid: boolean;
  }) {
    try {
      const [result, _] = await this.prisma.$transaction([
        this.prisma.sales_invoice_payment.create({
          data: {
            date: data.date,
            payment_method_id: data.payment_method_id,
            value: data.amount,
            sales_invoice_code_id: data.sales_invoice_code_id,
          },
          include: {
            payment_method: true,
          },
        }),
        this.prisma.sales_invoice_code.update({
          where: {
            id: data.sales_invoice_code_id,
          },
          data: {
            is_paid: data.is_paid,
          },
        }),
      ]);

      return SalesInvoicePaymentModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  async fetch() {
    try {
      const invoiceCodeIds = await this.prisma.sales_invoice_code.findMany({
        where: {
          is_delete: false,
          is_paid: false,
        },
        select: {
          id: true,
        },
      });

      const result = await this.prisma.$queryRaw<any[]>`
      SELECT (si.value + sales_invoice_code.delivery + sales_invoice_code.service - sales_invoice_code.discount) AS value, COALESCE(sip.value, 0) AS payment, customer.id, customer.name
      FROM sales_invoice_code
      JOIN (
        SELECT SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value, 
              sales_invoice.sales_invoice_code_id
        FROM sales_invoice
        WHERE sales_invoice.sales_invoice_code_id IN (${Prisma.join(
          invoiceCodeIds.map((x) => {
            return x.id;
          })
        )})
        GROUP BY sales_invoice.sales_invoice_code_id
      ) si
      ON sales_invoice_code.id = si.sales_invoice_code_id
      LEFT JOIN (
        SELECT SUM(sales_invoice_payment.value) AS value, 
              sales_invoice_payment.sales_invoice_code_id
        FROM sales_invoice_payment
        WHERE sales_invoice_payment.sales_invoice_code_id IN (${Prisma.join(
          invoiceCodeIds.map((x) => {
            return x.id;
          })
        )})
        GROUP BY sales_invoice_payment.sales_invoice_code_id
      ) sip
      ON sales_invoice_code.id = sip.sales_invoice_code_id
      LEFT JOIN customer ON sales_invoice_code.customer_id = customer.id
      WHERE sales_invoice_code.id IN (${Prisma.join(
        invoiceCodeIds.map((x) => {
          return x.id;
        })
      )})
      GROUP BY sales_invoice_code.customer_id 
    `;

      return result
        .map((x) => {
          return {
            id: x.id == null ? null : Number(x.id),
            name: x.id == null ? "Retail" : x.name,
            value: Number(x.value) - Number(x.payment),
          };
        })
        .sort((a, b) => {
          return a.value - b.value;
        });
    } catch (error) {
      throw error;
    }
  }

  async fetchByCustomerID(data: {
    customerID: number | null;
    page: number;
    pageSize: number;
  }) {
    const [result, count] = await this.prisma.$transaction([
      this.prisma.sales_invoice_code.findMany({
        where: {
          is_paid: false,
          is_delete: false,
          customer_id: data.customerID,
        },
        include: {
          sales_invoice: {
            include: {
              product: true,
              product_unit: true,
            },
          },
          sales_invoice_payment: {
            include: {
              payment_method: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
        skip: (data.page - 1) * data.pageSize,
        take: data.pageSize,
      }),
      this.prisma.sales_invoice_code.count({
        where: {
          is_paid: false,
          is_delete: false,
          customer_id: data.customerID,
        },
      }),
    ]);

    return {
      data: result.map((x) => {
        return SalesInvoiceModel.fromMap(x);
      }),
      count: count,
    };
  }
}
