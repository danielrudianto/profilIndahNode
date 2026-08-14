import { PrismaClient } from "@prisma/client";
import { IProductUnit, ProductUnitModel } from "../models/product-unit.model";

export class ProductUnitRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IProductUnit[]) {
    const result = await this.prisma.product_unit.createMany({
      data: data.map((unit) => {
        return {
          product_id: unit.product_id,
          unit: unit.unit,
          conversion: unit.conversion,
          created_by: unit.created_by!,
          created_at: unit.created_at!,
          sales_price: unit.sales_price,
          sales_discount: unit.sales_discount,
          purchase_price: unit.purchase_price,
          purchase_discount: unit.purchase_discount,
        };
      }),
    });

    return result.count;
  }

  async fetchByItemID(productID: number) {
    const result = await this.prisma.product_unit.findMany({
      where: { product_id: productID },
    });

    return result.map((unit) => {
      return ProductUnitModel.fromMap(unit);
    });
  }
}
