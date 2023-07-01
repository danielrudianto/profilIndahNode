"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraftBillModel = void 0;
const client_1 = require("@prisma/client");
const moment_1 = __importDefault(require("moment"));
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
class DraftBillModel {
    constructor(customer_id, note, items, created_by, name, service, delivery) {
        this.created_by = created_by;
        this.customer_id = customer_id;
        this.items = items;
        this.note = note;
        this.name = name;
        this.service = service;
        this.delivery = delivery;
    }
    create() {
        return prisma.draft_bill_code.create({
            data: {
                name: this.name,
                delivery: this.delivery,
                service: this.service,
                note: this.note,
                created_at: new Date(),
                created_by: this.created_by,
                customer_id: this.customer_id,
                draft_bill: {
                    createMany: {
                        data: this.items.map((x) => {
                            return {
                                item_id: x.item_id,
                                quantity: x.quantity,
                                price: x.price,
                                discount: 0,
                                item_unit_id: x.item_unit_id,
                            };
                        }),
                    },
                },
            },
            select: {
                id: true,
                note: true,
                name: true,
                created_at: true,
                user_draft_bill_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                customer: {
                    select: {
                        name: true,
                        address: true,
                        npwp: true,
                        phone_number: true,
                        id: true,
                    },
                },
                delivery: true,
                service: true,
                draft_bill: {
                    select: {
                        item: {
                            select: {
                                reference: true,
                                description: true,
                                unit: true,
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
                            },
                        },
                        item_unit: {
                            select: {
                                conversion: true,
                                unit: true,
                            },
                        },
                        quantity: true,
                        price: true,
                        discount: true,
                    },
                },
            },
        });
    }
    static fetchByID(id) {
        return prisma.draft_bill_code.findUnique({
            where: {
                id: id,
            },
            include: {
                user_draft_bill_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                customer: {
                    select: {
                        name: true,
                        address: true,
                        phone_number: true,
                        pic: true,
                    },
                },
                draft_bill: {
                    select: {
                        id: true,
                        price: true,
                        discount: true,
                        quantity: true,
                        item_id: true,
                        item_unit_id: true,
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
                    },
                },
            },
        });
    }
    static fetchUnconfirmed(page = 1, keyword) {
        if (keyword == "") {
            return prisma.$transaction([
                prisma.$queryRawUnsafe(`
        SELECT draft_bill_code.id, draft_bill_code.name, draft_bill_code.created_at, user.name as created_by, customer.name as customer_name, total.total
        FROM draft_bill_code
        INNER JOIN user ON draft_bill_code.created_by = user.id
        LEFT JOIN customer ON draft_bill_code.customer_id = customer.id
        JOIN (
          SELECT SUM(draft_bill.quantity * draft_bill.price) as total, draft_bill.draft_bill_code_id
          FROM draft_bill
          GROUP BY draft_bill.draft_bill_code_id
        ) as total 
        ON total.draft_bill_code_id = draft_bill_code.id
        WHERE draft_bill_code.is_delete = 0
        ORDER BY draft_bill_code.id DESC
        LIMIT 10 OFFSET ${(page - 1) * 10}
      `),
                prisma.draft_bill_code.count({
                    where: {
                        is_delete: false,
                    },
                }),
            ]);
        }
        else {
            return prisma.$transaction([
                prisma.$queryRawUnsafe(`
        SELECT draft_bill_code.id, draft_bill_code.name, draft_bill_code.created_at, user.name as created_by, customer.name as customer_name, total.total
        FROM draft_bill_code
        INNER JOIN user ON draft_bill_code.created_by = user.id
        LEFT JOIN customer ON draft_bill_code.customer_id = customer.id
        JOIN (
          SELECT SUM(draft_bill.quantity * draft_bill.price) as total, draft_bill.draft_bill_code_id
          FROM draft_bill
          GROUP BY draft_bill.draft_bill_code_id
        ) as total 
        ON total.draft_bill_code_id = draft_bill_code.id
        WHERE draft_bill_code.is_delete = 0
        AND draft_bill_code.name LIKE '%${keyword}%'
        OR customer.name LIKE '%${keyword}%'
        ORDER BY draft_bill_code.id DESC
        LIMIT 10 OFFSET ${(page - 1) * 10}
      `),
                prisma.draft_bill_code.count({
                    where: {
                        is_delete: false,
                        OR: [
                            {
                                name: {
                                    contains: keyword,
                                },
                            },
                            {
                                customer: {
                                    name: {
                                        contains: keyword,
                                    },
                                },
                            },
                        ],
                    },
                }),
            ]);
        }
    }
    static confirm(id, name, date, customer_id, payment_method_id, service, delivery, discount, items, userID) {
        return prisma.$transaction([
            prisma.draft_bill_code.update({
                where: {
                    id: id,
                },
                data: {
                    is_delete: true,
                    confirmed_at: new Date(),
                    confirmed_by: userID,
                },
            }),
            prisma.bill_code.create({
                data: {
                    name: name,
                    date: new Date((0, moment_1.default)(date).format("YYYY-MM-DD")),
                    customer_id: customer_id,
                    payment_method_id: payment_method_id,
                    service: service,
                    delivery: delivery,
                    discount: discount,
                    uuid: (0, uuid_1.v4)(),
                    created_at: new Date(),
                    created_by: userID,
                    is_confirm: true,
                    confirmed_at: new Date(),
                    confirmed_by: userID,
                    bill: {
                        createMany: {
                            data: items.map((x) => {
                                return {
                                    item_id: x.item_id,
                                    quantity: x.quantity,
                                    price: x.price,
                                    discount: x.discount,
                                    item_unit_id: x.item_unit_id,
                                };
                            }),
                        },
                    },
                },
            }),
        ]);
    }
    static delete(id, userID) {
        return prisma.draft_bill_code.update({
            where: {
                id: id,
            },
            data: {
                is_delete: true,
                confirmed_at: new Date(),
                confirmed_by: userID,
            },
        });
    }
    static fetchArchiveYears(mode) {
        if (mode == 0) {
            return prisma.$queryRaw `
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
        }
        else if (mode == 1) {
            return prisma.$queryRaw `
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.is_delete = 1
      AND draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
        }
        else if (mode == 2) {
            return prisma.$queryRaw `
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.is_delete = 0
      AND draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
        }
    }
    static fetchArchiveMonths(year, mode) {
        if (mode == 0) {
            return prisma.$queryRaw `
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
        }
        else if (mode == 1) {
            return prisma.$queryRaw `
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      AND draft_bill_code.is_delete = 1
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
        }
        else if (mode == 2) {
            return prisma.$queryRaw `
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      AND draft_bill_code.is_delete = 0
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
        }
    }
    static fetchArchive(year, month, page, mode) {
        if (mode == 0) {
            return prisma.$transaction([
                prisma.$queryRawUnsafe(`
        SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
        FROM draft_bill_code
        WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${month + 1}
        ORDER BY draft_bill_code.created_at ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
                prisma.$queryRaw `
          SELECT COUNT(id) AS count FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${month + 1}
        `,
            ]);
        }
        else if (mode == 1) {
            return prisma.$transaction([
                prisma.$queryRawUnsafe(`
        SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
        FROM draft_bill_code
        WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${month + 1}
        AND draft_bill_code.is_delete = 1
        ORDER BY draft_bill_code.created_at ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
                prisma.$queryRaw `
          SELECT COUNT(id) AS count FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${month + 1}
        AND draft_bill_code.is_delete = 1
        `,
            ]);
        }
        else if (mode == 2) {
            return prisma.$transaction([
                prisma.$queryRawUnsafe(`
        SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
        FROM draft_bill_code
        WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${month + 1}
        AND draft_bill_code.is_delete = 0
        ORDER BY draft_bill_code.created_at ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
                prisma.$queryRaw `
          SELECT COUNT(id) AS count FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${month + 1}
        AND draft_bill_code.is_delete = 0
        `,
            ]);
        }
    }
}
exports.DraftBillModel = DraftBillModel;
