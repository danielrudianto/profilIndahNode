import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export enum ItemUnitMode {
  Sales,
  Plain,
}

export interface IProductUnit {
  id?: number;
  item_id: number;
  unit: string;
  conversion: number;
  is_delete?: boolean;
  created_by?: number;
  created_at?: Date;

  item_price?: {
    id?: number;
    price: number;
    discount: number;
    item_id?: number;
    item_unit_id?: number;
    created_by?: number;
    created_at?: Date;
    effective_date?: Date;
  };

  item_price_purchase?: {
    id?: number;
    price: number;
    discount: number;
    item_id?: number;
    item_unit_id?: number;
    created_by?: number;
    created_at?: Date;
  };
}

interface IUpdateProductUnit {
  item_id: number;
  unit: string;
  units: IProductUnit[];
  created_by: number;
}

export class ProductUnitModel {
  id?: number;
  item_id?: number;
  unit: string;
  conversion: number;
  is_delete?: boolean;
  created_by?: number;
  created_at?: Date;

  constructor(data: IProductUnit) {
    this.id = data.id;
    this.item_id = data.item_id;
    this.unit = data.unit;
    this.conversion = data.conversion;
    this.is_delete = data.is_delete;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
  }

  static fromMap(data: any): ProductUnitModel {
    return new ProductUnitModel({
      id: data.id,
      item_id: data.item_id,
      unit: data.unit,
      conversion: Number(data.conversion),
      is_delete: data.is_delete,
      created_by: data.created_by,
      created_at: data.created_at,
      item_price: data.item_price
        ? {
            id: data.item_price.id,
            price: Number(data.item_price.price),
            discount: Number(data.item_price.discount),
            item_id: data.item_price.item_id,
            item_unit_id: data.item_price.item_unit_id,
            created_by: data.item_price.created_by,
            created_at: data.item_price.created_at,
            effective_date: data.item_price.effective_date,
          }
        : undefined,
      item_price_purchase: data.item_price_purchase
        ? {
            id: data.item_price_purchase.id,
            price: Number(data.item_price_purchase.price),
            discount: Number(data.item_price_purchase.discount),
            item_id: data.item_price_purchase.item_id,
            item_unit_id: data.item_price_purchase.item_unit_id,
            created_by: data.item_price_purchase.created_by,
            created_at: data.item_price_purchase.created_at,
          }
        : undefined,
    });
  }

  create() {
    this.validateCreate();

    return prisma.item_unit.create({
      data: {
        item_id: this.item_id!,
        unit: this.unit,
        conversion: this.conversion,
        is_delete: this.is_delete,
        created_by: this.created_by!,
        created_at: this.created_at || new Date(),
      },
    });
  }

  private validateCreate() {
    if (!this.item_id) {
      throw new Error("Item ID is required");
    }
    if (!this.unit) {
      throw new Error("Unit is required");
    }
    if (typeof this.conversion !== "number") {
      throw new Error("Conversion must be a number");
    }
  }

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

  static update(data: IUpdateProductUnit) {
    const transaction: any[] = [];
    const date = new Date();

    const createItemUnit = (unitData: any) => {
      return prisma.item_unit.create({
        data: {
          item_id: data.item_id,
          created_by: data.created_by,
          created_at: date,
          unit: unitData.unit,
          conversion: unitData.conversion,
          item_price: {
            create: {
              item_id: data.item_id,
              price: 0,
              discount: 0,
              created_by: data.created_by,
              created_at: date,
              effective_date: date,
            },
          },
          item_price_purchase: {
            create: {
              item_id: data.item_id,
              price: 0,
              discount: 0,
              created_by: data.created_by,
              created_at: date,
            },
          },
        },
      });
    };

    // Helper function to update item_unit
    const updateItemUnit = (unitData: any) => {
      return prisma.item_unit.update({
        where: {
          id: unitData.id,
        },
        data: {
          is_delete: true,
          deleted_by: data.created_by,
          deleted_at: date,
          conversion: unitData.conversion,
          unit: unitData.unit,
          item_price_purchase: {
            updateMany: {
              data: {
                deleted_at: date,
                deleted_by: data.created_by,
                is_delete: true,
              },
              where: {
                item_id: data.item_id,
                item_unit_id: unitData.id,
                is_delete: false,
              },
            },
          },
          item_price: {
            updateMany: {
              data: {
                deleted_at: date,
                deleted_by: data.created_by,
                is_delete: true,
              },
              where: {
                item_id: data.item_id,
                item_unit_id: unitData.id,
                is_delete: false,
              },
            },
          },
        },
      });
    };

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

    data.units.forEach((unit) => {
      if (unit.id == null) {
        transaction.push(createItemUnit(unit));
      } else if (unit.is_delete) {
        transaction.push(updateItemUnit(unit));
      }
    });

    return prisma.$transaction(transaction);
  }
}
