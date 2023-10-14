import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface IExpense {
  id?: number;
  date: Date;
  value: number;
  created_at?: Date;
  created_by: number;
  description: string;
  expense_type_id: number;
  company_id: number;
  is_delete?: boolean;
  deleted_by?: number;
  deleted_at?: Date;
}

class ExpenseModel {
  /**
   * Create a new expense record
   * @param data
   * @returns
   */
  static create(data: IExpense) {
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
  static fetch(year: number, month: number, offset: number, limit: number) {
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
  static updateByID(data: IExpense) {
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

  static countByType(expense_type_id: number) {
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

  static fetchSum(month: number, year: number) {
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
    } else {
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

  static fetchByID(id: number) {
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

  static deleteByID(id: number, deleted_by: number) {
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

  static fetchAppendix(month: number, year: number) {
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
    } else {
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

export default ExpenseModel;
