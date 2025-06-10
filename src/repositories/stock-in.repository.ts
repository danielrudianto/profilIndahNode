import { PrismaClient } from "@prisma/client";
import { IStockIn } from "../model/stock-in.model";

export class StockInRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  create(data: IStockIn) {}

  createMany(data: IStockIn[]) {
    return this.prisma.stock_in.createMany({
      data: data.map((x) => {
        return {
          date: x.date,
          item_id: x.item_id,
          quantity: x.quantity,
          price: x.price,
          company_id: x.company_id,
          residue: x.quantity,
          adjustment_case_code_id: x.adjustment_case_code_id,
          adjustment_case_id: x.adjustment_case_id,
          good_receipt_code_id: x.good_receipt_code_id,
          good_receipt_id: x.good_receipt_id,
        };
      }),
    });
  }
}
