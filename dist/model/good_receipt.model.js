"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class GoodReceiptModel {
    constructor(name, date, created_by, supplier_id, company_id, id = null) {
        this.is_confirm = true;
        this.is_delete = false;
        if (id != null) {
            this.id = id;
        }
        this.name = name;
        this.date = date;
        this.created_by = created_by;
        this.created_at = new Date();
        this.confirmed_by = created_by;
        this.confirmed_at = new Date();
        this.supplier_id = supplier_id;
        this.company_id = company_id;
    }
    create() {
        return prisma.good_receipt_code.create({
            data: {
                name: this.name,
                date: this.date,
                created_by: this.created_by,
                created_at: this.created_at,
                confirmed_by: this.confirmed_by,
                confirmed_at: this.confirmed_at,
                supplier_id: this.supplier_id,
                company_id: this.company_id,
                is_confirm: this.is_confirm,
            },
            include: {
                user_good_receipt_code_created_byTouser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                supplier: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
                company: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
            },
        });
    }
    update() {
        return prisma.good_receipt_code.update({
            where: {
                id: this.id,
            },
            data: {
                name: this.name,
                date: this.date,
                supplier_id: this.supplier_id,
                company_id: this.company_id,
            },
            select: {
                id: true,
                name: true,
                date: true,
                supplier_id: true,
                company_id: true,
                purchase_invoice: {
                    select: {
                        id: true,
                        discount: true,
                    },
                },
            },
        });
    }
    static insertItems(items) {
        return prisma.good_receipt.createMany({
            data: items,
        });
    }
    static fetchById(id) {
        return prisma.good_receipt_code.findUnique({
            where: {
                id: id,
            },
            select: {
                name: true,
                date: true,
                user_good_receipt_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                created_at: true,
                user_good_receipt_code_confirmed_byTouser: {
                    select: {
                        name: true,
                    },
                },
                confirmed_at: true,
                is_confirm: true,
                is_delete: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        npwp: true,
                    },
                },
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        npwp: true,
                    },
                },
                good_receipt: {
                    select: {
                        id: true,
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
                        quantity: true,
                    },
                },
                purchase_invoice: {
                    select: {
                        name: true,
                        date: true,
                    },
                },
            },
        });
    }
    static fetchByIds(id) {
        return prisma.good_receipt.findMany({
            where: {
                id: {
                    in: id,
                },
            },
        });
    }
    static countItemByReference(reference) {
        return prisma.good_receipt.count({
            where: {
                item: {
                    reference: reference,
                },
            },
        });
    }
    static deleteItemsByGoodReceiptCodeId(good_receipt_code_id) {
        return prisma.good_receipt.deleteMany({
            where: {
                good_receipt_code_id: good_receipt_code_id,
            },
        });
    }
    static fetchArchive(year, month, offset, limit) {
        const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end_date = new Date(year, month, 1, 0, 0, 0, 0);
        return prisma.good_receipt_code.findMany({
            where: {
                AND: [
                    {
                        date: {
                            gte: start_date,
                        },
                    },
                    {
                        date: {
                            lt: end_date,
                        },
                    },
                ],
            },
            orderBy: {
                date: "asc",
            },
            take: limit,
            skip: offset,
            select: {
                name: true,
                id: true,
                supplier: {
                    select: {
                        name: true,
                    },
                },
                company: {
                    select: {
                        name: true,
                    },
                },
                date: true,
                user_good_receipt_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                created_at: true,
                is_delete: true,
                is_confirm: true,
            },
        });
    }
    static fetchArchiveYears() {
        return prisma.$queryRaw `SELECT DISTINCT(YEAR(good_receipt_code.date)) AS year FROM good_receipt_code ORDER BY good_receipt_code.date ASC`;
    }
    static countArchiveByYear() {
        return prisma.$queryRaw `SELECT COUNT(good_receipt_code.id) AS count, YEAR(good_receipt_code.date) AS year FROM good_receipt_code GROUP BY YEAR(good_receipt_code.date)`;
    }
    static countArchiveByMonth(year) {
        return prisma.$queryRaw `SELECT COUNT(good_receipt_code.id) AS count, MONTH(good_receipt_code.date) AS month FROM good_receipt_code WHERE YEAR(good_receipt_code.date) = ${year} GROUP BY MONTH(good_receipt_code.date)`;
    }
    static countArchive(year, month) {
        const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end_date = new Date(year, month, 1, 0, 0, 0, 0);
        return prisma.good_receipt_code.count({
            where: {
                AND: [
                    {
                        date: {
                            gte: start_date,
                        },
                    },
                    {
                        date: {
                            lt: end_date,
                        },
                    },
                ],
            },
        });
    }
    static countByCompanyIds(company_ids) {
        return prisma.good_receipt_code.groupBy({
            by: ["company_id"],
            where: {
                company_id: {
                    in: company_ids,
                },
                is_delete: false,
            },
            _count: true,
        });
    }
    static countBySupplierIds(supplier_ids) {
        return prisma.good_receipt_code.groupBy({
            by: ["supplier_id"],
            where: {
                supplier_id: {
                    in: supplier_ids,
                },
                is_delete: false,
            },
            _count: true,
        });
    }
    static fetchCodeById(id) {
        return prisma.good_receipt.findFirst({
            where: {
                id: id,
            },
            select: {
                good_receipt_code: {
                    select: {
                        created_at: true,
                        name: true,
                        date: true,
                        user_good_receipt_code_created_byTouser: {
                            select: {
                                name: true,
                            },
                        },
                        supplier: {
                            select: {
                                name: true,
                                address: true,
                                npwp: true,
                            },
                        },
                        good_receipt: {
                            select: {
                                id: true,
                                quantity: true,
                                item: {
                                    select: {
                                        reference: true,
                                        description: true,
                                        unit: true,
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
                        },
                    },
                },
            },
        });
    }
    static searchArchives(keyword, start, end, offset = 0, limit = 10) {
        if (start != null && end != null) {
            return prisma.good_receipt_code.findMany({
                where: {
                    AND: [
                        {
                            date: {
                                gte: new Date(start),
                            },
                        },
                        {
                            date: {
                                lte: new Date(end),
                            },
                        },
                    ],
                    OR: [
                        {
                            name: {
                                contains: keyword,
                            },
                        },
                        {
                            name: {
                                contains: keyword,
                            },
                        },
                        {
                            good_receipt: {
                                some: {
                                    item: {
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
                                },
                            },
                        },
                        {
                            good_receipt: {
                                some: {
                                    item: {
                                        description: {
                                            contains: keyword,
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
                include: {
                    supplier: {
                        select: { name: true, npwp: true },
                    },
                    user_good_receipt_code_created_byTouser: {
                        select: {
                            name: true,
                        },
                    },
                    company: {
                        select: {
                            name: true,
                        },
                    },
                },
                take: limit,
                skip: offset,
                orderBy: {
                    date: "asc",
                },
            });
        }
        else {
            return prisma.good_receipt_code.findMany({
                where: {
                    OR: [
                        {
                            name: {
                                contains: keyword,
                            },
                        },
                        {
                            name: {
                                contains: keyword,
                            },
                        },
                        {
                            good_receipt: {
                                some: {
                                    item: {
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
                                },
                            },
                        },
                        {
                            good_receipt: {
                                some: {
                                    item: {
                                        description: {
                                            contains: keyword,
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
                include: {
                    supplier: {
                        select: { name: true, npwp: true },
                    },
                    user_good_receipt_code_created_byTouser: {
                        select: {
                            name: true,
                        },
                    },
                    company: {
                        select: {
                            name: true,
                        },
                    },
                },
                take: limit,
                skip: offset,
                orderBy: {
                    date: "asc",
                },
            });
        }
    }
    static searchCountArchives(keyword, start, end) {
        if (start != null && end != null) {
            return prisma.good_receipt_code.count({
                where: {
                    AND: [
                        {
                            date: {
                                gte: new Date(start),
                            },
                        },
                        {
                            date: {
                                lte: new Date(end),
                            },
                        },
                    ],
                    OR: [
                        {
                            name: {
                                contains: keyword,
                            },
                        },
                        {
                            supplier: {
                                name: {
                                    contains: keyword,
                                },
                            },
                        },
                        {
                            good_receipt: {
                                some: {
                                    item: {
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
                                },
                            },
                        },
                        {
                            good_receipt: {
                                some: {
                                    item: {
                                        description: {
                                            contains: keyword,
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
            });
        }
        else {
            return prisma.good_receipt_code.count({
                where: {
                    OR: [
                        {
                            name: {
                                contains: keyword,
                            },
                        },
                        {
                            name: {
                                contains: keyword,
                            },
                        },
                        {
                            supplier: {
                                name: {
                                    contains: keyword,
                                },
                            },
                        },
                        {
                            good_receipt: {
                                some: {
                                    item: {
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
                                },
                            },
                        },
                        {
                            good_receipt: {
                                some: {
                                    item: {
                                        description: {
                                            contains: keyword,
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
            });
        }
    }
}
exports.default = GoodReceiptModel;
