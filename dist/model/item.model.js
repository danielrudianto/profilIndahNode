"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ItemModel {
    constructor(reference, description, minimum_stock, brand_id, type_id, created_by, unit, id = null) {
        if (id != null) {
            this.id = id;
        }
        this.reference = reference;
        this.description = description;
        this.minimum_stock = minimum_stock;
        this.brand_id = brand_id;
        this.type_id = type_id;
        this.created_by = created_by;
        this.created_at = new Date();
        this.unit = unit;
    }
    create() {
        return prisma.item.create({
            data: {
                reference: this.reference,
                description: this.description,
                item_brand_id: this.brand_id,
                item_type_id: this.type_id,
                created_by: this.created_by,
                created_at: this.created_at,
                minimum_stock: this.minimum_stock,
                unit: this.unit,
            },
            select: {
                id: true,
                reference: true,
                description: true,
                item_brand: {
                    select: {
                        name: true,
                    },
                },
                item_type_id: true,
                item_type: {
                    select: {
                        name: true,
                    },
                },
                item_brand_id: true,
                created_by: true,
                user: {
                    select: {
                        name: true,
                    },
                },
                created_at: true,
                minimum_stock: true,
                is_active: true,
            },
        });
    }
    static update(id, reference, description, brand_id, type_id, updated_by, minimum_stock, unit) {
        return prisma.item.update({
            where: {
                id: id,
            },
            data: {
                reference: reference,
                description: description,
                item_brand_id: brand_id,
                item_type_id: type_id,
                updated_by: updated_by,
                updated_at: new Date(),
                minimum_stock: minimum_stock,
                unit: unit,
            },
            select: {
                id: true,
                reference: true,
                description: true,
                unit: true,
                item_brand: {
                    select: {
                        name: true,
                    },
                },
                item_brand_id: true,
                item_type: {
                    select: {
                        name: true,
                    },
                },
                item_type_id: true,
                minimum_stock: true,
                user_item_updated_byTouser: {
                    select: {
                        name: true,
                    },
                },
                updated_by: true,
                is_active: true,
            },
        });
    }
    static fetchById(id) {
        return prisma.$queryRaw `SELECT item.id, item.reference, item.description, item.is_delete, item.item_brand_id, item.item_type_id, item.unit, item.minimum_stock, item_type.name AS item_type_name, item_brand.name AS item_brand_name, IF(COALESCE(item_count.count, 0) = 0, 1, 0) AS can_delete, item.is_active, _stock.stock
      FROM item
      JOIN item_brand ON item.item_brand_id = item_brand.id
      JOIN item_type ON item.item_type_id = item_type.id
      LEFT JOIN (
        SELECT SUM(count) AS count, item_id
        FROM (
          SELECT COUNT(bill.id) AS count, bill.item_id
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_delete = 0
          AND bill.item_id = ${id}
          UNION ALL (
            SELECT COUNT(adjustment_case.id) AS count, adjustment_case.item_id
            FROM adjustment_case
            JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
            WHERE adjustment_case_code.is_delete = 0
            AND adjustment_case.item_id = ${id}
          )
          UNION ALL (
            SELECT COUNT(good_receipt.id) AS count, good_receipt.item_id
            FROM good_receipt
            JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
            WHERE good_receipt_code.is_delete = 0
            AND good_receipt.item_id = ${id}
          )
        ) a
      GROUP BY a.item_id
      ) item_count
      ON item_count.item_id = item.id
      LEFT JOIN _stock ON item.id = _stock.item_id
      WHERE item.id = ${id}`;
    }
    static fetchAutocomplete(keyword) {
        return prisma.$queryRawUnsafe(`
      SELECT item.id, item.reference AS name
      FROM item
      WHERE item.is_active = 1
      AND item.is_delete = 0
      AND (item.reference LIKE '%${keyword}%'
      OR item.description LIKE '%${keyword}%')
      ORDER BY item.reference ASC
      LIMIT 5
    `);
    }
    static fetchByIds(id) {
        return prisma.item.findMany({
            where: {
                id: {
                    in: id,
                },
            },
            select: {
                reference: true,
                description: true,
                id: true,
                stock: {
                    select: {
                        stock: true,
                    },
                },
                minimum_stock: true,
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
        });
    }
    static fetchByReference(reference) {
        return prisma.item.findFirst({
            where: {
                reference: reference,
                is_delete: false,
            },
            include: {
                user: {
                    select: {
                        name: true,
                    },
                },
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
                item_unit: {
                    select: {
                        unit: true,
                        id: true,
                        conversion: true,
                    },
                    where: {
                        is_delete: false,
                    },
                },
                _count: {
                    select: {
                        bill: true,
                        good_receipt: true,
                        adjustment_case: true,
                    },
                },
                stock: {
                    select: {
                        stock: true,
                    },
                },
            },
        });
    }
    static fetchByReferences(references) {
        return prisma.item.findMany({
            where: {
                reference: {
                    in: references,
                },
                is_delete: false,
            },
            select: {
                id: true,
                reference: true,
            },
        });
    }
    static fetchSearch(keyword, offset, limit) {
        if (keyword.length == 0) {
            return prisma.$transaction([
                prisma.item.findMany({
                    select: {
                        id: true,
                    },
                    where: {
                        is_active: true,
                        is_delete: false,
                    },
                    take: limit,
                    skip: offset,
                    orderBy: {
                        reference: "asc",
                    },
                }),
                prisma.item.count({
                    where: {
                        is_delete: false,
                        is_active: true,
                    },
                }),
            ]);
        }
        else {
            return prisma.$transaction([
                prisma.item.findMany({
                    where: {
                        is_delete: false,
                        is_active: true,
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
                    take: limit,
                    skip: offset,
                    orderBy: {
                        reference: "asc",
                    },
                }),
                prisma.item.count({
                    where: {
                        is_delete: false,
                        is_active: true,
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
    static fetch(keyword, offset, limit, purchase = false, sales = false) {
        if (purchase) {
            if (keyword == "") {
                return prisma.$transaction([
                    prisma.$queryRaw `
            SELECT item_price_purchase.id, item_price_purchase.price, item_price_purchase.item_id, item_unit_id, item_unit.unit, item_unit.conversion
            FROM item_price_purchase
            LEFT JOIN item_unit ON item_price_purchase.item_unit_id = item_unit.id
            JOIN (
              SELECT item.id
              FROM item
              WHERE item.is_delete = 0
              AND item.is_active = 1
              ORDER BY reference ASC
              LIMIT ${limit}
              OFFSET	${offset}
            ) item_count
            ON item_price_purchase.item_id = item_count.id
            WHERE item_price_purchase.is_delete = 0
            GROUP BY item_id, item_unit_id
          `,
                    prisma.$queryRaw `
            SELECT item.id, item.reference, item.description, item.unit
            FROM item
            WHERE item.is_delete = 0
            AND item.is_active = 1
            ORDER BY item.reference ASC
            LIMIT ${limit}
            OFFSET	${offset}
          `,
                    prisma.item.count({
                        where: {
                            is_delete: false,
                            is_active: true,
                        },
                    }),
                ]);
            }
            else {
                return prisma.$transaction([
                    prisma.$queryRawUnsafe(`
            SELECT item_price_purchase.id, item_price_purchase.price, item_price_purchase.item_id, item_unit_id, item_unit.unit, item_unit.conversion
            FROM item_price_purchase
            LEFT JOIN item_unit ON item_price_purchase.item_unit_id = item_unit.id
            JOIN (
              SELECT item.id
                FROM item
                WHERE item.is_delete = 0
                AND item.is_active = 1
                AND (item.reference LIKE '%${keyword}%' OR item.description LIKE '%${keyword}%')
                ORDER BY reference ASC
                LIMIT 10
                OFFSET	0
            ) item_count
            ON item_price_purchase.item_id = item_count.id
            WHERE item_price_purchase.is_delete = 0
            GROUP BY item_id, item_unit_id
          `),
                    prisma.$queryRawUnsafe(`
            SELECT item.id, item.reference, item.description, item.unit
            FROM item
            WHERE item.is_delete = 0
            AND item.is_active = 1
            AND (item.reference LIKE '%${keyword}%' OR item.description LIKE '%${keyword}%')
            ORDER BY item.reference ASC
            LIMIT ${limit}
            OFFSET	${offset}
          `),
                    prisma.item.count({
                        where: {
                            is_delete: false,
                            is_active: true,
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
        else if (sales) {
            if (keyword == "") {
                return prisma.$transaction([
                    prisma.$queryRaw `
            SELECT item_price.id, item_price.price, item_price.discount, item_price.item_id, item_unit_id, item_unit.unit, item_unit.conversion
            FROM item_price
            LEFT JOIN item_unit ON item_price.item_unit_id = item_unit.id
            JOIN (
              SELECT item.id
              FROM item
              WHERE item.is_delete = 0
              AND item.is_active = 1
              ORDER BY reference ASC
              LIMIT ${limit}
              OFFSET	${offset}
            ) item_count
            ON item_price.item_id = item_count.id
            WHERE item_price.is_delete = 0
            GROUP BY item_id, item_unit_id
          `,
                    prisma.$queryRaw `
            SELECT item.id, item.reference, item.description, item.unit, COALESCE(_stock.stock, 0) AS stock
            FROM item
            LEFT JOIN _stock ON item.id = _stock.item_id
            WHERE item.is_delete = 0
            AND item.is_active = 1
            ORDER BY item.reference ASC
            LIMIT ${limit}
            OFFSET	${offset}
          `,
                    prisma.item.count({
                        where: {
                            is_delete: false,
                            is_active: true,
                        },
                    }),
                ]);
            }
            else {
                return prisma.$transaction([
                    prisma.$queryRawUnsafe(`
            SELECT item_price.id, item_price.price, item_price.discount, item_price.item_id, item_unit_id, item_unit.unit, item_unit.conversion
            FROM item_price
            LEFT JOIN item_unit ON item_price.item_unit_id = item_unit.id
            JOIN (
              SELECT item.id
              FROM item
              WHERE item.is_delete = 0
              AND item.is_active = 1
              AND (item.reference LIKE '%${keyword}%' OR item.description LIKE '%${keyword}%')
              ORDER BY reference ASC
              LIMIT 10
              OFFSET	0
            ) item_count
            ON item_price.item_id = item_count.id
            WHERE item_price.is_delete = 0
            GROUP BY item_id, item_unit_id
          `),
                    prisma.$queryRawUnsafe(`
            SELECT item.id, item.reference, item.description, item.unit, COALESCE(_stock.stock, 0) AS stock
            FROM item
            LEFT JOIN _stock ON item.id = _stock.item_id
            WHERE item.is_delete = 0
            AND item.is_active = 1
            AND (item.reference LIKE '%${keyword}%' OR item.description LIKE '%${keyword}%')
            ORDER BY item.reference ASC
            LIMIT ${limit}
            OFFSET	${offset}
          `),
                    prisma.item.count({
                        where: {
                            is_delete: false,
                            is_active: true,
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
            SELECT item_unit.item_id, item_unit.id, item_unit.unit, item_unit.conversion
            FROM item_unit
            JOIN (
              SELECT item.id
              FROM item
              WHERE item.is_delete = 0
              AND item.is_active = 1
              ORDER BY reference ASC
              LIMIT ${limit}
              OFFSET	${offset}
            ) item_count
            ON item_unit.item_id = item_count.id
            WHERE item_unit.is_delete = 0
          `,
                    prisma.$queryRaw `
            SELECT item.id, item.reference, item.description, item.minimum_stock, item.unit, item_type.name AS item_type_name, item_brand.name AS item_brand_name, item.item_type_id, item.item_brand_id, item.is_active
            FROM item
            JOIN item_brand ON item.item_brand_id = item_brand.id
            JOIN item_type ON item.item_type_id = item_type.id
            WHERE item.is_delete = 0
            ORDER BY reference ASC
            LIMIT ${limit} OFFSET ${offset}
          `,
                    prisma.item.count({
                        where: {
                            is_delete: false,
                        },
                    }),
                ]);
            }
            else {
                return prisma.$transaction([
                    prisma.$queryRawUnsafe(`
            SELECT item_unit.item_id, item_unit.id, item_unit.unit, item_unit.conversion
            FROM item_unit
            JOIN (
              SELECT item.id
              FROM item
              WHERE item.is_delete = 0
              AND item.is_active = 1
              AND (
                item.reference LIKE '%${keyword}%'
                OR item.description LIKE '%${keyword}%'
              )
              ORDER BY reference ASC
              LIMIT ${limit}
              OFFSET	${offset}
            ) item_count
            ON item_unit.item_id = item_count.id
            WHERE item_unit.is_delete = 0
          `),
                    prisma.$queryRawUnsafe(`
            SELECT item.id, item.reference, item.description, item.minimum_stock, item.unit, item_type.name AS item_type_name, item_brand.name AS item_brand_name, item.item_type_id, item.item_brand_id, item.is_active
            FROM item
            JOIN item_brand ON item.item_brand_id = item_brand.id
            JOIN item_type ON item.item_type_id = item_type.id
            WHERE item.is_delete = 0
            AND (
              item.reference LIKE '%${keyword}%'
              OR item.description LIKE '%${keyword}%'
            )
            ORDER BY reference ASC
            LIMIT ${limit} OFFSET ${offset}
          `),
                    prisma.item.count({
                        where: {
                            is_delete: false,
                            is_active: true,
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
    static fetchAll(date) {
        return prisma.item.findMany({
            where: {
                is_delete: false,
            },
            select: {
                id: true,
                reference: true,
                description: true,
                item_brand: {
                    select: {
                        name: true,
                    },
                },
                item_price: {
                    select: {
                        price: true,
                        discount: true,
                        item_unit: {
                            select: {
                                unit: true,
                                conversion: true,
                            },
                        },
                    },
                    where: {
                        is_delete: false,
                        effective_date: {
                            lt: date,
                        },
                    },
                    orderBy: {
                        effective_date: "desc",
                    },
                    take: 1,
                    skip: 0,
                },
                stock: {
                    select: {
                        stock: true,
                    },
                },
            },
            orderBy: {
                reference: "asc",
            },
        });
    }
    static countRelations(id) {
        return prisma.$transaction([
            prisma.bill.count({
                where: {
                    item_id: {
                        in: id,
                    },
                },
            }),
            prisma.good_receipt.count({
                where: {
                    item_id: {
                        in: id,
                    },
                },
            }),
            prisma.adjustment_case.count({
                where: {
                    item_id: {
                        in: id,
                    },
                },
            }),
        ]);
    }
    static delete(id, deleted_by) {
        return prisma.item.update({
            where: {
                id: id,
            },
            data: {
                is_delete: true,
                deleted_at: new Date(),
                deleted_by: deleted_by,
            },
            select: {
                id: true,
                user: {
                    select: {
                        name: true,
                    },
                },
                reference: true,
                description: true,
                deleted_by: true,
                deleted_at: true,
                user_item_deleted_byTouser: {
                    select: {
                        name: true,
                    },
                },
                item_brand_id: true,
            },
        });
    }
    static count() {
        return prisma.item.count({
            where: {
                is_delete: false,
            },
        });
    }
    static countByBrandId(brand_id) {
        return prisma.item.count({
            where: {
                item_brand_id: brand_id,
                is_delete: false,
            },
        });
    }
    static countByBrandIds(brand_ids) {
        return prisma.item.groupBy({
            by: ["item_brand_id"],
            where: {
                item_brand_id: {
                    in: brand_ids,
                },
                is_delete: false,
            },
            _count: true,
        });
    }
    static fetchSoldByDate(date = new Date()) {
        return prisma.$queryRaw `
      SELECT COUNT(DISTINCT(item.id)) AS count
      FROM item
      JOIN bill ON bill.item_id = item.id
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${date.getMonth() + 1} AND DAY(bill_code.date) = ${date.getDate()}
    `;
    }
    static fetchMonthlySoldByDate(date = new Date()) {
        return prisma.$queryRaw `
      SELECT COUNT(DISTINCT(item.id)) AS count
      FROM item
      JOIN bill ON bill.item_id = item.id
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${date.getMonth() + 1}
    `;
    }
    static fetchChartItems(monthly, limit, offset) {
        const date = new Date();
        const start_date = new Date();
        if (monthly) {
            date.setMonth(date.getMonth() - offset);
            start_date.setMonth(date.getMonth() - limit - offset);
            const prev_date = new Date();
            const start_prev_date = new Date();
            prev_date.setMonth(date.getMonth() - offset - 12);
            start_prev_date.setMonth(date.getMonth() - limit - offset - 12);
            return prisma.$transaction([
                prisma.$queryRawUnsafe(`
          SELECT 
          YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, COUNT(bill.item_id) AS count, TIMESTAMPDIFF(MONTH, LAST_DAY(curdate()), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(LAST_DAY(bill_code.date)),2,'00')), '%Y-%m-%d')) AS diff
          FROM item
          JOIN bill ON bill.item_id = item.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND bill_code.date BETWEEN '${start_date.getFullYear().toString()}-${(start_date.getMonth() + 1)
                    .toString()
                    .padStart(2, "0")}-01' AND LAST_DAY('${date
                    .getFullYear()
                    .toString()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-01')
          GROUP BY YEAR(bill_code.date), MONTH(bill_code.date)`),
                prisma.$queryRawUnsafe(`
          SELECT 
          YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, COUNT(bill.item_id) AS count, TIMESTAMPDIFF(MONTH, LAST_DAY(curdate()), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(LAST_DAY(bill_code.date)),2,'00')), '%Y-%m-%d')) AS diff
          FROM item
          JOIN bill ON bill.item_id = item.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND bill_code.date BETWEEN '${start_prev_date
                    .getFullYear()
                    .toString()}-${(start_prev_date.getMonth() + 1)
                    .toString()
                    .padStart(2, "0")}-01' AND LAST_DAY('${prev_date
                    .getFullYear()
                    .toString()}-${(prev_date.getMonth() + 1)
                    .toString()
                    .padStart(2, "0")}-01')
          GROUP BY YEAR(bill_code.date), MONTH(bill_code.date)`),
            ]);
        }
        else {
            date.setDate(date.getDate() - offset);
            start_date.setDate(date.getDate() - limit - offset);
            return prisma.$queryRawUnsafe(`SELECT 
        YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, DAY(bill_code.date) AS day, COUNT(bill.item_id) AS count, datediff(curdate(), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(bill_code.date),2,'00')), '%Y-%m-%d')) AS diff
        FROM item
        JOIN bill ON bill.item_id = item.id
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        WHERE bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
        AND bill_code.date BETWEEN '${start_date.getFullYear().toString()}-${(start_date.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${start_date
                .getDate()
                .toString()
                .padStart(2, "0")}' AND '${date.getFullYear().toString()}-${(date.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}'
        GROUP BY YEAR(bill_code.date), MONTH(bill_code.date), DAY(bill_code.date)`);
        }
    }
    static fetchStockById(id, offset) {
        return prisma.$transaction([
            prisma.$queryRawUnsafe(`CALL stock_card_act_view(${offset}, ${id})`),
            prisma.$queryRawUnsafe(`CALL stock_card_act_count(${id})`),
        ]);
    }
    static fetchFrequentItems(monthly) {
        const date = new Date();
        if (monthly) {
            return prisma.$queryRaw `
        SELECT billCount.quantity, item.reference, item.description, item.unit
        FROM item
        LEFT JOIN (
          SELECT SUM(bill.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, bill.item_id
          FROM bill
          JOIN bill_code
          ON bill.bill_code_id = bill_code.id
          LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${date.getMonth() + 1}
          GROUP BY bill.item_id
        ) billCount
        ON item.id = billCount.item_id
        WHERE billCount.quantity > 0
        ORDER BY billCount.quantity DESC, item.reference ASC
        LIMIT 10
        OFFSET 0
      `;
        }
        else {
            return prisma.$queryRaw `
        SELECT billCount.quantity, item.reference, item.description, item.unit
        FROM item
        LEFT JOIN (
          SELECT SUM(bill.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, bill.item_id
          FROM bill
          JOIN bill_code
          ON bill.bill_code_id = bill_code.id
          LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${date.getMonth() + 1} AND DAY(bill_code.date) = ${date.getDate()}
          GROUP BY bill.item_id
        ) billCount
        ON item.id = billCount.item_id
        WHERE billCount.quantity > 0
        ORDER BY billCount.quantity DESC, item.reference ASC
        LIMIT 10
        OFFSET 0
      `;
        }
    }
    static fetchFrequentItemsByCustomerId(customer_id) {
        if (customer_id == null) {
            return prisma.$queryRaw `
        SELECT billCount.quantity, item.reference, item.description
        FROM item
        LEFT JOIN (
          SELECT SUM(bill.quantity) AS quantity, bill.item_id
          FROM bill
          JOIN bill_code
          ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND bill_code.customer_id = ${customer_id}
          GROUP BY bill.item_id
        ) billCount
        ON item.id = billCount.item_id
        WHERE billCount.quantity > 0
        ORDER BY billCount.quantity DESC, item.reference ASC
        LIMIT 10
        OFFSET 0
      `;
        }
        else {
            return prisma.$queryRaw `
        SELECT billCount.quantity, item.reference, item.description
        FROM item
        LEFT JOIN (
          SELECT SUM(bill.quantity) AS quantity, bill.item_id
          FROM bill
          JOIN bill_code
          ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND bill_code.customer_id IS NULL
          GROUP BY bill.item_id
        ) billCount
        ON item.id = billCount.item_id
        WHERE billCount.quantity > 0
        ORDER BY billCount.quantity DESC, item.reference ASC
        LIMIT 10
        OFFSET 0
      `;
        }
    }
    static fetchSearchByIds(ids) {
        return prisma.item.findMany({
            where: {
                AND: [
                    {
                        is_active: true,
                    },
                    {
                        is_delete: false,
                    },
                    {
                        id: {
                            in: ids,
                        },
                    },
                ],
            },
            select: {
                id: true,
                reference: true,
                description: true,
                unit: true,
                stock: {
                    select: {
                        stock: true,
                    },
                },
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
                item_price: {
                    select: {
                        id: true,
                        price: true,
                        discount: true,
                        item_unit: {
                            select: {
                                id: true,
                                unit: true,
                                conversion: true,
                            },
                        },
                    },
                    where: {
                        is_delete: false,
                    },
                    orderBy: [
                        {
                            item_unit_id: "asc",
                        },
                        {
                            item_unit: {
                                conversion: "asc",
                            },
                        },
                    ],
                },
            },
        });
    }
    static active(item_id, status) {
        return prisma.item.update({
            where: {
                id: item_id,
            },
            data: {
                is_active: status,
            },
        });
    }
    static fetchItemPriceByBrandType(brand_id, type_id, setting) {
        switch (setting) {
            case 0:
                return prisma.item_price.findMany({
                    where: {
                        item: {
                            item_brand_id: {
                                in: brand_id,
                            },
                            item_type_id: {
                                in: type_id,
                            },
                            is_delete: false,
                        },
                        is_delete: false,
                    },
                    select: {
                        id: true,
                        item_id: true,
                        item_unit_id: true,
                        item: {
                            select: {
                                reference: true,
                                description: true,
                                unit: true,
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
                        price: true,
                        discount: true,
                        item_unit: {
                            select: {
                                id: true,
                                unit: true,
                                conversion: true,
                            },
                        },
                    },
                    orderBy: [
                        {
                            item: {
                                reference: "asc",
                            },
                        },
                        {
                            item_unit_id: "asc",
                        },
                    ],
                });
            case 2:
                return prisma.item_price.findMany({
                    where: {
                        item: {
                            item_brand_id: {
                                in: brand_id,
                            },
                            item_type_id: {
                                in: type_id,
                            },
                            is_active: false,
                            is_delete: false,
                        },
                        is_delete: false,
                    },
                    select: {
                        id: true,
                        item_id: true,
                        item_unit_id: true,
                        item: {
                            select: {
                                reference: true,
                                description: true,
                                unit: true,
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
                        price: true,
                        discount: true,
                        item_unit: {
                            select: {
                                id: true,
                                unit: true,
                                conversion: true,
                            },
                        },
                    },
                    orderBy: [
                        {
                            item: {
                                reference: "asc",
                            },
                        },
                        {
                            item_unit_id: "asc",
                        },
                    ],
                });
            default:
                return prisma.item_price.findMany({
                    where: {
                        item: {
                            item_brand_id: {
                                in: brand_id,
                            },
                            item_type_id: {
                                in: type_id,
                            },
                            is_active: true,
                            is_delete: false,
                        },
                        is_delete: false,
                    },
                    select: {
                        id: true,
                        item_id: true,
                        item_unit_id: true,
                        item: {
                            select: {
                                reference: true,
                                description: true,
                                unit: true,
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
                        price: true,
                        discount: true,
                        item_unit: {
                            select: {
                                id: true,
                                unit: true,
                                conversion: true,
                            },
                        },
                    },
                    orderBy: [
                        {
                            item: {
                                reference: "asc",
                            },
                        },
                        {
                            item_unit_id: "asc",
                        },
                    ],
                });
        }
    }
    static fetchItemPurchasePriceByBrandType(brand_id, type_id, setting) {
        switch (setting) {
            case 0:
                return prisma.item_price_purchase.findMany({
                    where: {
                        item: {
                            item_brand_id: {
                                in: brand_id,
                            },
                            item_type_id: {
                                in: type_id,
                            },
                            is_delete: false,
                        },
                        is_delete: false,
                    },
                    select: {
                        id: true,
                        item_id: true,
                        item_unit_id: true,
                        item: {
                            select: {
                                reference: true,
                                description: true,
                                unit: true,
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
                        price: true,
                        item_unit: {
                            select: {
                                unit: true,
                                conversion: true,
                            },
                        },
                    },
                    orderBy: [
                        {
                            item: {
                                reference: "asc",
                            },
                        },
                        {
                            item_unit_id: "asc",
                        },
                    ],
                });
            case 2:
                return prisma.item_price_purchase.findMany({
                    where: {
                        item: {
                            item_brand_id: {
                                in: brand_id,
                            },
                            item_type_id: {
                                in: type_id,
                            },
                            is_active: false,
                            is_delete: false,
                        },
                        is_delete: false,
                    },
                    select: {
                        id: true,
                        item_id: true,
                        item_unit_id: true,
                        item: {
                            select: {
                                reference: true,
                                description: true,
                                unit: true,
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
                        price: true,
                        item_unit: {
                            select: {
                                unit: true,
                                conversion: true,
                            },
                        },
                    },
                    orderBy: [
                        {
                            item: {
                                reference: "asc",
                            },
                        },
                        {
                            item_unit_id: "asc",
                        },
                    ],
                });
            default:
                return prisma.item_price_purchase.findMany({
                    where: {
                        item: {
                            item_brand_id: {
                                in: brand_id,
                            },
                            item_type_id: {
                                in: type_id,
                            },
                            is_active: true,
                            is_delete: false,
                        },
                        is_delete: false,
                    },
                    select: {
                        id: true,
                        item_id: true,
                        item_unit_id: true,
                        item: {
                            select: {
                                reference: true,
                                description: true,
                                unit: true,
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
                        price: true,
                        item_unit: {
                            select: {
                                unit: true,
                                conversion: true,
                            },
                        },
                    },
                    orderBy: [
                        {
                            item: {
                                reference: "asc",
                            },
                        },
                        {
                            item_unit_id: "asc",
                        },
                    ],
                });
        }
    }
    static fetchByItemUnitIds(items) {
        return prisma.item_price.findMany({
            where: {
                OR: items,
                is_delete: false,
            },
            select: {
                id: true,
                price: true,
                discount: true,
                item_id: true,
                item_unit_id: true,
                item_unit: {
                    select: {
                        unit: true,
                        conversion: true,
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
            },
        });
    }
    static fetchInputByBrandType(brand_id, type_id, startDate, endDate) {
        const formatted_start_date = `${startDate.getFullYear().toString()}-${(startDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${startDate.getDate().toString().padStart(2, "0")}`;
        const formatted_end_date = `${endDate.getFullYear().toString()}-${(endDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${endDate.getDate().toString().padStart(2, "0")}`;
        return prisma.good_receipt.findMany({
            where: {
                AND: [
                    {
                        good_receipt_code: {
                            date: {
                                gte: new Date(formatted_start_date),
                            },
                        },
                    },
                    {
                        good_receipt_code: {
                            date: {
                                lte: new Date(formatted_end_date),
                            },
                        },
                    },
                    {
                        good_receipt_code: {
                            is_confirm: true,
                        },
                    },
                ],
                item: {
                    item_brand_id: {
                        in: brand_id,
                    },
                    item_type_id: {
                        in: type_id,
                    },
                },
            },
            select: {
                quantity: true,
                item_unit: {
                    select: {
                        unit: true,
                        conversion: true,
                    },
                },
                good_receipt_code: {
                    select: {
                        date: true,
                    },
                },
                item: {
                    select: {
                        unit: true,
                        item_brand_id: true,
                        item_type_id: true,
                        id: true,
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
            },
            orderBy: {
                good_receipt_code: {
                    date: "asc",
                },
            },
        });
    }
    static fetchOutputByBrandType(brand_id, type_id, startDate, endDate) {
        const formatted_start_date = `${startDate.getFullYear().toString()}-${(startDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${startDate.getDate().toString().padStart(2, "0")}`;
        const formatted_end_date = `${endDate.getFullYear().toString()}-${(endDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${endDate.getDate().toString().padStart(2, "0")}`;
        return prisma.bill.findMany({
            where: {
                AND: [
                    {
                        bill_code: {
                            date: {
                                gte: new Date(formatted_start_date),
                            },
                        },
                    },
                    {
                        bill_code: {
                            date: {
                                lte: new Date(formatted_end_date),
                            },
                        },
                    },
                    {
                        bill_code: {
                            is_confirm: true,
                        },
                    },
                ],
                item: {
                    item_brand_id: {
                        in: brand_id,
                    },
                    item_type_id: {
                        in: type_id,
                    },
                },
            },
            select: {
                quantity: true,
                item_unit: {
                    select: {
                        unit: true,
                        conversion: true,
                    },
                },
                bill_code: {
                    select: {
                        date: true,
                    },
                },
                item: {
                    select: {
                        unit: true,
                        item_brand_id: true,
                        item_type_id: true,
                        id: true,
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
                sales_return: {
                    select: {
                        quantity: true,
                    },
                    where: {
                        sales_return_code: {
                            is_confirm: true,
                            is_delete: false,
                        },
                    },
                },
            },
            orderBy: {
                bill_code: {
                    date: "asc",
                },
            },
        });
    }
    static fetchValueByBrandType(brand, type, month, year) {
        const start_date = new Date(year, month - 1, 1);
        const end_date = new Date(year, month, 1);
        return prisma.$transaction([
            prisma.$queryRawUnsafe(`
        SELECT item.id, item.reference, item.description, item_brand.name AS item_brand_name, item_type.name AS item_type_name, item.unit, item.item_brand_id, item.item_type_id, SUM(stock_card_act.quantity) AS quantity
        FROM item
        JOIN item_brand ON item.item_brand_id = item_brand.id
        JOIN item_type ON item.item_type_id = item_type.id
        LEFT JOIN stock_card_act ON item.id = stock_card_act.item_id
        WHERE item_brand.id IN (${brand.join(",")}) AND item_type.id IN (${type.join(",")})
        AND item.is_delete = 0
        GROUP BY item.id
        ORDER BY item.reference ASC
        
      `),
            prisma.$queryRawUnsafe(`
        SELECT item.id, SUM(CASE WHEN stock_card_act.quantity < 0 THEN stock_card_act.quantity ELSE 0 END) AS negativeQuantity, 
        SUM(CASE WHEN stock_card_act.quantity > 0 THEN stock_card_act.quantity ELSE 0 END) AS positiveQuantity
        FROM stock_card_act
        JOIN item ON stock_card_act.item_id = item.id
        WHERE item.item_brand_id IN (${brand.join(",")}) AND item.item_type_id IN (${type.join(",")}) AND stock_card_act.date >= '${start_date.toISOString()}' 
      AND stock_card_act.date < '${end_date.toISOString()}'
      AND item.is_delete = 0
      GROUP BY stock_card_act.item_id`),
            prisma.$queryRawUnsafe(`
          SELECT item.id, SUM(quantity) AS quantity
          FROM item
          LEFT JOIN stock_card_act ON item.id = stock_card_act.item_id
          WHERE item.item_brand_id IN (${brand.join(",")}) AND item.item_type_id IN (${type.join(",")}) AND stock_card_act.date < '${start_date.toISOString()}'
      AND item.is_delete = 0
          GROUP BY item.id
      `),
            prisma.item_brand.findMany({
                where: {
                    id: {
                        in: brand,
                    },
                },
            }),
            prisma.item_type.findMany({
                where: {
                    id: {
                        in: type,
                    },
                },
            }),
        ]);
    }
    static fetchMinusStock(keyword, offset, limit) {
        return prisma.$transaction([
            prisma.item.findMany({
                where: {
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
                select: {
                    id: true,
                    reference: true,
                    description: true,
                    item_type: {
                        select: {
                            name: true,
                        },
                    },
                    item_brand: {
                        select: {
                            name: true,
                        },
                    },
                    unit: true,
                    stock: true,
                },
                orderBy: {
                    reference: "asc",
                },
                take: limit,
                skip: offset,
            }),
            prisma.item.count({
                where: {
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
    static downloadMinusStock() {
        return prisma.item.findMany({
            where: {
                stock: {
                    stock: {
                        lt: 0,
                    },
                },
            },
            select: {
                id: true,
                reference: true,
                description: true,
                item_type: {
                    select: {
                        name: true,
                    },
                },
                item_brand: {
                    select: {
                        name: true,
                    },
                },
                unit: true,
                stock: true,
            },
            orderBy: {
                reference: "asc",
            },
        });
    }
    static fetchCompleteByIDs(ids) {
        return prisma.$transaction([
            prisma.item.findMany({
                where: {
                    id: {
                        in: ids,
                    },
                },
                select: {
                    id: true,
                    reference: true,
                    description: true,
                    item_type: {
                        select: {
                            name: true,
                        },
                    },
                    item_brand: {
                        select: {
                            name: true,
                        },
                    },
                    unit: true,
                    stock: true,
                    item_price: {
                        select: {
                            price: true,
                            item_unit: {
                                select: {
                                    id: true,
                                    unit: true,
                                    conversion: true,
                                },
                            },
                        },
                        where: {
                            is_delete: false,
                        },
                    },
                },
            }),
            prisma.$queryRawUnsafe(`
        SELECT SUM(quantity * COALESCE(item_unit.conversion, 1)) AS quantity, draft_bill.item_id
        FROM draft_bill
        JOIN draft_bill_code ON draft_bill.draft_bill_code_id = draft_bill_code.id
        LEFT JOIN item_unit ON draft_bill.item_unit_id = item_unit.id
        WHERE draft_bill.item_id IN (${ids.join(",")})
        AND draft_bill_code.is_delete = 0
        GROUP BY draft_bill.item_id
      `),
        ]);
    }
}
exports.ItemModel = ItemModel;
