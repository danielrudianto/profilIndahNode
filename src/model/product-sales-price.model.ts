import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ICreateProductPrice {
  price: number;
  discount: number;
  created_by: number;
  created_at: Date;
  item_id: number;
  item_unit_id: number | null;
}

interface IFetchProductPrice {
  reference: string;
  description: string;
  id: number;
  unit: string;
  price: number;
  discount: number;
  count: number;
  effective_date: string;
}

interface IFetchProductPriceID {
  reference: string;
  description: string;
  unit: string;
  used_unit: string | null;
  used_conversion: number | null;
  price: number;
  discount: number;
  item_id: number;
  item_unit_id: number | null;
}

interface IDeleteSalesProductPrice {
  item_id: number;
  item_unit_id: number | null;
  deleted_by: number;
}

export interface IFetchProductPriceDraftBill {
  item_id: number;
  item_unit_id: number | null;
}

export interface IProductSalesPrice {
  id?: number;
  item_id: number;
  item_unit_id: number | null;
  price: number;
  discount: number;
  effective_date?: Date;
  created_by?: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
}

export class ProductSalesPriceModel {
  id?: number;
  item_id: number;
  item_unit_id: number | null;
  price: number;
  discount: number;
  effective_date?: Date;
  created_by?: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;

  constructor(data: IProductSalesPrice) {
    this.id = data.id;
    this.item_id = data.item_id;
    this.item_unit_id = data.item_unit_id;
    this.price = data.price;
    this.discount = data.discount;
    this.effective_date = data.effective_date;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.is_delete = data.is_delete;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;
  }
}

export class ItemPriceModel {
  /**
   * Create item price
   * @param data
   */
  static createMany(data: ICreateProductPrice[]) {
    return prisma.item_price.createMany({
      data: data.map((x) => {
        return {
          item_id: x.item_id,
          item_unit_id: x.item_unit_id,
          price: x.price,
          discount: x.discount,
          created_by: x.created_by,
          created_at: x.created_at,
          effective_date: new Date(),
        };
      }),
    });
  }

  /**
   * Update item price
   * @param data
   * @returns
   */
  static update(data: ICreateProductPrice) {
    return prisma.$transaction([
      prisma.item_price.updateMany({
        where: {
          item_id: data.item_id,
          item_unit_id: data.item_unit_id,
          is_delete: false,
        },
        data: {
          is_delete: true,
          deleted_at: data.created_at,
          deleted_by: data.created_by,
        },
      }),
      prisma.item_price.create({
        data: {
          price: data.price,
          discount: data.discount,
          created_by: data.created_by,
          created_at: data.created_at,
          item_id: data.item_id,
          item_unit_id: data.item_unit_id,
          effective_date: new Date(),
        },
        select: {
          id: true,
          price: true,
          discount: true,
          is_delete: true,
          user: {
            select: {
              name: true,
            },
          },
          item: {
            select: {
              reference: true,
              description: true,
              item_brand: {
                select: {
                  name: true,
                },
              },
              item_type: {
                select: {
                  name: true,
                },
              },
            },
          },
          item_unit: {
            select: {
              unit: true,
              conversion: true,
            },
          },
        },
      }),
    ]);
  }

  static updateV2(data: any[], userID: number) {
    const transactions: any[] = [];

    data.forEach((x) => {
      transactions.push(
        prisma.item_price.updateMany({
          where: {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            is_delete: false,
          },
          data: {
            price: x.price,
            discount: x.discount,
            effective_date: new Date(),
          },
        })
      );
    });

    return prisma.$transaction(transactions);
  }

