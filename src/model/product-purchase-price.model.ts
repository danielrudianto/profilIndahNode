import { PrismaClient, PrismaPromise } from "@prisma/client";

const prisma = new PrismaClient();

export interface IProductPurchasePrice {
  id?: number;
  item_id: number;
  item_unit_id: number | null;
  price: number;
  discount: number;
  created_by?: number;
  created_at?: Date;
}

interface ICreateItemPurchasePrice {
  price: number;
  discount: number;
  item_id: number;
  created_by: number;
  item_unit_id: number | null;
}

interface IFetchItemPurchasePrice {
  id: number;
  unit: string;
  reference: string;
  description: string;
  price: number;
  discount: number;
  count: number;
}

interface IFetchPurchasePriceParam {
  item_id: number;
  item_unit_id: number | null;
}

interface IDeletePUrchasePriceParam extends IFetchPurchasePriceParam {
  deleted_by: number;
}

interface IFetchPurchasePrice {
  price: number;
  discount: number;
  item_id: number;
  item_unit_id: number | null;
}

interface IFetchPurchasesPriceByID {
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

interface IFetchItemPurchasePriceFetch {
  item_id: number;
  item_unit_id: number | null;
}

export class ProductPurchasePriceModel {
  id?: number;
  item_id: number;
  item_unit_id: number | null;
  price: number;
  discount: number;
  created_by?: number;
  created_at?: Date;

  constructor(data: IProductPurchasePrice) {
    this.id = data.id;
    this.item_id = data.item_id;
    this.item_unit_id = data.item_unit_id;
    this.price = data.price;
    this.discount = data.discount;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
  }

  static fromMap(data: any): ProductPurchasePriceModel {
    return new ProductPurchasePriceModel({
      id: data.id,
      item_id: data.item_id,
      item_unit_id: data.item_unit_id,
      price: Number(data.price),
      discount: Number(data.discount),
      created_by: data.created_by,
      created_at: data.created_at,
    });
  }
  /**
   * Create item purchase price by item ID and item unit ID
   * @param data
   * @returns
   */
  static create(data: ICreateItemPurchasePrice[]) {
    return prisma.$transaction([
      prisma.item_price_purchase.createMany({
        data: data.map((x) => {
          return {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            price: x.price,
            discount: x.discount,
            created_by: x.created_by,
          };
        }),
      }),
    ]);
  }

  /**
   * Update item purchase price by item ID and item unit ID
   * @param data
   * @returns
   */
  static delete(data: IDeletePUrchasePriceParam[]) {
    return prisma.$transaction(
      data.map((x) => {
        return prisma.item_price_purchase.updateMany({
          where: {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            is_delete: false,
          },
          data: {
            is_delete: true,
            deleted_at: new Date(),
            deleted_by: x.deleted_by,
          },
        });
      })
    );
  }

  /**
   * Return the latest purchase price of an item
   * @param id
   * @param item_unit_id
   * @returns
   */
  static fetchByItemID(id: number, item_unit_id: number | null = null) {
    return prisma.item_price_purchase.findFirst({
      where: {
        item_id: id,
        item_unit_id: item_unit_id,
        is_delete: false,
      },
    });
  }

  /**
   * Fetch item purchase price by item ID and item unit ID
   * @param data
   * @returns
   */
  static fetchByItemIDs(data: IFetchItemPurchasePriceFetch[]) {
    return prisma.$transaction(
      data.map((x) => {
        return prisma.item_price_purchase.findFirst({
          where: {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            is_delete: false,
          },
        });
      })
    );
  }

