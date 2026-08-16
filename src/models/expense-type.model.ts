import { IExpenseType } from "../interfaces/expense-type.interface";

/**
 * Tipe pengeluaran dua tingkat dengan INDUK BAKU.
 *
 * Induk (parent_id null) adalah kategori besar yang ditanam seeder
 * (`npm run start:seed-expense-type`) dan tidak bisa diubah maupun dihapus
 * lewat API — itulah yang menjaga laporan tetap seragam. Anak bebas dikelola
 * pengguna dan wajib menunjuk salah satu induk; pengeluaran dicatat ke anak.
 */
export class ExpenseTypeModel {
  id?: number;
  name: string;
  description: string;
  created_by: number;
  created_at?: Date;
  parent_id?: number | null;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  children?: ExpenseTypeModel[];

  constructor(data: IExpenseType) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.created_by = data.created_by;
    this.created_at = data.created_at || new Date();
    this.parent_id = data.parent_id ?? null;
    this.is_delete = data.is_delete || false;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;
    this.children = (data.children ?? []).map((anak) =>
      anak instanceof ExpenseTypeModel ? anak : new ExpenseTypeModel(anak)
    );
  }

  static fromMap(data: any): ExpenseTypeModel {
    return new ExpenseTypeModel({
      id: data.id,
      name: data.name,
      description: data.description,
      created_by: data.created_by,
      created_at: data.created_at,
      parent_id: data.parent_id,
      is_delete: data.is_delete,
      deleted_by: data.deleted_by,
      deleted_at: data.deleted_at,
      children: data.children,
    });
  }
}

export default ExpenseTypeModel;
