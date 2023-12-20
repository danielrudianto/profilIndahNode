import { PrismaClient } from "@prisma/client";
import { join } from "@prisma/client/runtime";

const prisma = new PrismaClient();

class ProductStockModel {
  static fetch(keyword: string, offset: number, limit: number, mode: string) {
    if (mode == "plain") {
      if (keyword == "") {
        return prisma.$transaction([
          prisma.$queryRaw<any[]>`
              SELECT item.id, item.reference, item.description, item.unit, COALESCE(_stock.stock, 0) AS stock, item_brand.name as item_brand_name
              FROM item
              LEFT JOIN _stock ON item.id = _stock.item_id
              JOIN item_brand ON item.item_brand_id = item_brand.id
              WHERE item.is_delete = 0
              AND item.is_active = 1
              ORDER BY item.reference ASC 
              LIMIT ${limit}
              OFFSET ${offset}
          `,
          prisma.item.count({
            where: {
              is_active: true,
              is_delete: false,
            },
          }),
        ]);
      } else {
        return prisma.$transaction([
          prisma.$queryRawUnsafe<any[]>(`
              SELECT item.id, item.reference, item.description, item.unit, COALESCE(_stock.stock, 0) AS stock, item_brand.name as item_brand_name
              FROM item
              LEFT JOIN _stock ON item.id = _stock.item_id
              JOIN item_brand ON item.item_brand_id = item_brand.id
              WHERE item.is_delete = 0
              AND item.is_active = 1
              AND (
                  item.reference LIKE '%${keyword}%'
                  OR item.description LIKE '%${keyword}%'
              )
              ORDER BY item.reference ASC 
              LIMIT ${limit}
              OFFSET ${offset}
          `),
          prisma.item.count({
            where: {
              is_active: true,
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
    } else {
      if (keyword == "") {
        return prisma.$transaction([
          prisma.$queryRaw<any[]>`
              SELECT item.id, item.reference, item.description, item.unit, COALESCE(stock.stock, 0) AS stock, item_brand.name as item_brand_name
              FROM item
              LEFT JOIN stock ON item.id = stock.id
              JOIN item_brand ON item.item_brand_id = item_brand.id
              WHERE item.is_delete = 0
              AND item.is_active = 1
              AND stock.stock < 0
              ORDER BY item.reference ASC 
              LIMIT ${limit}
              OFFSET ${offset}
          `,
          prisma.item.count({
            where: {
              is_active: true,
              is_delete: false,
              stock: {
                stock: {
                  lt: 0,
                },
              },
            },
          }),
        ]);
      } else {
        return prisma.$transaction([
          prisma.$queryRawUnsafe<any[]>(`
              SELECT item.id, item.reference, item.description, item.unit, COALESCE(stock.stock, 0) AS stock, item_brand.name as item_brand_name
              FROM item
              LEFT JOIN stock ON item.id = stock.item_id
              JOIN item_brand ON item.item_brand_id = item_brand.id
              WHERE item.is_delete = 0
              AND item.is_active = 1
              AND (
                  item.reference LIKE '%${keyword}%'
                  OR item.description LIKE '%${keyword}%'
              )
              AND stock.stock < 0
              ORDER BY item.reference ASC 
              LIMIT ${limit}
              OFFSET ${offset}
          `),
          prisma.item.count({
            where: {
              is_active: true,
              is_delete: false,
              stock: {
                stock: {
                  lt: 0,
                },
              },
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
  }

  static fetchByID(itemID: number, offset: number) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe(`CALL stock_card_act_view(${offset}, ${itemID})`),
      prisma.$queryRawUnsafe(`CALL stock_card_act_count(${itemID})`),
    ]);
  }

  static fetchStockData(
    item_id: number,
    mode: string,
    start: string | null = null,
    end: string | null = null
  ) {
    if (mode == "document") {
      if (start == null || end == null) {
        return prisma.$queryRawUnsafe(
          `CALL daily_stock_card_date(NULL, NULL, ${item_id})`
        );
      } else {
        return prisma.$queryRawUnsafe(
          `CALL daily_stock_card_date('${start}', '${end}', ${item_id})`
        );
      }
    } else if (mode == "input") {
      return prisma.$queryRawUnsafe(
        `CALL daily_stock_card_input('${start}', '${end}', ${item_id})`
      );
    } else if (mode == "card") {
      return prisma.$queryRawUnsafe(
        `CALL daily_stock_card_date('${start}', '${end}', ${item_id})`
      );
    }
  }

  static fetchByIDs(itemIDs: number[]) {
    return prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      item.id, 
      item.reference, 
      item.description, 
      item.unit, 
      _stock.stock, 
      item_brand.name AS item_brand_name,
      COALESCE(unit.count, 0) AS count,
      COALESCE(itemPrice.price, 0) AS price,
      COALESCE(itemPrice.discount, 0) AS discount
    FROM item
    JOIN item_brand ON item.item_brand_id = item_brand.id
    LEFT JOIN (
      SELECT COUNT(id) AS count, item_id
      FROM item_unit
      WHERE item_unit.is_delete = 0
      AND item_unit.item_id in (${itemIDs.join(",")})
      GROUP BY item_id
    ) AS unit
    ON item.id = unit.item_id
    LEFT JOIN (
      SELECT item_price.item_id, item_price.price, item_price.discount
      FROM item_price
      WHERE item_price.is_delete = 0
      AND item_price.item_id IN (${itemIDs.join(",")})
      AND item_price.item_unit_id IS NULL
      ORDER BY item_price.id DESC
    ) AS itemPrice
    ON item.id = itemPrice.item_id
    LEFT JOIN _stock ON item.id = _stock.item_id
    WHERE item.id in (${itemIDs.join(",")})
    `);
  }

  static createStockData(itemID: number) {
    return prisma.$queryRawUnsafe(`
      INSERT INTO _stock (item_id, stock)
      VALUES (${itemID}, 0)
    `);
  }

  static updateStock(data: any[]) {
    let queryUpdate = "UPDATE _stock SET stock = CASE item_id ";
    data.forEach((item) => {
      queryUpdate += `WHEN ${item.item_id} THEN stock + ${item.quantity} `;
    });

    queryUpdate += "ELSE stock END WHERE item_id IN (";
    data.forEach((item) => {
      queryUpdate += `${item.item_id}, `;
    });
    queryUpdate = queryUpdate.slice(0, -2);
    queryUpdate += ")";

    return prisma.$queryRawUnsafe(queryUpdate);
  }

  static fetchProblematic() {
    return prisma.stock.findMany({
      where: {
        stock: {
          lt: 0,
        },
      },
      select: {
        item: {
          select: {
            reference: true,
            description: true,
            unit: true,
          },
        },
        stock: true,
      },
    });
  }
}

export default ProductStockModel;
