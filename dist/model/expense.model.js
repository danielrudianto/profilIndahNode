"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ExpenseModel {
    constructor(value, description, date, expense_type_id, created_by, id = null) {
        this.is_delete = false;
        this.deleted_by = null;
        this.deleted_at = null;
        if (id != null) {
            this.id = id;
        }
        this.date = date;
        this.value = value;
        this.created_at = new Date();
        this.created_by = created_by;
        this.description = description;
        this.expense_type_id = expense_type_id;
    }
    create() {
        return prisma.expense.create({
            data: {
                date: this.date,
                value: this.value,
                created_at: this.created_at,
                created_by: this.created_by,
                description: this.description,
                expense_type_id: this.expense_type_id,
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
    static fetch(year, month, offset, limit) {
        const date = new Date(year, month, 1, 0, 0, 0, 0);
        const max_date = new Date(year, month + 1, 1, 0, 0, 0, 0);
        return prisma.expense.findMany({
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
                created_at: true,
                id: true,
                expense_type: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }
    static count(year, month) {
        const date = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const max_date = new Date(year, month, 1, 0, 0, 0, 0);
        return prisma.expense.count({
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
    static fetchSum(month, year) {
        if (month == 0) {
            return prisma.$queryRawUnsafe(`
        SELECT SUM(expense.value) AS value, expense_type.id, expense_type.name, expense_type.parent_id
        FROM expense_type
        LEFT JOIN expense ON expense.expense_type_id = expense.expense_type_id
        WHERE YEAR(expense.date) = ${year}
        AND expense.is_delete = 0
        GROUP BY expense_type.id
      `);
        }
        else {
            return prisma.$queryRawUnsafe(`
        SELECT SUM(expense.value) AS value, expense_type_id, expense_type.name, expense_type.parent_id
        FROM expense_type
        LEFT JOIN expense ON expense.expense_type_id = expense.expense_type_id
        WHERE MONTH(expense.date) = ${month}
        AND YEAR(expense.date) = ${year}
        AND expense.is_delete = 0
        GROUP BY expense_type.id
      `);
        }
    }
}
exports.default = ExpenseModel;
