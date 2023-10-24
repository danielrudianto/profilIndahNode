"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandModel = void 0;
const app_1 = require("../app");
class BrandModel {
    /**
     * Create a new brand
     * @param data
     * @returns Promise<IProductBrand>
     */
    static create(data) {
        return app_1.prisma.item_brand.create({
            data: {
                name: data.name,
                created_by: data.created_by,
                created_at: new Date(),
            },
            select: {
                id: true,
                name: true,
                created_by: true,
                created_at: true,
                user: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }
    /**
     * Update brand by ID
     * @param data
     * @returns
     */
    static updateByID(data) {
        return app_1.prisma.item_brand.update({
            where: {
                id: data.id,
            },
            data: {
                name: data.name,
                updated_at: new Date(),
                updated_by: data.created_by,
            },
            select: {
                id: true,
                name: true,
                created_at: true,
                user: {
                    select: {
                        name: true,
                    },
                },
                updated_at: true,
                updated_by: true,
                user_item_brand_updated_byTouser: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }
    /**
     * Delete brand by ID
     * @param id
     * @param created_by
     * @returns
     */
    static deleteByID(id, created_by) {
        return app_1.prisma.item_brand.update({
            where: {
                id: id,
            },
            data: {
                deleted_at: new Date(),
                deleted_by: created_by,
                is_delete: true,
            },
            include: {
                user_item_brand_deleted_byTouser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }
    /**
     * Fetch if any active brand has the same name
     * @param name
     * @returns
     */
    static fetchByName(name) {
        return app_1.prisma.item_brand.findFirst({
            where: {
                name: name,
                is_delete: false,
            },
        });
    }
    /**
     * Fetch brand by ID
     * @param id
     * @returns
     */
    static fetchByID(id) {
        return app_1.prisma.$queryRaw `
      SELECT item_brand.id, item_brand.name, user.name AS user_name, 
      item_brand.created_at, item_brand.created_by, item_brand.is_delete, 
      IF(COALESCE(itemCount.count, 0) = 0,"1", "0") AS can_delete
      FROM item_brand
      LEFT JOIN user ON user.id = item_brand.created_by
      LEFT JOIN (
        SELECT COUNT(*) AS count, item_brand_id 
        FROM item 
        WHERE is_delete = 0 
        GROUP BY item_brand_id
      ) itemCount ON itemCount.item_brand_id = item_brand.id
      WHERE item_brand.id = ${id}
    `;
    }
    /**
     * Fetch autocomplete brand
     * @param keyword
     * @returns
     */
    static fetchAutocomplete(keyword) {
        return app_1.prisma.item_brand.findMany({
            where: {
                name: {
                    contains: keyword,
                },
                is_delete: false,
            },
            skip: 0,
            take: 5,
            orderBy: {
                name: "asc",
            },
        });
    }
    static fetch(keyword, offset, limit) {
        if (keyword == "") {
            return app_1.prisma.$transaction([
                app_1.prisma.$queryRaw `
          SELECT item_brand.id, item_brand.name, user.name AS created_by_name, item_brand.created_at, item_brand.created_by, COALESCE(itemCount.count, 0) AS count, item_brand.is_delete
          FROM item_brand
          LEFT JOIN (
            SELECT COUNT(id) AS count, item_brand_id
            FROM item
            WHERE item.is_delete = 0
            GROUP BY item_brand_id
          ) itemCount
          ON item_brand.id = itemCount.item_brand_id
          JOIN user ON item_brand.created_by = user.id
          WHERE item_brand.is_delete = 0
          ORDER BY item_brand.name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `,
                app_1.prisma.item_brand.count({
                    where: {
                        is_delete: false,
                    },
                }),
            ]);
        }
        else {
            return app_1.prisma.$transaction([
                app_1.prisma.$queryRawUnsafe(`
          SELECT item_brand.id, item_brand.name, user.name AS created_by_name, item_brand.created_at, item_brand.created_by, COALESCE(itemCount.count, 0) AS count, item_brand.is_delete
          FROM item_brand
          LEFT JOIN (
            SELECT COUNT(id) AS count, item_brand_id
            FROM item
            WHERE item.is_delete = 0
            GROUP BY item_brand_id
          ) itemCount
          ON item_brand.id = itemCount.item_brand_id
          JOIN user ON item_brand.created_by = user.id
          WHERE item_brand.is_delete = 0
          AND item_brand.name LIKE '%${keyword}%'
          ORDER BY item_brand.name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `),
                app_1.prisma.item_brand.count({
                    where: {
                        name: {
                            contains: keyword,
                        },
                        is_delete: false,
                    },
                }),
            ]);
        }
    }
    static fetchSales(start_date, end_date) {
        return app_1.prisma.$queryRawUnsafe(`
      SELECT item_brand.id, item_brand.name, SUM((bill.price - bill.discount) * bill.quantity) AS value
      FROM bill
      JOIN item ON bill.item_id = item.id
      JOIN item_brand ON item.item_brand_id = item_brand.id
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND bill_code.date >= '${start_date.getFullYear()}-${(start_date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${start_date.getDate().toString().padStart(2, "0")}'
      AND bill_code.date <= '${end_date.getFullYear()}-${(end_date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${end_date.getDate().toString().padStart(2, "0")}'
      GROUP BY item.item_brand_id
      ORDER BY value DESC
    `);
    }
    static fetchFrequent(brand_id, start_date, end_date, limit) {
        const formatted_start_date = `${start_date.getFullYear()}-${(start_date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${start_date.getDate().toString().padStart(2, "0")}`;
        const formatted_end_date = `${end_date.getFullYear()}-${(end_date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${end_date.getDate().toString().padStart(2, "0")}`;
        return app_1.prisma.$queryRawUnsafe(`
      SELECT item.reference, item.description, item_brand.name AS brand_name, item_type.name AS type_name, SUM(bill.quantity * IF(bill.item_unit_id IS NULL, 1, item_unit.conversion)) AS ordered
      FROM bill
      JOIN item ON bill.item_id = item.id
      LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
      JOIN item_brand ON item.item_brand_id = item_brand.id
      JOIN item_type ON item.item_type_id = item_type.id
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.date >= '${formatted_start_date}'
      AND bill_code.date <= '${formatted_end_date}'
      AND bill_code.is_confirm = 1
      AND item_brand.id = ${brand_id}
      GROUP BY bill.item_id
      ORDER BY ordered DESC
      LIMIT ${limit}
    `);
    }
    /**
     * Fetching brand data by IDs (array of ID)
     */
    static fetchByIDs(ids) {
        return app_1.prisma.item_brand.findMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });
    }
}
exports.BrandModel = BrandModel;
//# sourceMappingURL=brand.model.js.map