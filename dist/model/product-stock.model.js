"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const runtime_1 = require("@prisma/client/runtime");
const prisma = new client_1.PrismaClient();
class ProductStockModel {
    static fetch(keyword, offset, limit, mode) {
        if (mode == "plain") {
            if (keyword == "") {
                return prisma.$transaction([
                    prisma.$queryRaw `
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
            }
            else {
                return prisma.$transaction([
                    prisma.$queryRawUnsafe(`
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
        }
        else {
            if (keyword == "") {
                return prisma.$transaction([
                    prisma.$queryRaw `
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
            }
            else {
                return prisma.$transaction([
                    prisma.$queryRawUnsafe(`
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
    static fetchByID(itemID, offset) {
        return prisma.$transaction([
            prisma.$queryRawUnsafe(`CALL stock_card_act_view(${offset}, ${itemID})`),
            prisma.$queryRawUnsafe(`CALL stock_card_act_count(${itemID})`),
        ]);
    }
    static fetchInadequate(brand_id, type_id) {
        return prisma.$queryRaw `
        SELECT item.id, item.reference, item.description, item_brand.name AS item_brand_name, item_type.name AS item_type_name, COALESCE(stock.stock, 0) AS stock, item.unit, item.minimum_stock
        FROM item
        JOIN item_brand ON item.item_brand_id = item_brand.id
        JOIN item_type ON item.item_type_id = item_type.id
        LEFT JOIN stock ON item.id = stock.id
        WHERE item.item_brand_id IN (${(0, runtime_1.join)(brand_id)})
        AND item.item_type_id IN (${(0, runtime_1.join)(type_id)})
        AND COALESCE(stock.stock, 0) < item.minimum_stock
        AND item.is_delete = 0
        ORDER BY item.reference ASC
    `;
    }
    static fetchStockData(item_id, mode, start = null, end = null) {
        if (mode == "document") {
            if (start == null || end == null) {
                return prisma.$queryRawUnsafe(`CALL daily_stock_card_date(NULL, NULL, ${item_id})`);
            }
            else {
                return prisma.$queryRawUnsafe(`CALL daily_stock_card_date('${start}', '${end}', ${item_id})`);
            }
        }
        else if (mode == "input") {
            return prisma.$queryRawUnsafe(`CALL daily_stock_card_input('${start}', '${end}', ${item_id})`);
        }
        else if (mode == "card") {
            return prisma.$queryRawUnsafe(`CALL daily_stock_card_date('${start}', '${end}', ${item_id})`);
        }
    }
    static fetchByIDs(itemIDs) {
        return prisma.$queryRawUnsafe(`
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
    static createStockData(itemID) {
        return prisma.$queryRawUnsafe(`
      INSERT INTO _stock (item_id, stock)
      VALUES (${itemID}, 0)
    `);
    }
    static updateStock(data) {
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
    static syncData() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[info]: Syncing stock data.");
            yield prisma.stock.findMany({}).then((result) => __awaiter(this, void 0, void 0, function* () {
                console.log(`[info]: Updating ${result.length} stock data.`);
                let queryUpdate = "INSERT INTO _stock (item_id, stock) VALUES ";
                result.forEach((item) => {
                    queryUpdate += `(${item.id}, ${item.stock}),`;
                });
                Promise.all([
                    prisma.$queryRaw `
            TRUNCATE TABLE _stock;
          `,
                    prisma.$queryRawUnsafe(queryUpdate.slice(0, -1)),
                ])
                    .then(() => {
                    console.log("[info]: Stock data has been synced.");
                })
                    .catch(() => {
                    // Retry
                    console.log("[error]: Stock data sync failed. Retrying.");
                    this.syncData();
                });
            }));
        });
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
exports.default = ProductStockModel;
