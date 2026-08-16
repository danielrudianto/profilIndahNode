export interface IExpenseType {
  id?: number;
  name: string;
  description: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
}
