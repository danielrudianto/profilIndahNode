"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseRepository = void 0;
const company_model_1 = require("../model/company.model");
const expense_model_1 = require("../model/expense.model");
const expense_type_model_1 = __importDefault(require("../model/expense.type.model"));
class ExpenseRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            const result = await this.prisma.expense.create({
                data: {
                    description: data.description,
                    date: data.date,
                    company_id: data.company_id,
                    value: data.value,
                    created_by: data.created_by,
                    created_at: data.created_at,
                    expense_type_id: data.expense_type_id,
                },
            });
            return new expense_model_1.ExpenseModel({
                id: result.id,
                description: result.description,
                date: result.date,
                company_id: result.company_id,
                value: Number(result.value),
                created_by: result.created_by,
                created_at: result.created_at,
                expense_type_id: result.expense_type_id,
            });
        }
        catch (error) {
            console.error(`[error]: Error on creating expense ${error}`);
            throw error;
        }
    }
    async update(data) {
        try {
            const id = data.id;
            const result = await this.prisma.expense.update({
                where: { id },
                data: {
                    description: data.description,
                    date: data.date,
                    company_id: data.company_id,
                    value: data.value,
                    created_by: data.created_by,
                    created_at: data.created_at,
                    expense_type_id: data.expense_type_id,
                },
            });
            return new expense_model_1.ExpenseModel({
                id: result.id,
                description: result.description,
                date: result.date,
                company_id: result.company_id,
                value: Number(result.value),
                created_by: result.created_by,
                created_at: result.created_at,
                expense_type_id: result.expense_type_id,
            });
        }
        catch (error) {
            console.error(`[error]: Error on updating expense ${error}`);
            throw error;
        }
    }
    async delete(id, userID) {
        try {
            const result = await this.prisma.expense.update({
                where: { id },
                data: {
                    deleted_by: userID,
                    deleted_at: new Date(),
                },
            });
            return new expense_model_1.ExpenseModel({
                id: result.id,
                description: result.description,
                date: result.date,
                company_id: result.company_id,
                value: Number(result.value),
                created_by: result.created_by,
                created_at: result.created_at,
                expense_type_id: result.expense_type_id,
            });
        }
        catch (error) {
            console.error(`[error]: Error on deleting expense ${error}`);
            throw error;
        }
    }
    async fetch(data) {
        try {
            const where = {
                date: {
                    gte: new Date(data.year, data.month - 1, 1, 0, 0, 0),
                    lt: new Date(data.year, data.month, 1, 0, 0, 0),
                },
            };
            const [result, count] = await Promise.all([
                this.prisma.expense.findMany({
                    where,
                    skip: (data.page - 1) * data.pageSize,
                    take: data.pageSize,
                    orderBy: { date: "desc" },
                    include: {
                        expense_type: true,
                        company: true,
                    },
                }),
                this.prisma.expense.count({ where }),
            ]);
            return {
                data: result.map((item) => new expense_model_1.ExpenseModel({
                    id: item.id,
                    description: item.description,
                    date: item.date,
                    company_id: item.company_id,
                    value: Number(item.value),
                    created_by: item.created_by,
                    created_at: item.created_at,
                    expense_type_id: item.expense_type_id,
                    expense_type: expense_type_model_1.default.fromMap(item.expense_type),
                    company: company_model_1.CompanyModel.fromMap(item.company),
                })),
                count: count,
            };
        }
        catch (error) {
            console.error(`[error]: Error on fetching expenses ${error}`);
            throw error;
        }
    }
    async fetchSum(startDate, endDate) {
        try {
            const result = await this.prisma.expense.aggregate({
                _sum: {
                    value: true,
                },
                where: {
                    date: {
                        gte: startDate,
                        lt: endDate,
                    },
                },
            });
            return Number(result._sum.value) || 0;
        }
        catch (error) {
            console.error(`[error]: Error on fetching expense sum ${error}`);
            throw error;
        }
    }
    async fetchReport(month, year) {
        try {
            const result = await this.prisma.expense.findMany({
                where: {
                    date: {
                        gte: new Date(year, month - 1, 1, 0, 0, 0),
                        lt: new Date(year, month, 1, 0, 0, 0),
                    },
                    is_delete: false,
                },
                orderBy: { date: "desc" },
            });
            return result.map((x) => {
                return expense_model_1.ExpenseModel.fromMap(x);
            });
        }
        catch (error) {
            console.error(`[error]: Error on fetching expense report ${error}`);
            throw error;
        }
    }
    async fetchByID(id) {
        try {
            const result = await this.prisma.expense.findUnique({
                where: { id },
                include: {
                    expense_type: true,
                    user_expense_created_byTouser: {
                        include: {
                            user_avatar: true,
                        },
                    },
                    user_expense_deleted_byTouser: {
                        include: {
                            user_avatar: true,
                        },
                    },
                    company: true,
                },
            });
            if (!result) {
                return null;
            }
            return expense_model_1.ExpenseModel.fromMap(result);
        }
        catch (error) {
            throw error;
        }
    }
}
exports.ExpenseRepository = ExpenseRepository;
//# sourceMappingURL=expense.repository.js.map