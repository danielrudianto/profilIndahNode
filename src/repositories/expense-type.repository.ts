import { IExpenseType } from "../interfaces/expense-type.interface";
import { PrismaClient } from "@prisma/client";
import ExpenseTypeModel from "../models/expense-type.model";

/**
 * Tipe pengeluaran dua tingkat — lihat catatan di models/expense-type.model.ts.
 * Penjagaan "induk baku tidak boleh disentuh" hidup di controller; repository
 * ini hanya menjalankan apa yang diminta.
 */
export class ExpenseTypeRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /** Membuat ANAK — parent_id wajib menunjuk induk baku. */
  async create(data: IExpenseType) {
    try {
      const result = await this.prisma.expense_type.create({
        data: {
          name: data.name,
          description: data.description,
          parent_id: data.parent_id,
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

  /** Menyunting nama dan deskripsi anak; induknya tidak ikut berpindah. */
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
          parent_id: true,
          is_delete: true,
        },
      });

      if (!result) {
        return null;
      }

      return ExpenseTypeModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error on fetching expense type by ID ${error}`);
      throw new Error("Internal server error");
    }
  }

  /**
   * Saran untuk pencatatan pengeluaran: HANYA ANAK. Induk cuma wadah —
   * pengeluaran yang menempel langsung ke induk membuat gulungan laporan
   * menghitungnya dua kali.
   */
  async fetchAutocomplete(keyword: string) {
    try {
      const result = await this.prisma.expense_type.findMany({
        where: {
          is_delete: false,
          parent_id: {
            not: null,
          },
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

  /** Seluruh induk baku beserta anak hidupnya, untuk daftar dan laporan. */
  async fetch() {
    try {
      const [induk, anak] = await Promise.all([
        this.prisma.expense_type.findMany({
          where: {
            is_delete: false,
            parent_id: null,
          },
          select: {
            id: true,
            name: true,
            description: true,
            created_by: true,
            created_at: true,
            parent_id: true,
          },
          orderBy: {
            name: "asc",
          },
        }),
        this.prisma.expense_type.findMany({
          where: {
            is_delete: false,
            parent_id: {
              not: null,
            },
          },
          select: {
            id: true,
            name: true,
            description: true,
            created_by: true,
            created_at: true,
            parent_id: true,
          },
          orderBy: {
            name: "asc",
          },
        }),
      ]);

      return induk.map((item) =>
        ExpenseTypeModel.fromMap({
          ...item,
          children: anak.filter((a) => a.parent_id === item.id),
        })
      );
    } catch (error) {
      console.error(`[error]: Error on fetching expense types ${error}`);
      throw new Error("Internal server error");
    }
  }

  /** Nama dipertahankan untuk pemanggil lama; isinya sama dengan fetch. */
  async fetchAll() {
    return this.fetch();
  }
}
