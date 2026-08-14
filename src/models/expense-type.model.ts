import { IExpenseType } from "../interfaces/expense-type.interface";
import { prisma } from "../utils/database.helper";

export class ExpenseTypeModel {
  id?: number;
  name: string;
  description: string;
  created_by: number;
  created_at?: Date;
  parent_id: number | null;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  can_delete?: boolean = false;
  parent?: ExpenseTypeModel | null;
  children?: ExpenseTypeModel[] = [];

  constructor(data: IExpenseType) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.created_by = data.created_by;
    this.created_at = data.created_at || new Date();
    this.parent_id = data.parent_id;
    this.is_delete = data.is_delete || false;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;
    this.can_delete = data.can_delete;
    this.children = data.children || [];
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
      can_delete: data.can_delete || false,
      children: data.children,
    });
  }

  /**
   * Fetch expenses
   * It can be used for autocomplete, fetch all, fetch parent, or fetch child
   * @param keyword
   * @param limit
   * @param offset
   * @param mode
   * @returns Promise<IExpenseType[]>
   */

  /**
   * Fetch expense by ID
   * @param id
   * @returns
   */
  static async fetchByID(id: number) {
    try {
      var result = await prisma.expense_type.findUnique({
        where: {
          id: id,
        },
      });

      if (!result) {
        return null;
      }

      return new ExpenseTypeModel({
        id: result.id,
        name: result.name,
        description: result.description,
        created_by: result.created_by,
        created_at: result.created_at,
        parent_id: result.parent_id,
        is_delete: result.is_delete,
        deleted_by: result.deleted_by,
        deleted_at: result.deleted_at,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching expense type by id ${error}`);
      throw error;
    }
  }

  static async fetchByParentID(id: number) {
    try {
      var parentResult = await prisma.expense_type.findMany({
        where: {
          parent_id: id,
        },
      });

      // return list of children
      return parentResult.map((expenseType) => {
        return new ExpenseTypeModel({
          id: expenseType.id,
          name: expenseType.name,
          description: expenseType.description,
          created_by: expenseType.created_by,
          created_at: expenseType.created_at,
          parent_id: expenseType.parent_id,
          is_delete: expenseType.is_delete,
          deleted_by: expenseType.deleted_by,
          deleted_at: expenseType.deleted_at,
        });
      });
    } catch (error) {
      console.error(`[error]: Error on fetching expense type by id ${error}`);
      throw error;
    }
  }
}

export default ExpenseTypeModel;
