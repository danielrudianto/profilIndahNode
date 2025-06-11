import { PrismaClient } from "@prisma/client";
import { IProductUnit, ProductUnitModel } from "../model/product-unit.model";

export class ProductUnitRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IProductUnit[]) {
    try {
      const result = await this.prisma.item_unit.createMany({
        data: data.map((unit) => {
          return {
            item_id: unit.item_id,
            unit: unit.unit,
            conversion: unit.conversion,
            created_by: unit.created_by!,
            created_at: unit.created_at!,
            item_price: {
              create: {
                data: {
                  price: unit.item_price?.price,
                  discount: unit.item_price?.discount,
                  item_id: unit.item_id,
                  created_by: unit.item_price?.created_by,
                  created_at: unit.item_price?.created_at,
                  effective_date: unit.created_at!,
                },
              },
            },
            item_price_purchase: {
              create: {
                data: {
                  price: unit.item_price_purchase?.price,
                  discount: unit.item_price_purchase?.discount,
                  item_id: unit.item_id,
                  created_by: unit.item_price_purchase?.created_by,
                  created_at: unit.item_price_purchase?.created_at,
                },
              },
            },
          };
        }),
      });

      return result.count;
    } catch (error) {
      throw error;
    }
  }

  async fetchByItemID(itemID: number) {
    try {
      const result = await this.prisma.item_unit.findMany({
        where: { item_id: itemID },
        select: {
          id: true,
          item_id: true,
          unit: true,
          conversion: true,
          created_by: true,
          created_at: true,
          item_price: {
            select: {
              id: true,
              price: true,
              discount: true,
            },
            where: {
              is_delete: false,
            },
            orderBy: {
              effective_date: "desc",
            },
            take: 1,
          },
          item_price_purchase: {
            select: {
              id: true,
              price: true,
              discount: true,
              created_by: true,
              created_at: true,
            },
            where: {
              is_delete: false,
            },
            take: 1,
          },
        },
      });

      return result.map((unit) => {
        return new ProductUnitModel({
          id: unit.id,
          unit: unit.unit,
          conversion: Number(unit.conversion),
          item_id: unit.item_id,
          item_price:
            unit.item_price.length > 0
              ? {
                  id: unit.item_price[0].id,
                  price: Number(unit.item_price[0].price),
                  discount: Number(unit.item_price[0].discount),
                }
              : undefined,
          item_price_purchase:
            unit.item_price_purchase.length > 0
              ? {
                  id: unit.item_price_purchase[0].id,
                  price: Number(unit.item_price_purchase[0].price),
                  discount: Number(unit.item_price_purchase[0].discount),
                }
              : undefined,
          created_at: unit.created_at,
          created_by: unit.created_by,
        });
      });
    } catch (error) {
      throw error;
    }
  }
}
