"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ItemPriceModel {
    /**
     * Create item price
     * @param data
     */
    static createMany(data) {
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
    static update(data) {
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
    /**
     * Fetch item prices by keyword, date, offset, and limit
     * @param keyword
     * @param date
     * @param offset
     * @param limit
     * @returns Promise<IFetchProductPrice[]>
     */
    static fetch(keyword, date, offset, limit) {
        return prisma.$transaction([
            prisma.$queryRawUnsafe(`
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
    /**
     * Fetch item price by item id and item unit id
     * @param item_id
     * @param item_unit_id
     * @returns Promise<IFetchProductPriceID[]>
     */
    static fetchByItemID(item_id, item_unit_id = null) {
        return prisma.$queryRawUnsafe(`
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
          ${item_unit_id != null ? `AND item_unit_id = ${item_unit_id}` : ""}
        ) price
        ON item.id = price.item_id
        LEFT JOIN item_unit ON price.item_unit_id = item_unit.id
        WHERE item.id = ${item_id}
        ${item_unit_id != null ? `AND item_unit_id = ${item_unit_id}` : ""}
      `);
    }
    static deleteById(item_id, created_by) {
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
    static deleteByIds(item_ids, created_by) {
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
    static updatePrice(item_id, price, discount, created_by, item_unit_id = null, effective_date = new Date()) {
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
    static fetchById(item_id, item_unit_id = null) {
        if (item_unit_id == null) {
            return prisma.$queryRaw `
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
        }
        else {
            return prisma.$queryRaw `
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
    static updateMany(item_price, deleted_by) {
        const transactions = [];
        item_price.forEach((x) => {
            transactions.push(prisma.item_price.updateMany({
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
            }));
            transactions.push(prisma.item_price.create({
                data: {
                    item_id: x.item_id,
                    item_unit_id: x.item_unit_id,
                    price: x.price,
                    discount: x.discount,
                    created_at: new Date(),
                    created_by: deleted_by,
                    effective_date: new Date(),
                },
            }));
        });
        return prisma.$transaction(transactions);
    }
    static delete(data) {
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
exports.default = ItemPriceModel;
//# sourceMappingURL=item_price.model.js.map