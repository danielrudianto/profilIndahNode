import { IExpense } from "../interfaces/expense.interface";
import { CompanyModel } from "./company.model";
import ExpenseTypeModel from "./expense-type.model";
import { UserViewModel } from "./user.model";

export class ExpenseModel {
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

  constructor(data: IExpense) {
    this.id = data.id;
    this.date = data.date;
    this.value = data.value;
    this.created_at = data.created_at || new Date();
    this.created_by = data.created_by;
    this.description = data.description;
    this.expense_type_id = data.expense_type_id;
    this.company_id = data.company_id;
    this.is_delete = data.is_delete;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;

    this.user_expense_created_byTouser = data.user_expense_created_byTouser;
    this.user_expense_deleted_byTouser = data.user_expense_deleted_byTouser;

    this.expense_type = data.expense_type;
    this.company = data.company;
  }

  static fromMap(data: any): ExpenseModel {
    return new ExpenseModel({
      id: data.id,
      date: data.date,
      value: Number(data.value),
      created_at: data.created_at,
      created_by: data.created_by,
      description: data.description,
      expense_type_id: data.expense_type_id,
      company_id: data.company_id,
      is_delete: data.is_delete,
      deleted_by: data.deleted_by,
      deleted_at: data.deleted_at,
      expense_type:
        data.expense_type == undefined
          ? undefined
          : ExpenseTypeModel.fromMap(data.expense_type),
      user_expense_created_byTouser:
        data.user_expense_created_byTouser == undefined
          ? undefined
          : UserViewModel.fromMap(data.user_expense_created_byTouser),
      user_expense_deleted_byTouser:
        data.user_expense_deleted_byTouser == null
          ? null
          : data.user_expense_deleted_byTouser == undefined
            ? undefined
            : UserViewModel.fromMap(data.user_expense_deleted_byTouser),
      company:
        data.company == undefined
          ? undefined
          : CompanyModel.fromMap(data.company),
    });
  }

  /**
   * Fetch appendix for report
   * @param month
   * @param year
   * @returns
   */
}
