import { PrismaClient } from "@prisma/client";
import { fetchMode } from "../interface/fetch.interface";

const prisma = new PrismaClient();

export interface IExpenseType {
  id?: number;
  name: string;
  description: string;
  created_by: number;
  created_at?: Date;
  parent_id?: number;
  is_delete?: boolean;
  deleted_by?: number;
  deleted_at?: Date;
}

interface IDeleteExpenseType {
  id: number;
  deleted_by: number;
}

class ExpenseTypeModel {
  /**
   * Create new expense type
   * @param data
   * @returns Promise<IExpenseType>
   */
  static create(data: IExpenseType) {
    return prisma.expense_type.create({
      data: {
        name: data.name,
        description: data.description,
        created_by: data.created_by,
        created_at: data.created_at,
        parent_id: data.parent_id,
      },
    });
  }

  /**
   * Update expense type by ID
   * @param data
   * @returns Promise<IExpenseType>
   */
  static updateByID(data: IExpenseType) {
    return prisma.expense_type.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  /**
   * Delete expense type by ID
   * Before deleting, check whether the data is a parent or child
   * Then check if there is still expense data that uses this type
   * @param id
   * @param created_by
   * @returns
   */
  static deleteByID(data: IDeleteExpenseType) {
    return prisma.expense_type.update({
      where: {
        id: data.id,
      },
      data: {
        is_delete: true,
        deleted_at: new Date(),
        deleted_by: data.deleted_by,
      },
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
      },
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
  static fetch(
    keyword: string,
    limit: number,
    offset: number,
    mode: fetchMode
  ) {
    switch (mode) {
      case fetchMode.ParentAutocomplete:
        return prisma.expense_type.findMany({
          where: {
            is_delete: false,
            parent_id: null,
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
          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
        });
      case fetchMode.ChildAutocomplete:
        return prisma.expense_type.findMany({
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
          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
        });
      case fetchMode.Child:
        return prisma.expense_type.findMany({
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
            parent_id: true,
          },
        });
      case fetchMode.All:
      default:
        return prisma.expense_type.findMany({
          where: {
            is_delete: false,
          },
          select: {
            id: true,
            name: true,
            description: true,
            parent_id: true,
          },
        });
    }
  }

  /**
   * Fetch expense by ID
   * @param id
   * @returns
   */
  static fetchByID(id: number) {
    return prisma.expense_type.findUnique({
      where: {
        id: id,
      },
    });
  }

  static fetchByParentID(id: number) {
    return prisma.expense_type.findMany({
      where: {
        parent_id: id,
        is_delete: false,
      },
    });
  }
}

export default ExpenseTypeModel;
