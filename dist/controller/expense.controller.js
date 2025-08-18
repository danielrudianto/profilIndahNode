"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
class ExpenseController {
    constructor(expenseRepository, companyRepository, expenseTypeRepository) {
        this.create = async (req, res) => {
            const description = req.body.description;
            const date = new Date(req.body.date);
            const expenseTypeID = req.body.expense_type_id;
            const value = req.body.value;
            const companyID = req.body.company_id;
            const userID = req.body.userId;
            try {
                const result = await this.expenseRepository.create({
                    description: description,
                    date: date,
                    expense_type_id: expenseTypeID,
                    value: value,
                    company_id: companyID,
                    created_by: userID,
                    created_at: new Date(),
                });
                const socket = new socket_helper_1.default("createExpense", result);
                socket.create();
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on creating expense: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.update = async (req, res) => {
            const id = req.body.id;
            const description = req.body.description;
            const expenseTypeID = req.body.expense_type_id;
            const value = req.body.value;
            const companyID = req.body.company_id;
            const userID = req.body.userId;
            const date = new Date(req.body.date);
            try {
                const result = await this.expenseRepository.update({
                    id: id,
                    description: description,
                    date: date,
                    expense_type_id: expenseTypeID,
                    value: value,
                    company_id: companyID,
                    created_by: userID,
                    created_at: new Date(),
                });
                const socket = new socket_helper_1.default("updateExpense", result);
                socket.create();
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating expense: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const userID = req.body.userId;
            try {
                const expense = await this.expenseRepository.fetchByID(id);
                if (!expense) {
                    return res.status(404).send(error_list_1.default["Expense not found"]);
                }
                if (expense.is_delete) {
                    return res.status(404).send(error_list_1.default["Expense not found"]);
                }
                const result = await this.expenseRepository.delete(id, userID);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on deleting expense: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            try {
                const year = Number(req.query.year);
                const month = Number(req.query.month);
                const page = (0, escape_helper_1.translatePage)(req.query.page);
                const pageSize = Number(process.env.LIMIT);
                const result = await this.expenseRepository.fetch({
                    year: year,
                    month: month,
                    page: page,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                return res.status(500).send(error);
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const result = await this.expenseRepository.fetchByID(id);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching expense by ID: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchReport = async (req, res) => {
            const month = Number(req.query.month);
            const year = Number(req.query.year);
            try {
                const result = await this.expenseRepository.fetchReport(month, year);
                const company = await this.companyRepository.fetchAll();
                const expenseTypes = await this.expenseTypeRepository.fetchAll({
                    withChildren: true,
                });
                return res.status(200).send({
                    result: result,
                    company: company,
                    expenseTypes: expenseTypes,
                });
            }
            catch (error) {
                console.error(`[error]: Error on fetching expense report: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchSummary = async (req, res) => {
            const startToday = new Date();
            startToday.setHours(0, 0, 0, 0);
            const endToday = new Date();
            endToday.setHours(23, 59, 59, 999);
            const startYesterday = new Date();
            startYesterday.setDate(startYesterday.getDate() - 1);
            startYesterday.setHours(0, 0, 0, 0);
            const endYesterday = new Date();
            endYesterday.setDate(endYesterday.getDate() - 1);
            endYesterday.setHours(23, 59, 59, 999);
            const startThisMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1, 0, 0, 0, 0);
            const endThisMonth = new Date(startToday.getFullYear(), startToday.getMonth() + 1, 0, 23, 59, 59, 999);
            const startLastMonth = new Date(startToday.getFullYear(), startToday.getMonth() - 1, 1, 0, 0, 0, 0);
            const endLastMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 0, 23, 59, 59, 999);
            try {
                const [todaySum, yesterdaySum, thisMonthSum, lastMonthSum] = await Promise.all([
                    this.expenseRepository.fetchSum(startToday, endToday),
                    this.expenseRepository.fetchSum(startYesterday, endYesterday),
                    this.expenseRepository.fetchSum(startThisMonth, endThisMonth),
                    this.expenseRepository.fetchSum(startLastMonth, endLastMonth),
                ]);
                return res.status(200).send({
                    today: todaySum,
                    yesterday: yesterdaySum,
                    thisMonth: thisMonthSum,
                    lastMonth: lastMonthSum,
                });
            }
            catch (error) {
                console.error(`[error]: Error on fetching expense summary: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.expenseRepository = expenseRepository;
        this.companyRepository = companyRepository;
        this.expenseTypeRepository = expenseTypeRepository;
    }
}
exports.default = ExpenseController;
//# sourceMappingURL=expense.controller.js.map