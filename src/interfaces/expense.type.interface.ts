import { ExpenseTypeModel } from "../models/expense.type.model";

export interface IExpenseType {
  id?: number;
  name: string;
  description: string;
  created_by: number;
  created_at?: Date;
  parent_id: number | null;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  can_delete?: boolean;

  children?: ExpenseTypeModel[];
}
