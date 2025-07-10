import { PrismaClient } from "@prisma/client";
import { translatePage } from "../helper/escape.helper";
import { IFetchPagination } from "../interface/fetch.interface";
import { IExpense, ExpenseModel } from "../model/expense.model";

export class ExpenseRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IExpense) {
    try {
      const result = await this.prisma.expense.create({
        data: {
          description: data.description,
          date: data.date,
          company_id: data.company_id,
          value: data.value,
          created_by: data.created_by,
          created_at: data.created_at,
          expense_type_id: data.expense_type_id,
        },
      });

      return new ExpenseModel({
        id: result.id,
        description: result.description,
        date: result.date,
        company_id: result.company_id,
        value: Number(result.value),
        created_by: result.created_by,
        created_at: result.created_at,
        expense_type_id: result.expense_type_id,
      });
    } catch (error) {
      console.error(`[error]: Error on creating expense ${error}`);
      throw error;
    }
  }

  async update(data: IExpense) {
    try {
      const id = data.id!;
      const result = await this.prisma.expense.update({
        where: { id },
        data: {
          description: data.description,
          date: data.date,
          company_id: data.company_id,
          value: data.value,
          created_by: data.created_by,
          created_at: data.created_at,
          expense_type_id: data.expense_type_id,
        },
      });

      return new ExpenseModel({
        id: result.id,
        description: result.description,
        date: result.date,
        company_id: result.company_id,
        value: Number(result.value),
        created_by: result.created_by,
        created_at: result.created_at,
        expense_type_id: result.expense_type_id,
      });
    } catch (error) {
      console.error(`[error]: Error on updating expense ${error}`);
      throw error;
    }
  }

  async delete(id: number, userID: number) {
    try {
      const result = await this.prisma.expense.update({
        where: { id },
        data: {
          deleted_by: userID,
          deleted_at: new Date(),
        },
      });

      return new ExpenseModel({
        id: result.id,
        description: result.description,
        date: result.date,
        company_id: result.company_id,
        value: Number(result.value),
        created_by: result.created_by,
        created_at: result.created_at,
        expense_type_id: result.expense_type_id,
      });
    } catch (error) {
      console.error(`[error]: Error on deleting expense ${error}`);
      throw error;
    }
  }

  async fetch(data: IFetchPagination) {
    try {
      const where: any = {
        date: {
          gte: new Date(data.year, data.month - 1, 1, 0, 0, 0),
          lt: new Date(data.year, data.month, 1, 0, 0, 0),
        },
      };

      const [result, count] = await Promise.all([
        this.prisma.expense.findMany({
          where,
          skip: (data.page - 1) * data.pageSize,
          take: data.pageSize,
          orderBy: { date: "desc" },
        }),
        this.prisma.expense.count({ where }),
      ]);

      return {
        data: result.map(
          (item) =>
            new ExpenseModel({
              id: item.id,
              description: item.description,
              date: item.date,
              company_id: item.company_id,
              value: Number(item.value),
              created_by: item.created_by,
              created_at: item.created_at,
              expense_type_id: item.expense_type_id,
            })
        ),
        count: count,
      };
    } catch (error) {
      console.error(`[error]: Error on fetching expenses ${error}`);
      throw error;
    }
  }

  async fetchSum(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await this.prisma.expense.aggregate({
        _sum: {
          value: true,
        },
        where: {
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
      });

      return Number(result._sum.value) || 0;
    } catch (error) {
      console.error(`[error]: Error on fetching expense sum ${error}`);
      throw error;
    }
  }

  async fetchReport(month: number, year: number) {
    console.log(month);
    console.log(year);
    try {
      const result = await this.prisma.expense.findMany({
        where: {
          date: {
            gte: new Date(year, month - 1, 1, 0, 0, 0),
            lt: new Date(year, month, 1, 0, 0, 0),
          },
          is_delete: false,
        },
        orderBy: { date: "desc" },
      });

      return result.map((x) => {
        return ExpenseModel.fromMap(x);
      });
    } catch (error) {
      console.error(`[error]: Error on fetching expense report ${error}`);
      throw error;
    }
  }

  async fetchByID(id: number) {
    const result = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!result) {
      return null;
    }

    return new ExpenseModel({
      id: result.id,
      description: result.description,
      date: result.date,
      company_id: result.company_id,
      value: Number(result.value),
      created_by: result.created_by,
      created_at: result.created_at,
      expense_type_id: result.expense_type_id,
    });
  }
}
