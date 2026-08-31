import { PrismaClient } from "@prisma/client";
import { SalesInvoicePaymentModel } from "../models/sales-invoice-payment.model";
import { ISalesInvoicePayment } from "../interfaces/sales-invoice-payment.interface";

export class SalesInvoicePaymentRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: ISalesInvoicePayment) {
    const result = await this.prisma.sales_invoice_payment.create({
      data: {
        value: data.value,
        payment_method_id: data.payment_method_id,
        date: data.date,
        sales_invoice_code_id: data.sales_invoice_code_id,
      },
    });

    return SalesInvoicePaymentModel.fromMap(result);
  }

  async fetchByID(id: number) {
    const result = await this.prisma.sales_invoice_payment.findUnique({
      where: {
        id: id,
      },
      include: {
        payment_method: true,
      },
    });

    if (!result) {
      return null;
    }

    return SalesInvoicePaymentModel.fromMap(result);
  }

  async fetchPaymentsBySalesInvoiceCodeID(id: number) {
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
  }

  /*
    Total pembayaran faktur per hari pada satu jendela tanggal — jalur
    grafik laporan uang masuk. DOR (payment_method_id 0) ikut terhitung:
    uangnya memang diterima hari itu, hanya masih di tangan sales.
  */
  async sumHarian(
    mulai: Date,
    sebelum: Date
  ): Promise<{ date: Date; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
        SELECT sales_invoice_payment.date AS tanggal, SUM(sales_invoice_payment.value) AS nilai
        FROM sales_invoice_payment
        JOIN sales_invoice_code ON sales_invoice_payment.sales_invoice_code_id = sales_invoice_code.id
        WHERE sales_invoice_payment.date >= ${mulai}
        AND sales_invoice_payment.date < ${sebelum}
        AND sales_invoice_code.is_delete = 0
        GROUP BY sales_invoice_payment.date
      `;

    return result.map((x) => {
      return { date: x.tanggal, value: Number(x.nilai) };
    });
  }

  async fetchPaymentsByDate(
    date: Date
  ): Promise<{ payment_method_id: number | null; value: number }[]> {
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
  }

  async fetchDORPaymentsByDate(date: Date) {
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

    const salesSummary = salesNames
      .filter((x) => x != null)
      .map((salesName) => ({
        sales: salesName,
        value: result
          .filter((x) => x.sales_invoice_code?.sales === salesName)
          .reduce((sum, x) => sum + Number(x.value), 0),
      }));

    return salesSummary;
  }

  async fetchDORPaymentsByDateRange(startDate: Date, endDate: Date) {
    const result = await this.prisma.sales_invoice_payment.findMany({
      where: {
        sales_invoice_code: {
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

    const salesSummary = salesNames
      .filter((x) => x != null)
      .map((salesName) => ({
        sales: salesName,
        value: result
          .filter((x) => x.sales_invoice_code?.sales === salesName)
          .reduce((sum, x) => sum + Number(x.value), 0),
      }));

    return salesSummary;
  }

  async downloadReport(date: Date) {
    try {
      /*
        Tabel turunan nilai faktur ikut disaring ke tanggal yang sama —
        bentuk lamanya mengagregasi SELURUH sales_invoice (hampir sejuta
        baris) untuk laporan satu hari, dan tanggalnya diinterpolasi
        sebagai teks alih-alih placeholder.
      */
      const tanggal = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

      const result = await this.prisma.$queryRawUnsafe<any[]>(
        `
      SELECT sales_invoice_code.date AS date, sales_invoice_code.name AS invoiceName, COALESCE(customer.name, "Retail") AS customer, COALESCE(a.value, 0) AS value,
      SUM(sales_invoice_payment.value) AS payment, COALESCE(payment_method.name, "Cash") AS paymentMethod
      FROM sales_invoice_payment
      JOIN sales_invoice_code ON sales_invoice_payment.sales_invoice_code_id = sales_invoice_code.id
      -- LEFT: pembayaran atas faktur jasa murni tetap masuk laporan harian.
      LEFT JOIN (
        SELECT SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value, sales_invoice.sales_invoice_code_id
          FROM sales_invoice
          JOIN sales_invoice_code sic2 ON sic2.id = sales_invoice.sales_invoice_code_id
          WHERE sic2.date = ?
          AND sic2.is_delete = 0
          GROUP BY sales_invoice_code_id
      ) AS a
      ON sales_invoice_code.id = a.sales_invoice_code_id
      LEFT JOIN customer ON sales_invoice_code.customer_id = customer.id
      LEFT JOIN payment_method ON sales_invoice_payment.payment_method_id = payment_method.id
      WHERE sales_invoice_code.date = ?
      AND sales_invoice_code.is_delete = 0
      GROUP BY sales_invoice_payment.payment_method_id,
      sales_invoice_payment.sales_invoice_code_id
    `,
        tanggal,
        tanggal
      );

      return result.map((x) => {
        return {
          date: new Date(x.date),
          invoiceName: x.invoiceName,
          customer: x.customer,
          value: Number(x.value),
          payment: Number(x.payment),
          paymentMethod: x.paymentMethod,
        };
      });
    } catch (error) {
      console.error(
        `[error]: Error on fetching sales invoice payment ${error}`
      );
      throw error;
    }
  }

  async delete(id: number, salesInvoiceCodeID: number) {
    const [result, _] = await this.prisma.$transaction([
      this.prisma.sales_invoice_payment.delete({
        where: {
          id: id,
        },
      }),
      this.prisma.sales_invoice_code.update({
        where: {
          id: salesInvoiceCodeID,
        },
        data: {
          is_paid: false,
        },
      }),
    ]);

    return result;
  }
}
