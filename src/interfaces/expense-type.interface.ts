export interface IExpenseType {
  id?: number;
  name: string;
  description: string;
  created_by: number;
  created_at?: Date;
  /**
   * null berarti INDUK — kategori baku dari seeder yang tidak bisa diubah
   * maupun dihapus lewat API. Anak selalu menunjuk salah satu induk baku dan
   * bebas dikelola pengguna.
   */
  parent_id?: number | null;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  children?: IExpenseType[];
}
