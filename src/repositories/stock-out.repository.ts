import { PrismaClient } from "@prisma/client";
import { IStockoutModel } from "../model/stock-out.model";

export class StockOutRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async fetchUnassigned() {
    return this.prisma.stock_out.findMany({
      where: {
        stock_in_id: null,
      },
    });
  }

  async delete() {
    return this.prisma.stock_out.deleteMany({});
  }

  async deleteMany(
    data: {
      sales_invoice_id: number | null;
      sales_invoice_code_id: number | null;
      adjustment_case_id: number | null;
      adjustment_case_code_id: number | null;
    }[]
  ) {
    try {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const stockOuts = await this.prisma.stock_out.findMany({
          where: {
            sales_invoice_id: item.sales_invoice_id,
            sales_invoice_code_id: item.sales_invoice_code_id,
            adjustment_case_id: item.adjustment_case_id,
            adjustment_case_code_id: item.adjustment_case_code_id,
          },
        });

        for (let j = 0; j < stockOuts.length; j++) {
          const stockOut = stockOuts[j];
          if (stockOut.stock_in_id != null) {
            await this.prisma.stock_in.update({
              where: {
                id: stockOut.stock_in_id,
              },
              data: {
                residue: {
                  increment: stockOut.quantity,
                },
              },
            });
          }

          await this.prisma.stock_out.delete({
            where: {
              id: stockOut.id,
            },
          });
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async create(data: IStockoutModel[]) {
    return this.prisma.stock_out.createMany({
      data: data.map((x) => {
        return {
          stock_in_id: null,
          date: x.date,
          product_id: x.product_id,
          quantity: x.quantity,
          sales_invoice_id: x.sales_invoice_id,
          sales_invoice_code_id: x.sales_invoice_code_id,
          adjustment_case_code_id: x.adjustment_case_code_id,
          adjustment_case_id: x.adjustment_case_id,
          price: x.price,
        };
      }),
    });
  }

  async insertFromSalesInvoices() {
    await this.prisma.$queryRawUnsafe(`
        INSERT INTO stock_out (product_id, quantity, date, stock_in_id, price, sales_invoice_id, sales_invoice_code_id, adjustment_case_id, adjustment_case_code_id)
        SELECT sales_invoice.product_id, (sales_invoice.quantity - COALESCE(sr.quantity))* IF(sales_invoice.product_unit_id IS NULL, 1, product_unit.conversion), sales_invoice_code.date,
        NULL, (sales_invoice.price - sales_invoice.discount) / IF(sales_invoice.product_unit_id IS NULL, 1, product_unit.conversion),
        sales_invoice.id, sales_invoice.sales_invoice_code_id, NULL, NULL
        FROM sales_invoice
        LEFT JOIN product_unit ON sales_invoice.product_unit_id = product_unit.id
        LEFT JOIN (
          SELECT SUM(sales_return.quantity) AS quantity, sales_return.sales_invoice_id
          FROM sales_return
          JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
          WHERE sales_return_code.is_confirm = 1
          AND sales_return_code.is_delete = 0
          GROUP BY sales_return.sales_invoice_id
        ) AS sr
        ON sales_invoice.id = sr.sales_invoice_id
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        WHERE sales_invoice_code.is_delete = 0
        ORDER BY sales_invoice_code.date ASC, sales_invoice.id ASC
      `);
  }

  async insertFromAdjustmentCases() {
    try {
      await this.prisma.$queryRawUnsafe(`
        INSERT INTO stock_out (product_id, quantity, date, stock_in_id, price, sales_invoice_id, sales_invoice_code_id, adjustment_case_id, adjustment_case_code_id)
        SELECT adjustment_case.product_id, -1 * adjustment_case.quantity * IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion), adjustment_case_code.date,
        NULL, 0, NULL, NULL, adjustment_case.id, adjustment_case.adjustment_case_code_id
        FROM adjustment_case
        LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
        WHERE adjustment_case_code.is_delete = 0
        AND adjustment_case.quantity < 0
        ORDER BY adjustment_case_code.date ASC, adjustment_case.id ASC
      `);
    } catch (error) {
      throw error;
    }
  }
}
