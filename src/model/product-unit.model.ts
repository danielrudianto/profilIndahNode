import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export enum ItemUnitMode {
  Sales,
  Plain,
}

export interface IProductUnit {
  id: number | null;
  unit: string;
  conversion: number;
  is_delete: boolean;
}

interface IUpdateProductUnit {
  item_id: number;
  unit: string;
  units: IProductUnit[];
  created_by: number;
}

class ItemUnitModel {
  /**
   * Fetch item unit by item ID
   * @param id
   * @param mode
   * @returns
   */
  static fetchByItemID(id: number, mode: ItemUnitMode) {
    switch (mode) {
      case ItemUnitMode.Plain:
        return prisma.item.findUnique({
          select: {
            reference: true,
            description: true,
            id: true,
            unit: true,
            item_unit: {
              select: {
                unit: true,
                conversion: true,
                id: true,
              },
              where: {
                is_delete: false,
              },
            },
          },
          where: {
            id: id,
          },
        });
      case ItemUnitMode.Sales:
        return prisma.item.findUnique({
          select: {
            reference: true,
            description: true,
            id: true,
            unit: true,
            item_unit: {
              select: {
                unit: true,
                conversion: true,
                id: true,
              },
            },
            item_price: {
              select: {
                price: true,
                discount: true,
              },
              where: {
                is_delete: false,
              },
            },
          },
          where: {
            id: id,
          },
        });
    }
  }

  /**
   * Update product unit
   * @param data
   * @returns Promise
   */
  static update(data: IUpdateProductUnit) {
    const transaction: any[] = [];
    transaction.push(
      prisma.item.update({
        where: {
          id: data.item_id,
        },
        data: {
          unit: data.unit,
        },
      })
    );
    data.units.forEach((x) => {
      if (x.id == null) {
        transaction.push(
          prisma.item_unit.create({
            data: {
              item_id: data.item_id,
              created_by: data.created_by,
              created_at: new Date(),
              unit: x.unit,
              conversion: x.conversion,
              item_price: {
                create: {
                  item_id: data.item_id,
                  price: 0,
                  discount: 0,
                  created_by: data.created_by,
                  created_at: new Date(),
                  effective_date: new Date(),
                },
              },
              item_price_purchase: {
                create: {
                  item_id: data.item_id,
                  price: 0,
                  discount: 0,
                  created_by: data.created_by,
                  created_at: new Date(),
                },
              },
            },
          })
        );
      } else if (x.is_delete) {
        transaction.push(
          prisma.item_unit.update({
            where: {
              id: x.id,
            },
            data: {
              is_delete: true,
              deleted_by: data.created_by,
              deleted_at: new Date(),
              conversion: x.conversion,
              unit: x.unit,
              item_price_purchase: {
                updateMany: {
                  data: {
                    deleted_at: new Date(),
                    deleted_by: data.created_by,
                    is_delete: true,
                  },
                  where: {
                    item_id: data.item_id,
                    item_unit_id: x.id,
                    is_delete: false,
                  },
                },
              },
              item_price: {
                updateMany: {
                  data: {
                    deleted_at: new Date(),
                    deleted_by: data.created_by,
                    is_delete: true,
                  },
                  where: {
                    item_id: data.item_id,
                    item_unit_id: x.id,
                    is_delete: false,
                  },
                },
              },
            },
          })
        );
      }
    });

    return prisma.$transaction(transaction);
  }
}

export default ItemUnitModel;
