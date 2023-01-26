"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ExpenseModel {
    constructor(value, description, date, expense_type_id, company_id, created_by, id = null) {
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
        this.company_id = company_id;
    }
    /** Create a new expense data */
    create() {
        return prisma.expense.create({
            data: {
                date: this.date,
                value: this.value,
                created_at: this.created_at,
                created_by: this.created_by,
                description: this.description,
                expense_type_id: this.expense_type_id,
                company_id: this.company_id,
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
    /** Update expense data */
    update() {
        return prisma.expense.update({
            where: {
                id: this.id,
            },
            data: {
                date: this.date,
                value: this.value,
                expense_type_id: this.expense_type_id,
                description: this.description,
                company_id: this.company_id,
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
    /** Fetch expense data */
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
        });
    }
    static count(year, month) {
        const date = new Date(year, month, 1, 0, 0, 0, 0);
        const max_date = new Date(year, month + 1, 1, 0, 0, 0, 0);
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
      SELECT expense_type.id, expense_type.name, company.name AS company_name, expense_type.parent_id, COALESCE(exp.value, 0) AS value, company.id AS company_id
      FROM expense_type
      JOIN company
      LEFT JOIN (
        SELECT SUM(expense.value) AS value, expense_type_id, company_id
          FROM expense
          WHERE expense.is_delete = 0
          AND YEAR(expense.date) = ${year}
          GROUP BY expense_type_id, company_id
      ) AS exp
      ON expense_type.id = exp.expense_type_id
      AND company.id = exp.company_id
      ORDER BY company.id ASC, parent_id ASC
      `);
        }
        else {
            return prisma.$queryRawUnsafe(`
      SELECT expense_type.id, expense_type.name, company.name AS company_name, expense_type.parent_id, COALESCE(exp.value, 0) AS value, company.id AS company_id
      FROM expense_type
      JOIN company
      LEFT JOIN (
        SELECT SUM(expense.value) AS value, expense_type_id, company_id
          FROM expense
          WHERE expense.is_delete = 0
          AND MONTH(expense.date) = ${month}
          AND YEAR(expense.date) = ${year}
          GROUP BY expense_type_id, company_id
      ) AS exp
      ON expense_type.id = exp.expense_type_id
      AND company.id = exp.company_id
      ORDER BY company.id ASC, parent_id ASC
      `);
        }
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
    static fetchById(id) {
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
    static deleteById(id, deleted_by) {
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
    static fetchAppendix(month, year) {
        if (month == 0) {
            const start_date = new Date(year, 0, 1);
            const end_date = new Date(year, 11, 31);
            return prisma.expense.findMany({
                where: {
                    AND: [
                        {
                            date: {
                                gte: start_date,
                            },
                        },
                        {
                            date: {
                                lte: end_date,
                            },
                        },
                    ],
                    is_delete: false,
                },
                select: {
                    value: true,
                    description: true,
                    company: {
                        select: {
                            name: true,
                        },
                    },
                    expense_type: {
                        select: {
                            name: true,
                            expense_type: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    date: true,
                },
                orderBy: {
                    date: "asc",
                },
            });
        }
        else {
            const start_date = new Date(year, month - 1, 1);
            const end_date = new Date(year, month, 1);
            return prisma.expense.findMany({
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
                    is_delete: false,
                },
                select: {
                    value: true,
                    description: true,
                    company: {
                        select: {
                            name: true,
                        },
                    },
                    expense_type: {
                        select: {
                            name: true,
                            expense_type: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    date: true,
                },
                orderBy: {
                    date: "asc",
                },
            });
        }
    }
}
exports.default = ExpenseModel;
