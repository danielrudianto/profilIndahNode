import { PrismaClient } from "@prisma/client";
import { IFetchPagination } from "../interfaces/fetch.interface";
import { CompanyModel } from "../models/company.model";
import { ExpenseModel } from "../models/expense.model";
import { IExpense } from "../interfaces/expense.interface";
import ExpenseTypeModel from "../models/expense-type.model";

export class ExpenseRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
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
          is_delete: true,
          deleted_by: userID,
          deleted_at: new Date(),
        },
      });

      return ExpenseModel.fromMap(result);
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
        is_delete: false,
      };

      const [result, count] = await Promise.all([
        this.prisma.expense.findMany({
          where,
          skip: (data.page - 1) * data.pageSize,
          take: data.pageSize,
          orderBy: { date: "desc" },
          include: {
            expense_type: true,
            company: true,
          },
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
              expense_type: ExpenseTypeModel.fromMap(item.expense_type),
              company: CompanyModel.fromMap(item.company),
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
    try {
      if (month == 0) {
        const result = await this.prisma.expense.findMany({
          where: {
            date: {
              gte: new Date(year, 0, 1, 0, 0, 0),
              lt: new Date(year + 1, 0, 0, 0, 0, 0),
            },
            is_delete: false,
          },
          orderBy: { date: "desc" },
        });

        return result.map((x) => {
          return ExpenseModel.fromMap(x);
        });
      } else {
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
      }
    } catch (error) {
      console.error(`[error]: Error on fetching expense report ${error}`);
      throw error;
    }
  }

  async fetchByID(id: number) {
    const result = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        expense_type: true,
        user_expense_created_byTouser: {
          include: {
            user_avatar: true,
          },
        },
        user_expense_deleted_byTouser: {
          include: {
            user_avatar: true,
          },
        },
        company: true,
      },
    });

    if (!result) {
      return null;
    }

    return ExpenseModel.fromMap(result);
  }
}
