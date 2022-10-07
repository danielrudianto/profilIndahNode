import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ExpenseModel {
  id?: number;
  date: Date;
  created_by: number;
  created_at: Date;
  description: string;
  value: number;
  is_delete: boolean = false;
  deleted_by: number | null = null;
  deleted_at: Date | null = null;
  expense_type_id: number;

  constructor(
    value: number,
    description: string,
    date: Date,
    expense_type_id: number,
    created_by: number,
    id: number | null = null
  ) {
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

  static fetch(year: number, month: number, offset: number, limit: number) {
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
      },
    });
  }

  static count(year: number, month: number) {
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
        SELECT SUM(expense.value) AS value, expense_type.id, expense_type.name, expense_type.parent_id
        FROM expense_type
        LEFT JOIN expense ON expense.expense_type_id = expense.expense_type_id
        WHERE YEAR(expense.date) = ${year}
        AND expense.is_delete = 0
        GROUP BY expense_type.id
      `);
    } else {
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

  static fetchTodaySum() {
    const date = new Date();
    return prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(expense.value), 0) AS value
        FROM expense_type
        LEFT JOIN expense ON expense.expense_type_id = expense.expense_type_id
        WHERE expense.date = '${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}'
        AND expense.is_delete = 0
      `);
  }

  static fetchById(id: number){
    return prisma.expense.findUnique({
      where: {
        id: id
      },
      select: {
        id: true,
        is_delete: true,
        value: true,
        description: true,
        expense_type: {
          select: {
            name: true,
            description: true,
          }
        }
      }
    })
  }

  static deleteById(id: number, deleted_by: number){
    return prisma.expense.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_at: new Date(),
        deleted_by: deleted_by,
      }
    })
  }
}

export default ExpenseModel;
