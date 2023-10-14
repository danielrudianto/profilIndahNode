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

class ItemPriceModel {
  /**
   * Update item price
   * @param data
   * @returns
   */
  update(data: ICreateProductPrice) {
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

  static fetch(keyword: string, date: Date, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.$queryRaw<any[]>`
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
  }

  static fetchByItemID(item_id: number, item_unit_id: number | null = null) {
    if (item_unit_id != null) {
      return prisma.$queryRaw<any[]>`
        SELECT item.reference, item.description, item.unit, item_unit.unit AS used_unit, item_unit.conversion AS used_conversion, price.price, price.discount, item.id AS item_id, NULL AS item_unit_id
        FROM item_unit
        JOIN item ON item.id = item_unit.item_id
        JOIN (
          SELECT item_price.price, item_price.discount, item_price.item_id, item_price.item_unit_id
          FROM item_price
          WHERE item_price.is_delete = 0
          AND item_price.item_id = ${item_id}
          AND item_price.item_unit_id = ${item_unit_id}
        ) price
        ON item.id = price.item_id
        AND item_unit.id
        WHERE item.id = ${item_id}
        AND item_unit.id = ${item_unit_id}
      `;
    } else {
      return prisma.$queryRaw<any[]>`
        SELECT item.reference, item.description, item.unit, NULL AS used_unit, NULL AS used_conversion, price.price, price.discount, price.item_id, price.item_unit_id
        FROM item
        JOIN (
          SELECT item_price.price, item_price.discount, item_price.item_id, item_price.item_unit_id
          FROM item_price
          WHERE item_price.is_delete = 0
          AND item_price.item_id = ${item_id}
          AND item_price.item_unit_id IS NULL
        ) price
        ON item.id = price.item_id
        WHERE item.id = ${item_id}
      `;
    }
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

  static delete(
    item_id: number,
    item_unit_id: number | null = null,
    created_by: number
  ) {
    return prisma.item_price.updateMany({
      where: {
        item_id: item_id,
        item_unit_id: item_unit_id,
      },
      data: {
        is_delete: true,
        deleted_by: created_by,
        deleted_at: new Date(),
      },
    });
  }
}

export default ItemPriceModel;
