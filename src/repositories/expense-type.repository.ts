import { PrismaClient } from "@prisma/client";
import { IExpense, ExpenseModel } from "../model/expense.model";
import ExpenseTypeModel, { IExpenseType } from "../model/expense.type.model";

export class ExpenseTypeRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IExpenseType) {
    try {
      const result = await this.prisma.expense_type.create({
        data: {
          name: data.name,
          description: data.description,
          created_by: data.created_by,
          created_at: data.created_at || new Date(),
          parent_id: data.parent_id,
        },
      });

      return new ExpenseTypeModel({
        id: result.id,
        name: result.name,
        description: result.description,
        created_by: result.created_by,
        created_at: result.created_at,
        parent_id: result.parent_id,
      });
    } catch (error) {
      console.error(`[error]: Error on creating expense type ${error}`);
      throw new Error("Internal server error");
    }
  }

  async update(data: IExpenseType) {
    try {
      const id = data.id!;
      const result = await this.prisma.expense_type.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
        },
      });

      return new ExpenseTypeModel({
        id: result.id,
        name: result.name,
        description: result.description,
        created_by: result.created_by,
        created_at: result.created_at,
        parent_id: result.parent_id,
      });
    } catch (error) {
      console.error(`[error]: Error on updating expense type ${error}`);
      throw new Error("Internal server error");
    }
  }

  async delete(id: number, userID: number) {
    try {
      const expenseType = await this.prisma.expense_type.findUnique({
        where: { id },
      });

      if (!expenseType) {
        throw new Error("Expense type not found");
      }

      await this.prisma.expense_type.update({
        where: {
          id: id,
        },
        data: {
          deleted_at: new Date(),
          deleted_by: userID,
        },
      });
    } catch (error) {
      console.error(`[error]: Error on deleting expense type ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchByID(id: number) {
    try {
      const result = await this.prisma.expense_type.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          created_by: true,
          created_at: true,
          parent_id: true,
        },
      });

      if (!result) {
        throw new Error("Expense type not found");
      }

      return new ExpenseTypeModel({
        id: result.id,
        name: result.name,
        description: result.description,
        created_by: result.created_by,
        created_at: result.created_at,
        parent_id: result.parent_id,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching expense type by ID ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchAutocomplete(keyword: string) {
    try {
      const result = await this.prisma.expense_type.findMany({
        where: {
          is_delete: false,
          parent_id: {
            not: null,
          }, // Only fetch top-level expense types
          OR: [
            {
              name: {
                contains: keyword,
              },
            },
            {
              description: {
                contains: keyword,
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          parent_id: true,
        },
        take: 5,
      });

      return result.map((item) => {
        return ExpenseTypeModel.fromMap(item);
      });
    } catch (error) {
      console.error(
        `[error]: Error on fetching expense type autocomplete ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  async fetchAll() {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT expense_type.id, expense_type.name, expense_type.description, 
        IF(COALESCE(c.count, 0) = 0, "1", "0") AS can_delete 
        FROM expense_type 
        LEFT JOIN (
          SELECT COUNT(id) AS count, expense_type.parent_id
          FROM expense_type
          WHERE is_delete = 0
          AND expense_type.parent_id IS NOT NULL
          GROUP BY expense_type.parent_id
        ) c
        ON expense_type.id = c.parent_id
        WHERE is_delete = 0 AND expense_type.parent_id IS NULL
      `;

      return result.map((item) => {
        return new ExpenseTypeModel({
          id: item.id,
          name: item.name,
          description: item.description,
          created_by: item.created_by,
          created_at: item.created_at,
          parent_id: item.parent_id,
          can_delete: item.can_delete,
        });
      });
    } catch (error) {
      console.error(`[error]: Error on fetching expense types ${error}`);
      throw new Error("Internal server error");
    }
  }

  async countByParentID(id: number) {
    try {
      const count = await this.prisma.expense_type.count({
        where: {
          parent_id: id,
          is_delete: false,
        },
      });
      return count;
    } catch (error) {
      console.error(
        `[error]: Error on counting expense types by parent ID ${error}`
      );
      throw new Error("Internal server error");
    }
  }
}
