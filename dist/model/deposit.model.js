"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
class DepositModel {
    /**
     * Generate bill code name based on date
     * @param date
     * @returns string
     */
    static generateName(date = new Date()) {
        return `DPS-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
    }
    static create(data) {
        return app_1.prisma.deposit_code.create({
            data: {
                name: data.name,
                customer_id: data.customer_id,
                created_by: data.created_by,
                discount: data.discount,
                delivery: data.delivery,
                service: data.service,
                date: data.date,
                uuid: data.uuid,
                deposit: {
                    createMany: {
                        data: data.items,
                    },
                },
                deposit_payment: {
                    create: data.payments,
                },
            },
        });
    }
    /**
     * Count current active deposit
     */
    static countActive() {
        return app_1.prisma.deposit_code.count({
            where: {
                is_delete: false,
            },
        });
    }
    /**
     * Fetch deposit detail by ID
     */
    static fetchByID(id) {
        return app_1.prisma.deposit_code.findUnique({
            where: {
                id: id,
            },
            select: {
                id: true,
                customer_id: true,
                name: true,
                date: true,
                discount: true,
                delivery: true,
                service: true,
                deposit: {
                    select: {
                        id: true,
                        item: {
                            select: {
                                id: true,
                                reference: true,
                                description: true,
                                unit: true,
                            },
                        },
                        item_unit: {
                            select: {
                                unit: true,
                                conversion: true,
                            },
                        },
                        package_code_id: true,
                        package_code: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                package_content: {
                                    select: {
                                        item_id: true,
                                        item: {
                                            select: {
                                                reference: true,
                                                description: true,
                                                unit: true,
                                            },
                                        },
                                        item_unit: {
                                            select: {
                                                unit: true,
                                                conversion: true,
                                            },
                                        },
                                        quantity: true,
                                    },
                                },
                            },
                        },
                        quantity: true,
                        price: true,
                        discount: true,
                        item_unit_id: true,
                        item_id: true,
                    },
                },
                deposit_payment: {
                    select: {
                        id: true,
                        value: true,
                        date: true,
                        payment_method_id: true,
                        payment_method: {
                            select: {
                                name: true,
                                description: true,
                            },
                        },
                    },
                },
                user_bill_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                is_delete: true,
                created_at: true,
                customer: {
                    select: {
                        name: true,
                        address: true,
                    },
                },
            },
        });
    }
    /**
     * Fetch deposit
     */
    static fetch(keyword, page) {
        return app_1.prisma.$transaction([
            app_1.prisma.$queryRawUnsafe(`
        SELECT deposit_code.id, deposit_code.date, deposit_code.name,
        COALESCE(customer.name, 'Retail customer') AS customer_name, 
        deposit_code.customer_id, b.value, COALESCE(pm.value, 0) AS payment
        FROM deposit_code
        LEFT JOIN customer ON deposit_code.customer_id = customer.id
        LEFT JOIN (
            SELECT SUM(deposit.quantity * (deposit.price - deposit.discount)) AS value,
            deposit.deposit_code_id
            FROM deposit
            WHERE deposit.is_delete = 0
            GROUP BY deposit.deposit_code_id
        ) AS b
        ON deposit_code.id = b.deposit_code_id
        LEFT JOIN (
            SELECT SUM(deposit_payment.value) AS value, deposit_payment.deposit_code_id
            FROM deposit_payment
            GROUP BY deposit_payment.deposit_code_id
        ) AS pm
        ON pm.deposit_code_id = deposit_code.id
        WHERE deposit_code.is_delete = 0 
        AND (deposit_code.name LIKE '%${keyword}%'
        OR COALESCE(customer.name, 'Retail customer') LIKE '%${keyword}%')
        ORDER BY date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}
    `),
            app_1.prisma.deposit_code.count({
                where: {
                    is_delete: false,
                },
            }),
        ]);
    }
    /**
     * Fetch bill code and group them by year
     * @param mode
     * @returns AnnualArchive[]
     */
    static fetchArchiveYears(mode) {
        switch (mode) {
            case 1:
                return app_1.prisma.$queryRaw `
            SELECT DISTINCT(YEAR(deposit_code.date)) AS year, COUNT(id) AS count
            FROM deposit_code
            WHERE deposit_code.is_delete = 1
            GROUP BY YEAR(deposit_code.date)
        `;
            case 2:
                return app_1.prisma.$queryRaw `
            SELECT DISTINCT(YEAR(deposit_code.date)) AS year, COUNT(id) AS count
            FROM deposit_code
            WHERE deposit_code.is_delete = 0
            GROUP BY YEAR(deposit_code.date)
        `;
            case 0:
            default:
                return app_1.prisma.$queryRaw `
            SELECT DISTINCT(YEAR(deposit_code.date)) AS year, COUNT(id) AS count
            FROM deposit_code
            GROUP BY YEAR(deposit_code.date)
        `;
        }
    }
    /**
     * Fetch monthly archive
     * @param year
     * @returns  MonthlyArchive[]
     */
    static fetchArchiveMonths(year, mode) {
        switch (mode) {
            case 1:
                return app_1.prisma.$queryRaw `
            SELECT DISTINCT(MONTH(deposit_code.date)) AS month, 
            YEAR(deposit_code.date) AS year,
            COUNT(id) AS count
            FROM deposit_code
            WHERE YEAR(deposit_code.date) = ${year}
            AND deposit_code.is_delete = 1
            GROUP BY MONTH(deposit_code.date)
        `;
                break;
            case 2:
                return app_1.prisma.$queryRaw `
            SELECT DISTINCT(MONTH(deposit_code.date)) AS month, 
            YEAR(deposit_code.date) AS year,
            COUNT(id) AS count
            FROM deposit_code
            WHERE YEAR(deposit_code.date) = ${year}
            AND deposit_code.is_delete = 0
            GROUP BY MONTH(deposit_code.date)
        `;
                break;
            case 0:
            default:
                return app_1.prisma.$queryRaw `
            SELECT DISTINCT(MONTH(deposit_code.date)) AS month, 
            YEAR(deposit_code.date) AS year,
            COUNT(id) AS count
            FROM deposit_code
            WHERE YEAR(deposit_code.date) = ${year}
            GROUP BY MONTH(deposit_code.date)
        `;
                break;
        }
    }
    /**
     * Fetch archive by year and month
     * @param IFetchArchiveBill
     * @returns Promise<BillArchive[]>
     */
    static fetchArchive(data) {
        switch (data.mode) {
            case 0:
                return app_1.prisma.$transaction([
                    app_1.prisma.$queryRawUnsafe(`
            SELECT deposit_code.id, deposit_code.date, deposit_code.name,
            COALESCE(customer.name, 'Retail customer') AS customer_name, 
            deposit_code.customer_id, b.value, COALESCE(pm.value, 0) AS payment
            FROM deposit_code
            LEFT JOIN customer ON deposit_code.customer_id = customer.id
            LEFT JOIN (
                SELECT SUM(deposit.quantity * (deposit.price - deposit.discount)) AS value,
                deposit.deposit_code_id
                FROM deposit
                GROUP BY deposit.deposit_code_id
            ) AS b
            ON deposit_code.id = b.deposit_code_id
            LEFT JOIN (
                SELECT SUM(deposit_payment.value) AS value, deposit_payment.deposit_code_id
                FROM deposit_payment
                GROUP BY deposit_payment.deposit_code_id
            ) AS pm
            ON pm.deposit_code_id = deposit_code.id
            WHERE YEAR(deposit_code.date) = ${data.year} AND MONTH(deposit_code.date) = ${data.month + 1}
            ${data.keyword == null
                        ? ""
                        : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                OR COALESCE(customer.name, 'Retail customer') 
                LIKE '%${data.keyword}%')`}
            ORDER BY date ASC
            LIMIT ${data.limit}
            OFFSET ${data.offset}
          `),
                    app_1.prisma.$queryRawUnsafe(`
            SELECT COUNT(deposit_code.id) AS count 
            FROM deposit_code
            LEFT JOIN customer ON deposit_code.customer_id = customer.id
            WHERE YEAR(deposit_code.date) = ${data.year} AND MONTH(deposit_code.date) = ${data.month + 1}
            ${data.keyword == null
                        ? ""
                        : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                OR COALESCE(customer.name, 'Retail customer') 
                LIKE '%${data.keyword}%')`}
          `),
                ]);
            case 1:
                return app_1.prisma.$transaction([
                    app_1.prisma.$queryRawUnsafe(`
              SELECT deposit_code.id, deposit_code.date, deposit_code.name,
              COALESCE(customer.name, 'Retail customer') AS customer_name, 
              deposit_code.customer_id, b.value, COALESCE(pm.value, 0) AS payment
              FROM deposit_code
              LEFT JOIN customer ON deposit_code.customer_id = customer.id
              LEFT JOIN (
                  SELECT SUM(deposit.quantity * (deposit.price - deposit.discount)) AS value,
                  deposit.deposit_code_id
                  FROM deposit
                  GROUP BY deposit.deposit_code_id
              ) AS b
              ON deposit_code.id = b.deposit_code_id
              LEFT JOIN (
                  SELECT SUM(deposit_payment.value) AS value, deposit_payment.deposit_code_id
                  FROM deposit_payment
                  GROUP BY deposit_payment.deposit_code_id
              ) AS pm
              ON pm.deposit_code_id = deposit_code.id
              WHERE YEAR(deposit_code.date) = ${data.year} AND MONTH(deposit_code.date) = ${data.month + 1}
              AND deposit_code.is_delete = 1
              ${data.keyword == null
                        ? ""
                        : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                  OR COALESCE(customer.name, 'Retail customer') 
                  LIKE '%${data.keyword}%')`}
              ORDER BY date ASC
              LIMIT ${data.limit}
              OFFSET ${data.offset}
            `),
                    app_1.prisma.$queryRawUnsafe(`
              SELECT COUNT(deposit_code.id) AS count 
              FROM deposit_code
              LEFT JOIN customer ON deposit_code.customer_id = customer.id
              WHERE YEAR(deposit_code.date) = ${data.year} AND deposit_code.is_delete = 1
              AND MONTH(deposit_code.date) = ${data.month + 1}
              ${data.keyword == null
                        ? ""
                        : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                  OR COALESCE(customer.name, 'Retail customer') 
                  LIKE '%${data.keyword}%')`}
            `),
                ]);
            case 2:
                return app_1.prisma.$transaction([
                    app_1.prisma.$queryRawUnsafe(`
                SELECT deposit_code.id, deposit_code.date, deposit_code.name,
                COALESCE(customer.name, 'Retail customer') AS customer_name, 
                deposit_code.customer_id, b.value, COALESCE(pm.value, 0) AS payment
                FROM deposit_code
                LEFT JOIN customer ON deposit_code.customer_id = customer.id
                LEFT JOIN (
                    SELECT SUM(deposit.quantity * (deposit.price - deposit.discount)) AS value,
                    deposit.deposit_code_id
                    FROM deposit
                    GROUP BY deposit.deposit_code_id
                ) AS b
                ON deposit_code.id = b.deposit_code_id
                LEFT JOIN (
                    SELECT SUM(deposit_payment.value) AS value, deposit_payment.deposit_code_id
                    FROM deposit_payment
                    GROUP BY deposit_payment.deposit_code_id
                ) AS pm
                ON pm.deposit_code_id = deposit_code.id
                WHERE YEAR(deposit_code.date) = ${data.year} AND MONTH(deposit_code.date) = ${data.month + 1}
                AND deposit_code.is_delete = 0
                ${data.keyword == null
                        ? ""
                        : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                    OR COALESCE(customer.name, 'Retail customer') 
                    LIKE '%${data.keyword}%')`}
                ORDER BY date ASC
                LIMIT ${data.limit}
                OFFSET ${data.offset}
              `),
                    app_1.prisma.$queryRawUnsafe(`
                SELECT COUNT(deposit_code.id) AS count 
                FROM deposit_code
                LEFT JOIN customer ON deposit_code.customer_id = customer.id
                WHERE YEAR(deposit_code.date) = ${data.year} AND deposit_code.is_delete = 0
                AND MONTH(deposit_code.date) = ${data.month + 1}
                ${data.keyword == null
                        ? ""
                        : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                    OR COALESCE(customer.name, 'Retail customer') 
                    LIKE '%${data.keyword}%')`}
              `),
                ]);
        }
    }
    static confirmByID(data) {
        return app_1.prisma.deposit_code.update({
            where: {
                id: data.id,
            },
            data: {
                is_delete: true,
                deposit: {
                    updateMany: {
                        data: {
                            is_delete: true,
                        },
                        where: {
                            is_delete: false,
                        },
                    },
                },
            },
        });
    }
    static deleteByID(id) {
        return app_1.prisma.deposit_code.update({
            where: {
                id: id,
            },
            data: {
                is_delete: true,
                deposit: {
                    updateMany: {
                        data: {
                            is_delete: true,
                        },
                        where: {
                            is_delete: false,
                        },
                    },
                },
            },
        });
    }
}
exports.default = DepositModel;
//# sourceMappingURL=deposit.model.js.map