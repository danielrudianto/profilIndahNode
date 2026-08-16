import { IExpenseType } from "../interfaces/expense-type.interface";

/**
 * Tipe pengeluaran — daftar DATAR yang baku.
 *
 * Hirarki induk-anak dibuang atas keputusan pemilik: dua tingkat membuat
 * pencatatan berbelit tanpa menambah arti pada laporan. Kolom parent_id
 * masih ada di basis data sebagai warisan, tetapi tidak lagi dibaca maupun
 * ditulis oleh lapisan mana pun. Isi daftarnya dijaga lewat seeder
 * (`npm run start:seed-expense-type`); endpoint tulisnya hanya untuk super
 * administrator sebagai pintu darurat.
 */
export class ExpenseTypeModel {
  id?: number;
  name: string;
  description: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;

  constructor(data: IExpenseType) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.created_by = data.created_by;
    this.created_at = data.created_at || new Date();
    this.is_delete = data.is_delete || false;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;
  }

  static fromMap(data: any): ExpenseTypeModel {
    return new ExpenseTypeModel({
      id: data.id,
      name: data.name,
      description: data.description,
      created_by: data.created_by,
      created_at: data.created_at,
      is_delete: data.is_delete,
      deleted_by: data.deleted_by,
      deleted_at: data.deleted_at,
    });
  }
}

export default ExpenseTypeModel;
