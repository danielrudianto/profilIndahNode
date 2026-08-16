import { IExpenseType } from "../interfaces/expense-type.interface";
import { PrismaClient } from "@prisma/client";
import ExpenseTypeModel from "../models/expense-type.model";

/**
 * Tipe pengeluaran datar — lihat catatan di models/expense-type.model.ts.
 * Kolom parent_id sengaja tidak pernah disentuh di sini.
 */
export class ExpenseTypeRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
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
        },
      });

      return ExpenseTypeModel.fromMap(result);
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
          // Sumbernya data.created_by dan data.created_at karena itulah bidang
          // yang dipakai controller untuk membawa identitas PENYUNTING —
          // penamaan yang berlaku seragam di seluruh repository repo ini.
          updated_by: data.created_by,
          updated_at: data.created_at,
        },
      });

      return ExpenseTypeModel.fromMap(result);
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
          is_delete: true,
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
        },
      });

      if (!result) {
        throw new Error("Expense type not found");
      }

      return ExpenseTypeModel.fromMap(result);
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
        },
        orderBy: {
          name: "asc",
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

  async fetch() {
    try {
      const result = await this.prisma.expense_type.findMany({
        where: {
          is_delete: false,
        },
        select: {
          id: true,
          name: true,
          description: true,
          created_by: true,
          created_at: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return result.map((item) => ExpenseTypeModel.fromMap(item));
    } catch (error) {
      console.error(`[error]: Error on fetching expense types ${error}`);
      throw new Error("Internal server error");
    }
  }

  /** Nama dipertahankan untuk pemanggil lama; isinya kini sama dengan fetch. */
  async fetchAll() {
    return this.fetch();
  }
}
