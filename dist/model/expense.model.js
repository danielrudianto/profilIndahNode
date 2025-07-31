"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseReportModel = exports.ExpenseModel = void 0;
class ExpenseModel {
    constructor(data) {
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
        this.expense_type = data.expense_type;
        this.company = data.company;
    }
    static fromMap(data) {
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
}
exports.ExpenseModel = ExpenseModel;
class ExpenseReportModel {
}
exports.ExpenseReportModel = ExpenseReportModel;
//# sourceMappingURL=expense.model.js.map