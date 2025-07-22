import { PrismaClient } from "@prisma/client";
import { IStockCard, StockCardModel } from "../model/stock-card.model";

export class StockCardRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  create(data: IStockCard) {
    this.prisma.stock_card.create({
      data: {
        date: data.date,
        product_id: data.product_id,
        product_unit_id: data.product_unit_id,
        display_quantity: data.display_quantity,
        quantity: data.quantity,
        document_name: data.document_name,
        supplier_id: data.supplier_id,
        customer_id: data.customer_id,
        sales_invoice_id: data.sales_invoice_id,
        sales_invoice_code_id: data.sales_invoice_code_id,
        adjustment_case_id: data.adjustment_case_id,
        adjustment_case_code_id: data.adjustment_case_code_id,
        good_receipt_id: data.good_receipt_id,
        good_receipt_code_id: data.good_receipt_code_id,
        sales_return_id: data.sales_return_id,
        sales_return_code_id: data.sales_return_code_id,
        stock: null,
      },
    });
  }

  createMany(data: IStockCard[]) {
    return this.prisma.$transaction(
      data.map((x) => {
        return this.prisma.stock_card.create({
          data: {
            date: x.date,
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            display_quantity: x.display_quantity,
            quantity: x.quantity,
            document_name: x.document_name,
            supplier_id: x.supplier_id,
            customer_id: x.customer_id,
            sales_invoice_id: x.sales_invoice_id,
            sales_invoice_code_id: x.sales_invoice_code_id,
            adjustment_case_id: x.adjustment_case_id,
            adjustment_case_code_id: x.adjustment_case_code_id,
            good_receipt_id: x.good_receipt_id,
            good_receipt_code_id: x.good_receipt_code_id,
            sales_return_id: x.sales_return_id,
            sales_return_code_id: x.sales_return_code_id,
            stock: null,
          },
        });
      })
    );
  }

  async fetchByID(id: number) {
    const result = await this.prisma.stock_card.findUnique({
      where: {
        id: id,
      },
    });

    if (!result) {
      return null;
    }

    return StockCardModel.fromMap(result);
  }

  async fetchPrevious(data: { product_id: number; date: Date; id: number }) {
    const result = await this.prisma.stock_card.findFirst({
      where: {
        product_id: data.product_id,
        stock: { not: null },
        OR: [
          { date: { lt: data.date } },
          { AND: [{ date: data.date }, { id: { lt: data.id } }] },
        ],
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });

    return result == null ? null : StockCardModel.fromMap(result);
  }

  async fetch(data: {
    sales_invoice_id: number | null;
    sales_invoice_code_id: number | null;
    good_receipt_id: number | null;
    good_receipt_code_id: number | null;
    adjustment_case_id: number | null;
    adjustment_case_code_id: number | null;
    sales_return_id: number | null;
    sales_return_code_id: number | null;
  }) {
    const entry = await this.prisma.stock_card.findFirst({
      where: {
        sales_invoice_id: data.sales_invoice_id,
        sales_invoice_code_id: data.sales_invoice_code_id,
        adjustment_case_id: data.adjustment_case_id,
        adjustment_case_code_id: data.adjustment_case_code_id,
        good_receipt_id: data.good_receipt_id,
        good_receipt_code_id: data.good_receipt_code_id,
        sales_return_id: data.sales_return_id,
        sales_return_code_id: data.sales_return_code_id,
      },
    });

    if (!entry) {
      return null;
    }

    return StockCardModel.fromMap(entry);
  }

  async reorderSince(data: {
    product_id: number;
    id: number;
    date: Date;
    initial_stock: number;
  }) {
    const unupdatedStockCards = await this.prisma.stock_card.findMany({
      where: {
        product_id: data.product_id,
        OR: [
          { date: { gt: data.date } },
          { AND: [{ date: data.date }, { id: { gte: data.id } }] },
        ],
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    let initial_stock = data.initial_stock;
    for (let i = 0; i < unupdatedStockCards.length; i++) {
      const id = unupdatedStockCards[i].id;
      const quantity = Number(unupdatedStockCards[i].quantity);
      const final_quantity = initial_stock + quantity;
      const result = await this.prisma.stock_card.update({
        where: {
          id: id,
        },
        data: {
          stock: final_quantity,
        },
      });

      initial_stock += quantity;
    }
  }

  async delete(id: number) {
    try {
      const result = await this.prisma.stock_card.delete({
        where: {
          id: id,
        },
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  async deleteMany(
    data: {
      sales_invoice_id: number | null;
      sales_invoice_code_id: number | null;
      adjustment_case_id: number | null;
      adjustment_case_code_id: number | null;
      good_receipt_id: number | null;
      good_receipt_code_id: number | null;
      sales_return_id: number | null;
      sales_return_code_id: number | null;
    }[]
  ) {
    try {
      const deleteQuery = data.map((x) => {
        return this.prisma.stock_card.deleteMany({
          where: {
            sales_invoice_id: x.sales_invoice_id,
            sales_invoice_code_id: x.sales_invoice_code_id,
            adjustment_case_id: x.adjustment_case_id,
            adjustment_case_code_id: x.adjustment_case_code_id,
            good_receipt_id: x.good_receipt_id,
            good_receipt_code_id: x.good_receipt_code_id,
            sales_return_id: x.sales_return_id,
            sales_return_code_id: x.sales_return_code_id,
          },
        });
      });

      const result = await this.prisma.$transaction(deleteQuery);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
