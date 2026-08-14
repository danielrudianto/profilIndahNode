import { CompanyModel } from "../models/company.model";
import ExpenseTypeModel from "../models/expense-type.model";
import { UserViewModel } from "../models/user.model";

export interface IExpense {
  id?: number;
  date: Date;
  value: number;
  created_at?: Date;
  created_by: number;
  description: string;
  expense_type_id: number;
  company_id: number;
  is_delete?: boolean;
  deleted_by?: number;
  deleted_at?: Date;
  expense_type?: ExpenseTypeModel;
  company?: CompanyModel;

  user_expense_created_byTouser?: UserViewModel;
  user_expense_deleted_byTouser?: UserViewModel | null;
}
