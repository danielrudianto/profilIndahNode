"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseReportModel = exports.ExpenseModel = void 0;
const company_model_1 = require("./company.model");
const expense_type_model_1 = __importDefault(require("./expense.type.model"));
const user_model_1 = require("./user.model");
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
        this.user_expense_created_byTouser = data.user_expense_created_byTouser;
        this.user_expense_deleted_byTouser = data.user_expense_deleted_byTouser;
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
            expense_type: data.expense_type == undefined
                ? undefined
                : expense_type_model_1.default.fromMap(data.expense_type),
            user_expense_created_byTouser: data.user_expense_created_byTouser == undefined
                ? undefined
                : user_model_1.UserViewModel.fromMap(data.user_expense_created_byTouser),
            user_expense_deleted_byTouser: data.user_expense_deleted_byTouser == null
                ? null
                : data.user_expense_deleted_byTouser == undefined
                    ? undefined
                    : user_model_1.UserViewModel.fromMap(data.user_expense_deleted_byTouser),
            company: data.company == undefined
                ? undefined
                : company_model_1.CompanyModel.fromMap(data.company),
        });
    }
}
exports.ExpenseModel = ExpenseModel;
class ExpenseReportModel {
}
exports.ExpenseReportModel = ExpenseReportModel;
//# sourceMappingURL=expense.model.js.map