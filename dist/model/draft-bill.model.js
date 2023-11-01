"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraftBillModel = void 0;
const client_1 = require("@prisma/client");
const moment_1 = __importDefault(require("moment"));
const uuid_1 = require("uuid");
const fetch_interface_1 = require("../interface/fetch.interface");
const prisma = new client_1.PrismaClient();
class DraftBillModel {
    /**
     * Create draft bill
     * @param data
     * @returns
     */
    static create(data) {
        return prisma.draft_bill_code.create({
            data: {
                name: data.name,
                delivery: data.delivery,
                service: data.service,
                note: data.note,
                created_at: new Date(),
                created_by: data.created_by,
                customer_id: data.customer_id,
                draft_bill: {
                    createMany: {
                        data: data.items.map((x) => {
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
    /**
     * Fetch draft bill
     * @param keyword
     * @param limit
     * @param offset
     * @param mode
     * @returns {Promise<IFetchDraftBill[]>}
     */
    static fetch(keyword, limit, offset, mode) {
        if (mode == fetch_interface_1.fetchMode.Unconfirmed) {
            return prisma.$transaction([
                prisma.$queryRawUnsafe(`
        SELECT draft_bill_code.id, draft_bill_code.name, 
        draft_bill_code.created_at, user.name as created_by, 
        customer.name as customer_name, total.total,
        draft_bill_code.is_delete
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
        LIMIT ${limit} OFFSET ${offset}
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
        else if (mode == fetch_interface_1.fetchMode.Pagination) {
            return prisma.$transaction([
                prisma.$queryRawUnsafe(`
        SELECT draft_bill_code.id, draft_bill_code.name, 
        draft_bill_code.created_at, user.name as created_by, 
        customer.name as customer_name, total.total,
        draft_bill_code.is_delete
        FROM draft_bill_code
        INNER JOIN user ON draft_bill_code.created_by = user.id
        LEFT JOIN customer ON draft_bill_code.customer_id = customer.id
        JOIN (
          SELECT SUM(draft_bill.quantity * draft_bill.price) as total, draft_bill.draft_bill_code_id
          FROM draft_bill
          GROUP BY draft_bill.draft_bill_code_id
        ) as total 
        ON total.draft_bill_code_id = draft_bill_code.id
        WHERE draft_bill_code.name LIKE '%${keyword}%'
        OR customer.name LIKE '%${keyword}%'
        ORDER BY draft_bill_code.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
                prisma.draft_bill_code.count({
                    where: {
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
    /**
     * Confirm draft bill and convert it to bill
     * @param data
     * @returns
     */
    static confirm(data) {
        return prisma.$transaction([
            prisma.draft_bill_code.update({
                where: {
                    id: data.id,
                },
                data: {
                    is_delete: true,
                    confirmed_at: new Date(),
                    confirmed_by: data.userID,
                },
            }),
            prisma.bill_code.create({
                data: {
                    name: data.name,
                    date: new Date((0, moment_1.default)(data.date).format("YYYY-MM-DD")),
                    customer_id: data.customer_id,
                    payment_method_id: data.payment_method_id,
                    service: data.service,
                    delivery: data.delivery,
                    discount: data.discount,
                    uuid: (0, uuid_1.v4)(),
                    created_at: new Date(),
                    created_by: data.userID,
                    is_confirm: true,
                    confirmed_at: new Date(),
                    confirmed_by: data.userID,
                    bill: {
                        createMany: {
                            data: data.items.map((x) => {
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
                include: {
                    bill: {
                        include: {
                            package_code: {
                                include: {
                                    package_content: {
                                        select: {
                                            quantity: true,
                                            item_id: true,
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
                                                    unit: true,
                                                },
                                            },
                                            price: true,
                                            discount: true,
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
                            item: {
                                select: {
                                    id: true,
                                    reference: true,
                                    description: true,
                                    unit: true,
                                },
                            },
                        },
                    },
                    customer: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),
        ]);
    }
    /**
     * Delete draft bill by ID
     * @param id
     * @param userID
     * @returns
     */
    static deleteByID(id, userID) {
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
    /**
     * Fetch archive years and count
     * @param mode
     * @returns
     */
    static fetchArchiveYears(mode) {
        switch (mode) {
            case 0:
                return prisma.$queryRaw `
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
            case 1:
                return prisma.$queryRaw `
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.is_delete = 1
      AND draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
            case 2:
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
    /**
     * Fetch archive months and count by year
     * @param year
     * @param mode
     * @returns
     */
    static fetchArchiveMonths(year, mode) {
        switch (mode) {
            case 0:
                return prisma.$queryRaw `
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
            case 1:
                return prisma.$queryRaw `
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      AND draft_bill_code.is_delete = 1
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
            case 2:
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
    /**
     * Fetch archive by year and month and page
     * @param year
     * @param month
     * @param page
     * @param mode
     * @returns
     */
    static fetchArchive(year, month, page, mode) {
        switch (mode) {
            case 0:
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
            case 1:
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
            case 2:
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
//# sourceMappingURL=draft-bill.model.js.map