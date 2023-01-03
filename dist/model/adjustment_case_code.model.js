"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const error_list_1 = __importDefault(require("../assets/error_list"));
const prisma = new client_1.PrismaClient();
class AdjustmentCaseCodeModel {
    constructor(name, date, created_by, company_id, id = null) {
        this.is_confirm = true;
        this.is_delete = false;
        if (id != null) {
            this.id = id;
        }
        this.name = name;
        this.date = date;
        this.created_by = created_by;
        this.created_at = new Date();
        this.company_id = company_id;
    }
    create() {
        return prisma.adjustment_case_code.create({
            data: {
                name: this.name,
                date: this.date,
                created_by: this.created_by,
                created_at: this.created_at,
                is_confirm: this.is_confirm,
                is_delete: this.is_delete,
                confirmed_by: this.created_by,
                confirmed_at: this.created_at,
                company_id: this.company_id,
            },
        });
    }
    static fetchArchive(year, month, offset, limit) {
        if (year < 0 || month < 0 || month > 11 || offset < 0 || limit <= 0) {
            throw Error(error_list_1.default["Parameter error"]);
        }
        else {
            const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
            const end_date = new Date(year, month, 1, 0, 0, 0, 0);
            return prisma.adjustment_case_code.findMany({
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
                    date: true,
                    user_adjustment_case_code_created_byTouser: {
                        select: {
                            name: true,
                        },
                    },
                    user_adjustment_case_code_confirmed_byTouser: {
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
    }
    static fetchArchiveYears() {
        return prisma.$queryRaw `SELECT DISTINCT(YEAR(adjustment_case_code.date)) AS year FROM adjustment_case_code ORDER BY adjustment_case_code.date ASC`;
    }
    static countArchiveByYear() {
        return prisma.$queryRaw `SELECT COUNT(adjustment_case_code.id) AS count, YEAR(adjustment_case_code.date) AS year FROM adjustment_case_code GROUP BY YEAR(adjustment_case_code.date)`;
    }
    static countArchiveByMonth(year) {
        return prisma.$queryRaw `SELECT COUNT(adjustment_case_code.id) AS count, MONTH(adjustment_case_code.date) AS month FROM adjustment_case_code WHERE YEAR(adjustment_case_code.date) = ${year} GROUP BY MONTH(adjustment_case_code.date)`;
    }
    static countArchive(year, month) {
        if (year < 0 || month < 0 || month > 11) {
            throw Error(error_list_1.default["Parameter error"]);
        }
        else {
            const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
            const end_date = new Date(year, month, 1, 0, 0, 0, 0);
            return prisma.adjustment_case_code.count({
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
    }
    static deleteById(id) {
        return prisma.adjustment_case_code.update({
            where: {
                id: id,
            },
            data: {
                is_delete: true,
                is_confirm: false,
            },
        });
    }
    static fetchById(id) {
        return prisma.adjustment_case_code.findUnique({
            where: {
                id: id,
            },
            select: {
                name: true,
                id: true,
                is_confirm: true,
                is_delete: true,
                user_adjustment_case_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                created_at: true,
                adjustment_case: {
                    select: {
                        item: {
                            select: {
                                reference: true,
                                description: true,
                            },
                        },
                        quantity: true,
                    },
                },
                company: {
                    select: {
                        name: true,
                        address: true,
                        npwp: true,
                        code_name: true,
                    },
                },
            },
        });
    }
}
exports.default = AdjustmentCaseCodeModel;
