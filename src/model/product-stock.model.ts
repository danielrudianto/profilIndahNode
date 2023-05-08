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
              LEFT JOIN _stock ON item.id = _stock.id
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
              LEFT JOIN stock ON item.id = stock.id
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

  static fetchInadequate(brand_id: number[], type_id: number[]) {
    return prisma.$queryRaw<any[]>`
        SELECT item.id, item.reference, item.description, item_brand.name AS item_brand_name, item_type.name AS item_type_name, COALESCE(stock.stock, 0) AS stock, item.unit, item.minimum_stock
        FROM item
        JOIN item_brand ON item.item_brand_id = item_brand.id
        JOIN item_type ON item.item_type_id = item_type.id
        LEFT JOIN stock ON item.id = stock.id
        WHERE item.item_brand_id IN (${join(brand_id)})
        AND item.item_type_id IN (${join(type_id)})
        AND COALESCE(stock.stock, 0) < item.minimum_stock
        AND item.is_delete = 0
        ORDER BY item.reference ASC
    `;
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
      (COALESCE(goodreceipt.quantity, 0) + COALESCE(bill.quantity, 0) + COALESCE(adjustmentcase.quantity, 0)) AS stock, 
      item_brand.name AS item_brand_name,
      COALESCE(unit.count, 0) AS count,
      COALESCE(itemPrice.price, 0) AS price
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
      SELECT item_price.item_id, item_price.price
      FROM item_price
      WHERE item_price.is_delete = 0
      AND item_price.item_id IN (${itemIDs.join(",")})
      AND item_price.item_unit_id IS NULL
      ORDER BY item_price.id DESC
    ) AS itemPrice
    ON item.id = itemPrice.item_id
    LEFT JOIN (
      SELECT SUM(good_receipt.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, good_receipt.item_id
        FROM good_receipt
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
        WHERE good_receipt.item_id in (${itemIDs.join(",")})
    ) AS goodreceipt
    ON item.id = goodreceipt.item_id
    LEFT JOIN (
      SELECT SUM((bill.quantity - COALESCE(salesReturn.quantity, 0)) * COALESCE(item_unit.conversion, 1)) * -1 AS quantity, bill.item_id
        FROM bill
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
        LEFT JOIN (
        SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
            FROM sales_return
            JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
            WHERE sales_return_code.is_confirm = 1
            AND sales_return_code.is_delete = 0
            GROUP BY sales_return.bill_id
        ) salesReturn
        ON bill.id = salesReturn.bill_id
        WHERE bill.item_id in (${itemIDs.join(",")})
    ) AS bill
    ON item.id = bill.item_id
    LEFT JOIN (
      SELECT SUM(adjustment_case.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, adjustment_case.item_id
        FROM adjustment_case
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
        LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
        WHERE adjustment_case.item_id in (${itemIDs.join(",")})
    ) AS adjustmentcase
    ON item.id = adjustmentcase.item_id
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

  static async syncData() {
    const result = await prisma.stock.findMany();
    let queryUpdate = "INSERT INTO _stock (item_id, stock) VALUES ";
    result.forEach((item) => {
      queryUpdate += `(${item.id}, ${item.stock}),`;
    });
    return Promise.all([
      prisma.$queryRaw`
          TRUNCATE TABLE _stock;
        `,
      prisma.$queryRawUnsafe(queryUpdate.slice(0, -1)),
    ]);
  }
}

export default ProductStockModel;
