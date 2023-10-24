"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fetch_interface_1 = require("../interface/fetch.interface");
const prisma = new client_1.PrismaClient();
class PaymentMethodModel {
    /**
     * Create payment method
     * @param data
     * @returns
     */
    static create(data) {
        return prisma.payment_method.create({
            data: {
                name: data.name,
                description: data.description,
                created_at: new Date(),
                created_by: data.created_by,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    /**
     * Update payment method
     * @param data
     */
    static update(data) {
        return prisma.payment_method.update({
            where: {
                id: data.id,
            },
            data: {
                name: data.name,
                description: data.description,
                updated_at: new Date(),
                updated_by: data.created_by,
            },
            include: {
                user_payment_method_updated_byTouser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    /**
     * Fetch payment method
     * @param keyword
     * @param offset
     * @param limit
     * @param mode
     */
    static fetch(keyword, offset, limit, mode) {
        if (mode == fetch_interface_1.fetchMode.All) {
            return prisma.payment_method.findMany({
                where: {
                    is_delete: false,
                },
                select: {
                    name: true,
                    description: true,
                    id: true,
                },
                orderBy: {
                    name: "asc",
                },
            });
        }
        else if (mode == fetch_interface_1.fetchMode.Autocomplete) {
            if (keyword == "") {
                return prisma.payment_method.findMany({
                    where: {
                        is_delete: false,
                    },
                    orderBy: {
                        name: "asc",
                    },
                    take: limit,
                    skip: offset,
                });
            }
            else {
                return prisma.payment_method.findMany({
                    where: {
                        is_delete: false,
                        OR: [
                            {
                                name: {
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
                    orderBy: {
                        name: "asc",
                    },
                    take: 5,
                    skip: 0,
                });
            }
        }
        else if (mode == fetch_interface_1.fetchMode.Pagination) {
            if (keyword == "") {
                return prisma.$transaction([
                    prisma.$queryRaw `
            SELECT payment_method.id, payment_method.name, 
            payment_method.description, 
            IF(COALESCE(countPaymentMethod.count, 0) = 0, "1", "0") AS can_delete
            FROM payment_method
            LEFT JOIN (
              SELECT COUNT(id) AS count, payment_method_id
              FROM bill_code
              WHERE bill_code.is_delete = 0
              group by payment_method_id
            ) countPaymentMethod ON countPaymentMethod.payment_method_id = payment_method.id
            WHERE payment_method.is_delete = 0
            order by payment_method.name asc
            limit ${limit} 
            offset ${offset}
          `,
                    prisma.payment_method.count({
                        where: {
                            is_delete: false,
                        },
                    }),
                ]);
            }
            else {
                return prisma.$transaction([
                    prisma.$queryRawUnsafe(`
            SELECT payment_method.id, payment_method.name, 
            payment_method.description, 
            IF(COALESCE(countPaymentMethod.count, 0) = 0, TRUE, FALSE) AS can_delete
            FROM payment_method
            LEFT JOIN (
              SELECT COUNT(id) AS count, payment_method_id
              FROM bill_code
              WHERE bill_code.is_delete = 0
              group by payment_method_id
            ) countPaymentMethod ON countPaymentMethod.payment_method_id = payment_method.id
            WHERE payment_method.is_delete = 0
            AND (payment_method.name LIKE '%${keyword}%' OR payment_method.description LIKE '%${keyword}%')
            order by payment_method.name asc
            limit ${limit} 
            offset ${offset}
          `),
                    prisma.payment_method.count({
                        where: {
                            is_delete: false,
                            OR: [
                                {
                                    name: {
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
    static fetchByID(id) {
        return prisma.$queryRaw `
      SELECT payment_method.id, payment_method.name, 
      payment_method.description, 
      IF(COALESCE(countPaymentMethod.count, 0) = 0, "1", "0") AS can_delete
      FROM payment_method
      LEFT JOIN (
        SELECT COUNT(id) AS count, payment_method_id
        FROM bill_code
        WHERE bill_code.is_delete = 0
        AND payment_method_id = ${id}
      ) countPaymentMethod ON countPaymentMethod.payment_method_id = payment_method.id
      WHERE payment_method.id = ${id}
    `;
    }
    static delete(id, created_by) {
        return prisma.payment_method.update({
            where: {
                id: id,
            },
            data: {
                deleted_at: new Date(),
                deleted_by: created_by,
                is_delete: true,
            },
            include: {
                user_payment_method_deleted_byTouser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
}
exports.default = PaymentMethodModel;
//# sourceMappingURL=payment-method.model.js.map