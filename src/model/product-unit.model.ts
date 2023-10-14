import { PrismaClient } from "@prisma/client";
import { ItemModel } from "./item.model";

const prisma = new PrismaClient();

class ItemUnitModel {
  id: number | null;
  item_id: number;
  unit: string;
  conversion: number;
  created_by?: number;
  created_at?: Date;
  is_delete: boolean;
  deleted_by: number | null;
  deleted_at: number | null;

  constructor(
    item_id: number,
    unit: string,
    conversion: number,
    created_by: number,
    id: number | null = null
  ) {
    this.id = id;
    this.item_id = item_id;
    this.unit = unit;
    this.conversion = conversion;
    this.created_by = created_by;
    this.created_at = new Date();
    this.is_delete = false;
    this.deleted_by = null;
    this.deleted_at = null;
  }

  static createMany(
    units: any[],
    item_id: number,
    created_by: number,
    created_at: Date = new Date()
  ) {
    const inserts: any[] = [];
    units.forEach((unit) => {
      inserts.push(
        prisma.item_unit.create({
          data: {
            item_id: item_id,
            created_by: created_by,
            created_at: created_at,
            unit: unit.unit,
            conversion: unit.conversion,
            item_price: {
              create: {
                price: unit.price,
                discount: unit.discount,
                created_at: created_at,
                created_by: created_by,
                item_id: item_id,
                effective_date: created_at,
              },
            },
            item_price_purchase: {
              create: {
                price: unit.price_purchase,
                discount: unit.discount_purchase,
                created_by: created_by,
                created_at: created_at,
                item_id: item_id,
              },
            },
          },
        })
      );
    });

    return Promise.all(inserts);
  }

  static fetchByItemID(id: number, mode: string) {
    if (mode == "plain") {
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
        },
        where: {
          id: id,
        },
      });
    } else if (mode == "sales") {
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

  static fetchByItemReference(reference: string) {
    return prisma.item.findFirst({
      where: {
        reference: reference,
        is_delete: false,
      },
      select: {
        reference: true,
        description: true,
        id: true,
        unit: true,
        item_brand: {
          select: {
            name: true,
          },
        },
        item_unit: {
          select: {
            conversion: true,
            unit: true,
            id: true,
          },
          where: {
            is_delete: false,
          },
        },
        is_delete: true,
      },
    });
  }

  static update(
    item_id: number,
    unit: string,
    units: ItemUnitModel[],
    deleted_by: number
  ) {
    const transaction: any[] = [];
    transaction.push(
      prisma.item.update({
        where: {
          id: item_id,
        },
        data: {
          unit: unit,
        },
      })
    );
    units.forEach((x) => {
      if (x.id === null) {
        transaction.push(
          prisma.item_unit.create({
            data: {
              item_id: item_id,
              created_by: deleted_by,
              created_at: new Date(),
              unit: x.unit,
              conversion: parseFloat(x.conversion.toString()),
              item_price: {
                create: {
                  item_id: item_id,
                  price: 0,
                  discount: 0,
                  created_by: deleted_by,
                  created_at: new Date(),
                  effective_date: new Date(),
                },
              },
              item_price_purchase: {
                create: {
                  item_id: item_id,
                  price: 0,
                  discount: 0,
                  created_by: deleted_by,
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
              deleted_by: deleted_by,
              deleted_at: new Date(),
              conversion: parseFloat(x.conversion.toString()),
              unit: x.unit,
              item_price_purchase: {
                updateMany: {
                  data: {
                    deleted_at: new Date(),
                    deleted_by: deleted_by,
                    is_delete: true,
                  },
                  where: {
                    item_id: item_id,
                    item_unit_id: x.id,
                    is_delete: false,
                  },
                },
              },
              item_price: {
                updateMany: {
                  data: {
                    deleted_at: new Date(),
                    deleted_by: deleted_by,
                    is_delete: true,
                  },
                  where: {
                    item_id: item_id,
                    item_unit_id: x.id,
                    is_delete: false,
                  },
                },
              },
            },
          })
        );
      } else {
        transaction.push(
          prisma.item_unit.update({
            where: {
              id: x.id!,
            },
            data: {
              conversion: parseFloat(x.conversion.toString()),
              unit: x.unit,
            },
          })
        );
      }
    });

    return prisma.$transaction(transaction);
  }
}

export default ItemUnitModel;
