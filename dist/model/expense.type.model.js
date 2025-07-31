"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseTypeModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ExpenseTypeModel {
    constructor(data) {
        this.can_delete = false;
        this.children = [];
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
    static fromMap(data) {
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
    // static fetch(
    //   keyword: string,
    //   limit: number,
    //   offset: number,
    //   mode: fetchMode,
    //   id?: number
    // ) {
    //   switch (mode) {
    //     case fetchMode.ParentAutocomplete:
    //       return prisma.expense_type.findMany({
    //         where: {
    //           is_delete: false,
    //           parent_id: null,
    //           OR: [
    //             {
    //               name: {
    //                 contains: keyword,
    //               },
    //             },
    //             {
    //               description: {
    //                 contains: keyword,
    //               },
    //             },
    //           ],
    //         },
    //         orderBy: {
    //           name: "asc",
    //         },
    //         take: limit,
    //         skip: offset,
    //       });
    //     case fetchMode.ChildAutocomplete:
    //       return prisma.expense_type.findMany({
    //         where: {
    //           is_delete: false,
    //           parent_id: {
    //             not: null,
    //           },
    //           OR: [
    //             {
    //               name: {
    //                 contains: keyword,
    //               },
    //             },
    //             {
    //               description: {
    //                 contains: keyword,
    //               },
    //             },
    //           ],
    //         },
    //         orderBy: {
    //           name: "asc",
    //         },
    //         take: limit,
    //         skip: offset,
    //       });
    //     case fetchMode.Child:
    //       return prisma.expense_type.findMany({
    //         where: {
    //           is_delete: false,
    //           parent_id: {
    //             not: null,
    //           },
    //         },
    //         select: {
    //           id: true,
    //           name: true,
    //           description: true,
    //           parent_id: true,
    //         },
    //       });
    //     case fetchMode.ChildByParentID:
    //       return prisma.expense_type.findMany({
    //         where: {
    //           is_delete: false,
    //           parent_id: id,
    //         },
    //         select: {
    //           id: true,
    //           name: true,
    //           description: true,
    //           parent_id: true,
    //         },
    //       });
    //     case fetchMode.AllV2:
    //       return prisma.$queryRaw<any[]>`
    //         SELECT expense_type.id, expense_type.name, expense_type.description,
    //         IF(COALESCE(c.count, 0) > 0, 0, 1) AS can_delete
    //         FROM expense_type
    //         LEFT JOIN (
    //           SELECT COUNT(id) AS count, expense_type.parent_id
    //           FROM expense_type
    //           WHERE is_delete = 0
    //           AND expense_type.parent_id IS NOT NULL
    //           GROUP BY expense_type.parent_id
    //         ) c
    //         ON expense_type.id = c.parent_id
    //         WHERE is_delete = 0 AND expense_type.parent_id IS NULL`;
    //       break;
    //     case fetchMode.All:
    //     default:
    //       return prisma.expense_type.findMany({
    //         where: {
    //           is_delete: false,
    //         },
    //         select: {
    //           id: true,
    //           name: true,
    //           description: true,
    //           parent_id: true,
    //         },
    //       });
    //   }
    // }
    /**
     * Fetch expense by ID
     * @param id
     * @returns
     */
    static async fetchByID(id) {
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
        }
        catch (error) {
            console.error(`[error]: Error on fetching expense type by id ${error}`);
            throw error;
        }
    }
    static async fetchByParentID(id) {
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
        }
        catch (error) {
            console.error(`[error]: Error on fetching expense type by id ${error}`);
            throw error;
        }
    }
}
exports.ExpenseTypeModel = ExpenseTypeModel;
exports.default = ExpenseTypeModel;
//# sourceMappingURL=expense.type.model.js.map