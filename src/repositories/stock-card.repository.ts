import { PrismaClient } from "@prisma/client";

export class StockCardRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  create(data: IStockCard) {
    this.prisma.stock_card.create({
      data: {
        date: data.date,
        item_id: data.item_id,
        display_quantity: data.display_quantity,
        quantity: data.quantity,
        unit: data.unit,
        document_name: data.name,
        supplier_id: data.supplier_id,
        customer_id: data.customer_id,
        bill_id: data.bill_id,
        bill_code_id: data.bill_code_id,
        adjustment_case_id: data.adjustment_case_id,
        adjustment_case_code_id: data.adjustment_case_code_id,
        good_receipt_id: data.good_receipt_id,
        good_receipt_code_id: data.good_receipt_code_id,
        sales_return_id: data.sales_return_id,
        sales_return_code_id: data.sales_return_code_id,
      },
    });
  }

  delete(data: {
    bill_id: number | null;
    bill_code_id: number | null;
    adjustment_case_id: number | null;
    adjustment_case_code_id: number | null;
    good_receipt_id: number | null;
    good_receipt_code_id: number | null;
    sales_return_id: number | null;
    sales_return_code_id: number | null;
  }) {
    this.prisma.stock_card.deleteMany({
      where: {
        AND: [
          { bill_id: data.bill_id },
          { bill_code_id: data.bill_code_id },
          { adjustment_case_id: data.adjustment_case_id },
          { adjustment_case_code_id: data.adjustment_case_code_id },
          { good_receipt_id: data.good_receipt_id },
          { good_receipt_code_id: data.good_receipt_code_id },
          { sales_return_id: data.sales_return_id },
          { sales_return_code_id: data.sales_return_code_id },
        ],
      },
    });
  }
}