  /**
   * Fetch item prices by keyword, date, offset, and limit
   * @param keyword
   * @param date
   * @param offset
   * @param limit
   * @returns Promise<IFetchProductPrice[]>
   */
  static fetch(keyword: string, date: Date, offset: number, limit: number) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe<IFetchProductPrice[]>(`
        SELECT item.reference, item.description, item.id, item.unit, COALESCE(price.price, 0) AS price, COALESCE(price.discount) AS discount, COALESCE(priceCount.count, 0) AS count, price.effective_date
        FROM item
        JOIN (
            SELECT item_price.price, item_price.discount, item_price.item_id, item_price.effective_date
            FROM item_price
            WHERE item_price.is_delete = 0
            AND item_price.item_unit_id IS NULL
            GROUP BY item_price.item_id
            ORDER BY item_price.effective_date DESC
        ) price
        ON item.id = price.item_id
        LEFT JOIN (
          SELECT COUNT(id) AS count, item_price.item_id
          FROM item_price
          WHERE item_price.is_delete = 0
          AND item_price.item_unit_id IS NOT NULL
          GROUP BY item_price.item_id
        ) priceCount
        ON item.id = priceCount.item_id
        WHERE item.is_delete = 0
        AND (
          item.reference LIKE '%${keyword}%'
          OR item.description LIKE '%${keyword}%'
        )
        ORDER BY reference ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      prisma.item.count({
        where: {
          is_delete: false,
          OR: [
            {
              reference: {
                contains: keyword,
              },
            },
            {
              description: {
                contains: keyword,
              },
            },
          ],
        },
      }),
    ]);
  }

  static fetchByItemIDs(itemIDs: IFetchProductPriceDraftBill[]) {}

  /**
   * Fetch item price by item id and item unit id
   * @param item_id
   * @param item_unit_id
   * @returns Promise<IFetchProductPriceID[]>
   */
  static fetchByItemID(item_id: number, item_unit_id: number | null = null) {
    return prisma.$queryRawUnsafe<IFetchProductPriceID[]>(`
        SELECT item.reference, item.description, item.unit, 
        item_unit.unit AS used_unit, 
        item_unit.conversion AS used_conversion, 
        price.price, price.discount, 
        price.item_id, price.item_unit_id
        FROM item
        JOIN (
          SELECT item_price.price, item_price.discount, item_price.item_id, item_price.item_unit_id
          FROM item_price
          WHERE item_price.is_delete = 0
          AND item_price.item_id = ${item_id}
          ${
            item_unit_id != null
              ? `AND item_unit_id = ${item_unit_id}`
              : "AND item_unit_id IS NULL"
          }
        ) price
        ON item.id = price.item_id
        LEFT JOIN item_unit ON price.item_unit_id = item_unit.id
        WHERE item.id = ${item_id}
        ${
          item_unit_id != null
            ? `AND item_unit_id = ${item_unit_id}`
            : "AND item_unit_id IS NULL"
        }
      `);
  }

  static fetchByItemIDV2(item_id: number) {
    return prisma.$transaction([
      prisma.item.findUnique({
        where: {
          id: item_id,
        },
      }),
      prisma.item_price.findMany({
        where: {
          item_id: item_id,
          is_delete: false,
        },
        include: {
          item_unit: true,
        },
      }),
    ]);
  }

  static deleteById(item_id: number, created_by: number) {
    return prisma.item_price.updateMany({
      where: {
        item_id: item_id,
      },
      data: {
        is_delete: true,
        deleted_by: created_by,
      },
    });
  }

  static deleteByIds(item_ids: number[], created_by: number) {
    return prisma.item_price.updateMany({
      where: {
        item_id: {
          in: item_ids,
        },
      },
      data: {
        is_delete: true,
        deleted_by: created_by,
      },
    });
  }

  static updatePrice(
    item_id: number,
    price: number,
    discount: number,
    created_by: number,
    item_unit_id: number | null = null,
    effective_date: Date = new Date()
  ) {
    return prisma.$transaction([
      prisma.item_price.updateMany({
        where: {
          item_id: item_id,
          item_unit_id: item_unit_id,
          is_delete: false,
        },
        data: {
          is_delete: true,
          deleted_at: new Date(),
          deleted_by: created_by,
        },
      }),
      prisma.item_price.create({
        data: {
          item_id: item_id,
          item_unit_id: item_unit_id,
          price: price,
          discount: discount,
          created_by: created_by,
          created_at: new Date(),
          effective_date: effective_date,
        },
      }),
    ]);
  }

  static fetchById(item_id: number, item_unit_id: number | null = null) {
    if (item_unit_id == null) {
      return prisma.$queryRaw<any[]>`
        SELECT item.id, item.reference, item.description, item.unit
        FROM item
        JOIN (
          SELECT item_price.price, item_price.discount, item_price.item_id
          FROM item_price
          WHERE item_price.item_id = ${item_id}
          AND item_price.item_unit_id IS NULL
          AND item_price.is_delete = 0
        ) price
        ON item.id = price.item_id
        WHERE item.id = ${item_id}
      `;
    } else {
      return prisma.$queryRaw<any[]>`
        SELECT item.id, item.reference, item.description, item_unit.unit
        FROM item
        JOIN (
          SELECT item_price.price, item_price.discount, item_price.item_id
          FROM item_price
          WHERE item_price.item_id = ${item_id}
          AND item_price.item_unit_id = ${item_unit_id}
          AND item_price.is_delete = 0
        ) price
        ON item.id = price.item_id
        JOIN item_unit ON item_unit.item_id = item.id
        WHERE item.id = ${item_id}
      `;
    }
  }

  static updateMany(item_price: any[], deleted_by: number) {
    const transactions: any[] = [];
    item_price.forEach((x) => {
      transactions.push(
        prisma.item_price.updateMany({
          where: {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            is_delete: false,
          },
          data: {
            is_delete: true,
            deleted_at: new Date(),
            deleted_by: deleted_by,
          },
        })
      );

      transactions.push(
        prisma.item_price.create({
          data: {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            price: x.price,
            discount: x.discount,
            created_at: new Date(),
            created_by: deleted_by,
            effective_date: new Date(),
          },
        })
      );
    });

    return prisma.$transaction(transactions);
  }

  static delete(data: IDeleteSalesProductPrice) {
    return prisma.item_price.updateMany({
      where: {
        item_id: data.item_id,
        item_unit_id: data.item_unit_id,
      },
      data: {
        is_delete: true,
        deleted_by: data.deleted_by,
        deleted_at: new Date(),
      },
    });
  }
}
