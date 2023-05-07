"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PaymentMethodModel {
    constructor(name, description, created_by, id = null) {
        if (id != null) {
            this.id = id;
        }
        this.name = name;
        this.description = description;
        this.created_by = created_by;
        this.created_at = new Date();
    }
    create() {
        return prisma.payment_method.create({
            data: {
                name: this.name,
                description: this.description,
                created_at: new Date(),
                created_by: this.created_by,
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
    update() {
        return prisma.payment_method.update({
            where: {
                id: this.id,
            },
            data: {
                name: this.name,
                description: this.description,
                updated_at: this.created_at,
                updated_by: this.created_by,
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
    static fetch(keyword, offset, limit) {
        if (keyword == "") {
            return prisma.$transaction([
                prisma.$queryRaw `
          SELECT payment_method.id, payment_method.name, payment_method.description, COALESCE(countPaymentMethod.count, 0) AS count
          FROM payment_method
          LEFT JOIN (
            SELECT COUNT(id) AS count, payment_method_id
            FROM bill_code
            WHERE bill_code.is_delete = 0
            group by payment_method_id
          ) countPaymentMethod ON countPaymentMethod.payment_method_id = payment_method.id
          WHERE payment_method.is_delete = 0
          order by payment_method.name asc
          limit ${limit} offset ${offset}
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
          SELECT payment_method.id, payment_method.name, payment_method.description, COALESCE(countPaymentMethod.count, 0) AS count
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
          limit ${limit} offset ${offset}
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
    static fetchAll() {
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
    static fetchAutocomplete(keyword) {
        if (keyword == "") {
            return prisma.payment_method.findMany({
                where: {
                    is_delete: false,
                },
                orderBy: {
                    name: "asc",
                },
                take: 5,
                skip: 0,
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
    static fetchById(id) {
        return prisma.$queryRaw `
      SELECT payment_method.id, payment_method.name, payment_method.description, COALESCE(countPaymentMethod.count, 0) AS count
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
