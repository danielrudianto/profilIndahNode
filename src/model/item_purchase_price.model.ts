import { PrismaClient, PrismaPromise } from "@prisma/client";

const prisma = new PrismaClient();

interface ICreateItemPurchasePrice {
  price: number;
  discount: number;
  item_id: number;
  created_by: number;
  item_unit_id: number | null;
}

interface IFetchCurrentItemPurchasePrice {
  item_id: number;
  item_unit_id: number | null;
}

interface IFetchCurrentItemPurchasePriceResult {
  price: number;
  discount: number;
  item_id: number;
  item_unit_id: number | null;
}

class ItemPurchasePriceModel {
  // update() {
  //   return prisma.$transaction([
  //     prisma.item_price_purchase.updateMany({
  //       where: {
  //         item_id: this.item_id,
  //         item_unit_id: this.item_unit_id,
  //         is_delete: false,
  //       },
  //       data: {
  //         is_delete: true,
  //         deleted_at: this.created_at,
  //         deleted_by: this.created_by,
  //       },
  //     }),
  //     prisma.item_price_purchase.create({
  //       data: {
  //         price: this.price,
  //         created_by: this.created_by,
  //         created_at: this.created_at,
  //         item_id: this.item_id,
  //         item_unit_id: this.item_unit_id,
  //       },
  //       select: {
  //         id: true,
  //         price: true,
  //         is_delete: true,
  //         user: {
  //           select: {
  //             name: true,
  //           },
  //         },
  //         item: {
  //           select: {
  //             reference: true,
  //             description: true,
  //             item_brand: {
  //               select: {
  //                 name: true,
  //               },
  //             },
  //             item_type: {
  //               select: {
  //                 name: true,
  //               },
  //             },
  //           },
  //         },
  //         item_unit: {
  //           select: {
  //             unit: true,
  //             conversion: true,
  //           },
  //         },
  //       },
  //     }),
  //   ]);
  // }

  static insertItems(item_price: any[]) {
    const transactions: PrismaPromise<any>[] = [];
    item_price.forEach((x) => {
      const item_id = x.item_id;
      const item_unit_id = (x.item_unit_id = x.item_unit_id);
      const created_by = x.created_by;
      transactions.push(
        prisma.item_price_purchase.updateMany({
          where: {
            item_id: item_id,
            item_unit_id: item_unit_id,
            is_delete: false,
          },
          data: {
            deleted_at: new Date(),
            is_delete: true,
            deleted_by: created_by,
          },
        })
      );
    });

    transactions.push(
      prisma.item_price_purchase.createMany({
        data: item_price,
      })
    );

    return Promise.all(transactions);
  }

  static fetchByItemID(id: number, item_unit_id: number | null = null) {
    return prisma.item_price_purchase.findMany({
      where: {
        item_id: id,
        item_unit_id: item_unit_id,
        is_delete: false,
      },
    });
  }

  static fetchByItemIds(ids: number[]) {
    return prisma.item_price_purchase.findMany({
      where: {
        item_id: {
          in: ids,
        },
        is_delete: false,
      },
    });
  }

  static fetch(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.$queryRaw<any[]>`
          SELECT item.reference, item.description, item.id, item.unit, 
          COALESCE(price.price, 0) AS price, 
          COALESCE(priceCount.count, 0) AS count
          FROM item
          JOIN (
              SELECT item_price_purchase.price, item_price_purchase.item_id
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
          ORDER BY reference ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `,
        prisma.item.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
          SELECT item.reference, item.description, item.id, item.unit, COALESCE(price.price, 0) AS price, COALESCE(priceCount.count, 0) AS count
          FROM item
          JOIN (
              SELECT item_price_purchase.price, item_price_purchase.item_id
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
  }

  static deleteItems(item_ids: number[], created_by: number) {
    return prisma.item_price_purchase.updateMany({
      where: {
        item_id: {
          in: item_ids,
        },
      },
      data: {
        is_delete: true,
        deleted_by: created_by,
        deleted_at: new Date(),
      },
    });
  }

  static fetchById(item_id: number, item_unit_id: number | null = null) {
    if (item_unit_id != null) {
      return prisma.$queryRaw<any[]>`
        SELECT item.reference, item.description, item.unit, item_unit.unit AS used_unit, item_unit.conversion AS used_conversion, price.price, item.id AS item_id, NULL AS item_unit_id
        FROM item_unit
        JOIN item ON item.id = item_unit.item_id
        JOIN (
          SELECT item_price_purchase.price, item_price_purchase.item_id, item_price_purchase.item_unit_id
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
      return prisma.$queryRaw<any[]>`
        SELECT item.reference, item.description, item.unit, NULL AS used_unit, NULL AS used_conversion, price.price, price.item_id, price.item_unit_id
        FROM item
        JOIN (
          SELECT item_price_purchase.price, item_price_purchase.item_id, item_price_purchase.item_unit_id
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

  /**
   * Fetch current price of items
   * @param data
   * @returns
   */
  static fetchCurrentPrice(data: IFetchCurrentItemPurchasePrice[]) {
    let whereQuery = "WHERE is_delete = 0";
    for (let x of data) {
      if (x.item_unit_id == null) {
        whereQuery += ` OR (item_id = ${x.item_id} AND item_unit_id IS NULL)`;
      } else {
        whereQuery += ` OR (item_id = ${x.item_id} AND item_unit_id = ${x.item_unit_id})`;
      }
    }

    return prisma.$queryRawUnsafe<IFetchCurrentItemPurchasePriceResult[]>(`
        SELECT item_price_purchase.price, item_price_purchase.discount,
        item_price_purchase.item_id, item_price_purchase.item_unit_id
        FROM item_price_purchase
        ${whereQuery}
        ORDER BY item_price_purchase.id DESC
      `);
  }

  /**
   * Delete item price purchase by item id and item unit id
   * @param item_id
   * @param item_unit_id
   * @param created_by
   * @returns ItemPricePurchase[]
   */
  static deleteByID(
    item_id: number,
    item_unit_id: number | null,
    created_by: number
  ) {
    return prisma.item_price_purchase.updateMany({
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
    });
  }
}

export default ItemPurchasePriceModel;
