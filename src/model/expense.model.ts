import { PrismaClient } from "@prisma/client";
import ExpenseTypeModel from "./expense.type.model";

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
  expense_type?: ExpenseTypeModel;
}

interface IReportExpense {
  id: number;
  name: string;
  parent_id: number | null;
  value: number;
  company_id: number;
}

class ExpenseModel {
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

  constructor(data: IExpense) {
    this.id = data.id;
    this.date = data.date;
    this.value = data.value;
    this.created_at = data.created_at || new Date();
    this.created_by = data.created_by;
    this.description = data.description;
    this.expense_type_id = data.expense_type_id;
    this.company_id = data.company_id;
    this.is_delete = data.is_delete;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;
  }
  /**
   * Create a new expense record
   * @param data
   * @returns
   */
  async create(): Promise<ExpenseModel> {
    try {
      const expense = await prisma.expense.create({
        data: {
          date: this.date,
          value: this.value,
          created_at: new Date(),
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

      return new ExpenseModel({
        id: expense.id,
        date: expense.date,
        value: Number(expense.value),
        created_at: expense.created_at,
        created_by: this.created_by,
        description: this.description,
        expense_type_id: this.expense_type_id,
        company_id: this.company_id,
        is_delete: false,
      });
    } catch (error) {
      console.error("Error creating expense:", error);
      throw new Error("Failed to create expense record.");
    }
  }

  async update(): Promise<ExpenseModel> {
    try {
      const expense = await prisma.expense.update({
        where: {
          id: this.id!,
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

      return new ExpenseModel({
        id: expense.id,
        date: expense.date,
        value: Number(expense.value),
        created_at: expense.created_at,
        created_by: this.created_by,
        description: this.description,
        expense_type_id: this.expense_type_id,
        company_id: this.company_id,
        is_delete: false,
      });
    } catch (error) {
      console.error("Error updating expense:", error);
      throw new Error("Failed to update expense record.");
    }
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

  /**
   * Fetch expenses by month and year
   * @param month
   * @param year
   * @returns
   */
  static fetchSum(month: number, year: number) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe<IReportExpense[]>(`
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

  static fetchTodaySum(year: number, month: number, day: number | null = null) {
    return prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(expense.value), 0) AS value
        FROM expense
        WHERE YEAR(expense.date) = '${year}'
        AND MONTH(expense.date) = '${month + 1}'
        ${day == null ? "" : `AND DAY(expense.date) = '${day}'`}
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

  /**
   * Fetch appendix for report
   * @param month
   * @param year
   * @returns
   */
  static fetchAppendix(month: number, year: number) {
    return prisma.$queryRawUnsafe<any[]>(`
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
  static fetchReport(month: number, year: number) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe<any[]>(`
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

export default ExpenseModel;
