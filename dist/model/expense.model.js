"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ExpenseModel {
    /**
     * Create a new expense record
     * @param data
     * @returns
     */
    static create(data) {
        return prisma.expense.create({
            data: {
                date: data.date,
                value: data.value,
                created_at: new Date(),
                created_by: data.created_by,
                description: data.description,
                expense_type_id: data.expense_type_id,
                company_id: data.company_id,
            },
            select: {
                id: true,
                date: true,
                value: true,
                created_at: true,
                user_expense_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }
    /**
     * Fetch expense by year and month
     * @param year
     * @param month
     * @param offset
     * @param limit
     */
    static fetch(year, month, offset, limit) {
        const date = new Date(year, month, 1, 0, 0, 0, 0);
        const max_date = new Date(year, month + 1, 1, 0, 0, 0, 0);
        return prisma.$transaction([
            prisma.expense.findMany({
                where: {
                    is_delete: false,
                    AND: [
                        {
                            date: {
                                gte: date,
                            },
                        },
                        {
                            date: {
                                lt: max_date,
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
                    description: true,
                    date: true,
                    user_expense_created_byTouser: {
                        select: {
                            name: true,
                        },
                    },
                    value: true,
                    created_at: true,
                    id: true,
                    expense_type: {
                        select: {
                            name: true,
                        },
                    },
                    company_id: true,
                    company: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),
            prisma.expense.count({
                where: {
                    is_delete: false,
                    AND: [
                        {
                            date: {
                                gte: date,
                            },
                        },
                        {
                            date: {
                                lt: max_date,
                            },
                        },
                    ],
                },
            }),
        ]);
    }
    /**
     * Update expense record
     * @param data
     * @returns
     */
    static updateByID(data) {
        return prisma.expense.update({
            where: {
                id: data.id,
            },
            data: {
                date: data.date,
                value: data.value,
                expense_type_id: data.expense_type_id,
                description: data.description,
                company_id: data.company_id,
            },
            include: {
                expense_type: {
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
        });
    }
    static countByType(expense_type_id) {
        return prisma.expense.count({
            where: {
                is_delete: false,
                expense_type_id: expense_type_id,
            },
        });
    }
    static countByTypeGroup() {
        return prisma.expense.groupBy({
            by: ["expense_type_id"],
            _count: true,
            where: {
                is_delete: false,
            },
        });
    }
    /**
     * Fetch expenses by month and year
     * @param month
     * @param year
     * @returns
     */
    static fetchSum(month, year) {
        return prisma.$transaction([
            prisma.$queryRawUnsafe(`
      SELECT expense_type.id, expense_type.name, 
      expense_type.parent_id, COALESCE(exp.value, 0) AS value, 
      company_id
      FROM expense_type
      LEFT JOIN (
        SELECT SUM(expense.value) AS value, expense_type_id, company_id
          FROM expense
          WHERE expense.is_delete = 0
          AND YEAR(expense.date) = ${year}
          ${month == 0 ? "" : `AND MONTH(expense.date) = ${month}`}
          GROUP BY expense_type_id, company_id
      ) AS exp
      ON expense_type.id = exp.expense_type_id
      JOIN company ON company.id = exp.company_id
      ORDER BY company_id ASC, parent_id ASC
    `),
            prisma.expense_type.findMany({}),
        ]);
    }
    static fetchTodaySum() {
        const date = new Date();
        return prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(expense.value), 0) AS value
        FROM expense
        WHERE expense.date = '${date.getFullYear()}-${(date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}'
        AND expense.is_delete = 0
      `);
    }
    static fetchByID(id) {
        return prisma.expense.findUnique({
            where: {
                id: id,
            },
            select: {
                date: true,
                id: true,
                is_delete: true,
                value: true,
                description: true,
                expense_type_id: true,
                company_id: true,
                expense_type: {
                    select: {
                        name: true,
                        description: true,
                        expense_type: {
                            select: {
                                name: true,
                                description: true,
                            },
                        },
                    },
                },
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }
    static deleteByID(id, deleted_by) {
        return prisma.expense.update({
            where: {
                id: id,
            },
            data: {
                is_delete: true,
                deleted_at: new Date(),
                deleted_by: deleted_by,
            },
        });
    }
    /**
     * Fetch appendix for report
     * @param month
     * @param year
     * @returns
     */
    static fetchAppendix(month, year) {
        return prisma.$queryRawUnsafe(`
      SELECT expense_type.name, expense.value, expense_type.description,
      company.name AS company_name, expense.date
      FROM expense
      JOIN expense_type ON expense_type.id = expense.expense_type_id
      JOIN company ON expense.company_id = company.id
      WHERE YEAR(expense.date) = ${year}
      ${month == 0 ? "" : `AND MONTH(expense.date) = ${month}`}
      AND expense.is_delete = 0
      ORDER BY expense.date ASC
    `);
    }
    /**
     * Fetch report
     * @param month
     * @param year
     * @returns
     */
    static fetchReport(month, year) {
        return prisma.$transaction([
            prisma.$queryRawUnsafe(`
        SELECT SUM(expense.value) AS value, expense.expense_type_id,
         expense.company_id
        FROM expense
        WHERE YEAR(expense.date) = ${year}
        ${month == 0 ? "" : `AND MONTH(expense.date) = ${month}`}
        GROUP BY expense.company_id, expense.expense_type_id
      `),
            prisma.expense_type.findMany({
                where: {
                    is_delete: false,
                },
            }),
            prisma.company.findMany({}),
        ]);
    }
}
exports.default = ExpenseModel;
//# sourceMappingURL=expense.model.js.map