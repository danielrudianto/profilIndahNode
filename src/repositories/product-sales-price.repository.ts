import { PrismaClient } from "@prisma/client";
import {
  IProductSalesPrice,
  ProductSalesPriceModel,
} from "../model/product-sales-price.model";
import { IProductUnit } from "../model/product-unit.model";

export class ProductSalesPriceRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IProductSalesPrice) {
    try {
      const result = await this.prisma.item_price.create({
        data: {
          item_id: data.item_id,
          item_unit_id: data.item_unit_id,
          price: data.price,
          discount: data.discount,
          created_by: data.created_by!,
          created_at: data.created_at!,
          effective_date: data.effective_date!,
        },
      });

      return new ProductSalesPriceModel({
        id: result.id,
        price: Number(result.price),
        discount: Number(result.discount),
        item_id: result.item_id,
        item_unit_id: result.item_unit_id,
      });
    } catch (error) {
      console.error(`[error]: Error on creating product sales price ${error}`);
      throw error;
    }
  }

  async createMany(data: IProductUnit[]) {
    try {
      const result = await this.prisma.item_unit.createMany({
        data: data.map((unit) => {
          return {
            item_id: unit.item_id,
            unit: unit.unit,
            created_by: unit.created_by!,
            created_at: unit.created_at,
            conversion: unit.conversion,
          };
        }),
      });
    } catch (error) {
      console.error(`[error]: Error on creating product sales price ${error}`);
      throw error;
    }
  }

  async update(data: IProductSalesPrice) {
    try {
      const [result, _] = await this.prisma.$transaction([
        this.prisma.item_price.updateMany({
          where: { item_id: data.item_id, item_unit_id: data.item_unit_id },
          data: {
            price: data.price,
            discount: data.discount,
            created_by: data.created_by,
            created_at: data.created_at,
          },
        }),
        this.prisma.item_price.updateMany({
          where: { item_id: data.item_id, item_unit_id: data.item_unit_id },
          data: {
            is_delete: true,
            deleted_by: data.created_by,
            deleted_at: data.created_at,
          },
        }),
      ]);

      return result;
    } catch (error) {
      console.error(`[error]: Error on updating product sales price ${error}`);
      throw error;
    }
  }

  async fetchByItemID(itemID: number): Promise<ProductSalesPriceModel[]> {
    try {
      const result = await this.prisma.item_price.findMany({
        where: { item_id: itemID },
        select: {
          id: true,
          price: true,
          discount: true,
          item_id: true,
          item_unit_id: true,
        },
      });

      return result.map((item) => {
        return new ProductSalesPriceModel({
          id: item.id,
          price: Number(item.price),
          discount: Number(item.discount),
          item_id: item.item_id,
          item_unit_id: item.item_unit_id,
        });
      });
    } catch (error) {
      console.error(
        `[error]: Error on fetching product sales price by item ID ${error}`
      );
      throw error;
    }
  }
}
