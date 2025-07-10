import ExpenseTypeModel from "./expense.type.model";

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
}

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
    });
  }

  // static countByType(expense_type_id: number) {
  //   return prisma.expense.count({
  //     where: {
  //       is_delete: false,
  //       expense_type_id: expense_type_id,
  //     },
  //   });
  // }

  // static countByTypeGroup() {
  //   return prisma.expense.groupBy({
  //     by: ["expense_type_id"],
  //     _count: true,
  //     where: {
  //       is_delete: false,
  //     },
  //   });
  // }

  /**
   * Fetch appendix for report
   * @param month
   * @param year
   * @returns
   */
  // static fetchAppendix(month: number, year: number) {
  //   return prisma.$queryRawUnsafe<any[]>(`
  //     SELECT expense_type.name, expense.value, expense_type.description,
  //     company.name AS company_name, expense.date
  //     FROM expense
  //     JOIN expense_type ON expense_type.id = expense.expense_type_id
  //     JOIN company ON expense.company_id = company.id
  //     WHERE YEAR(expense.date) = ${year}
  //     ${month == 0 ? "" : `AND MONTH(expense.date) = ${month}`}
  //     AND expense.is_delete = 0
  //     ORDER BY expense.date ASC
  //   `);
  // }
}

export class ExpenseReportModel {}
