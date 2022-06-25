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
}

export default ExpenseModel;