  /**
   * Fetch item purchase price by item ID and item unit ID
   * @param keyword
   * @param offset
   * @param limit
   * @returns
   */
  static fetch(keyword: string, offset: number, limit: number) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe<IFetchItemPurchasePrice[]>(`
        SELECT item.reference, item.description, item.id, item.unit, 
        COALESCE(price.price, 0) AS price, COALESCE(price.discount, 0) AS discount, 
        COALESCE(priceCount.count, 0) AS count
        FROM item
        JOIN (
            SELECT item_price_purchase.price, item_price_purchase.discount,
             item_price_purchase.item_id
            FROM item_price_purchase
            WHERE item_price_purchase.is_delete = 0
            AND item_price_purchase.item_unit_id IS NULL
            GROUP BY item_price_purchase.item_id
        ) price
        ON item.id = price.item_id
        LEFT JOIN (
          SELECT COUNT(id) AS count, item_price_purchase.item_id
          FROM item_price_purchase
          WHERE item_price_purchase.is_delete = 0
          AND item_price_purchase.item_unit_id IS NOT NULL
          GROUP BY item_price_purchase.item_id
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

  /**
   * Fetch item purchase price by itemID and itemUnitID
   * @param item_id
   * @param item_unit_id
   * @returns
   */
  static fetchByID(item_id: number, item_unit_id: number | null = null) {
    if (item_unit_id != null) {
      return prisma.$queryRaw<IFetchPurchasesPriceByID[]>`
        SELECT item.reference, item.description, item.unit, 
        item_unit.unit AS used_unit, 
        item_unit.conversion AS used_conversion, price.price, 
        price.discount, item.id AS item_id, NULL AS item_unit_id
        FROM item_unit
        JOIN item ON item.id = item_unit.item_id
        JOIN (
          SELECT item_price_purchase.price, item_price_purchase.discount, item_price_purchase.item_id, item_price_purchase.item_unit_id
          FROM item_price_purchase
          WHERE item_price_purchase.is_delete = 0
          AND item_price_purchase.item_id = ${item_id}
          AND item_price_purchase.item_unit_id = ${item_unit_id}
        ) price
        ON item.id = price.item_id
        AND item_unit.id
        WHERE item.id = ${item_id}
        AND item_unit.id = ${item_unit_id}
      `;
    } else {
      return prisma.$queryRaw<IFetchPurchasesPriceByID[]>`
        SELECT item.reference, item.description, item.unit, 
        NULL AS used_unit, 
        NULL AS used_conversion, price.price, 
        price.discount, price.item_id, price.item_unit_id
        FROM item
        JOIN (
          SELECT item_price_purchase.price, item_price_purchase.discount, item_price_purchase.item_id, item_price_purchase.item_unit_id
          FROM item_price_purchase
          WHERE item_price_purchase.is_delete = 0
          AND item_price_purchase.item_id = ${item_id}
          AND item_price_purchase.item_unit_id IS NULL
        ) price
        ON item.id = price.item_id
        WHERE item.id = ${item_id}
      `;
    }
  }

  static fetchByItemIDV2(item_id: number) {
    return prisma.$transaction([
      prisma.item.findUnique({
        where: {
          id: item_id,
        },
      }),
      prisma.item_price_purchase.findMany({
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

  /**
   * Fetch current price of items
   * @param data
   * @returns
   */
  static fetchCurrentPrice(data: IFetchPurchasePriceParam[]) {
    let whereQuery = "WHERE is_delete = 0";
    for (let x of data) {
      if (x.item_unit_id == null) {
        whereQuery += ` OR (item_id = ${x.item_id} AND item_unit_id IS NULL)`;
      } else {
        whereQuery += ` OR (item_id = ${x.item_id} AND item_unit_id = ${x.item_unit_id})`;
      }
    }

    return prisma.$queryRawUnsafe<IFetchPurchasePrice[]>(`
        SELECT item_price_purchase.price, item_price_purchase.discount,
        item_price_purchase.item_id, item_price_purchase.item_unit_id
        FROM item_price_purchase
        ${whereQuery}
        ORDER BY item_price_purchase.id DESC
      `);
  }

  static updateMany(item_price: any[], userID: number) {
    const transactions: any[] = [];
    item_price.forEach((x) => {
      transactions.push(
        prisma.item_price_purchase.updateMany({
          where: {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            is_delete: false,
          },
          data: {
            is_delete: true,
            deleted_at: new Date(),
            deleted_by: userID,
          },
        })
      );

      transactions.push(
        prisma.item_price_purchase.create({
          data: {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            price: x.price,
            discount: x.discount,
            created_at: new Date(),
            created_by: userID,
          },
        })
      );
    });

    return prisma.$transaction(transactions);
  }
}

interface IProductPurchasePriceViewModel {
  id?: number;
  item_id?: number;
  item_unit_id?: number | null;
  price: number;
  discount: number;
}

export class ProductPurchasePriceViewModel {
  id?: number;
  item_id?: number;
  item_unit_id?: number | null;
  price: number;
  discount: number;

  constructor(data: IProductPurchasePriceViewModel) {
    this.id = data.id;
    this.item_id = data.item_id;
    this.item_unit_id = data.item_unit_id;
    this.price = data.price;
    this.discount = data.discount;
  }

  static fromMap(data: any): ProductPurchasePriceViewModel {
    return new ProductPurchasePriceViewModel({
      id: data.id,
      item_id: data.item_id,
      item_unit_id: data.item_unit_id,
      price: Number(data.price),
      discount: Number(data.discount),
    });
  }
}
