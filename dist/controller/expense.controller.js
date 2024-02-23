"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const expense_model_1 = __importDefault(require("../model/expense.model"));
const expense_type_model_1 = __importDefault(require("../model/expense.type.model"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const error_list_1 = __importDefault(require("../assets/error_list"));
class ExpenseController {
}
_a = ExpenseController;
/**
 * Create new expense record
 * Expense record is created by user
 * in order to calculate the company's expense
 * and used to calculate the company's profit
 * @param req
 * @param res
 */
ExpenseController.create = (req, res) => {
    const description = req.body.description;
    const date = new Date(req.body.date);
    const expense_type_id = req.body.expense_type_id;
    const value = req.body.value;
    const company_id = req.body.company_id;
    const userID = req.body.userID;
    expense_type_model_1.default.fetchByID(expense_type_id).then((type) => {
        if (!type) {
            return res.status(404).send(error_list_1.default["Expense type not found"]);
        }
        if (type.is_delete) {
            return res.status(404).send(error_list_1.default["Expense type not found"]);
        }
        expense_model_1.default.create({
            value: value,
            description: description,
            date: date,
            expense_type_id: expense_type_id,
            company_id: company_id,
            created_by: userID,
        })
            .then((result) => {
            const socket = new socket_helper_1.default("createExpense", result);
            socket.create();
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on creating expense: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    });
};
/**
 * Fetch expense record by ID
 * @param req
 * @param res
 */
ExpenseController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    expense_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send("Pengeluaran tidak ditemukan.");
        }
        return res.status(200).send(Object.assign(Object.assign({}, result), { value: parseFloat(result.value.toString()) }));
    })
        .catch((error) => {
        console.error(`[error]: Error on deleting expense: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Update expense record
 * Expense record is created by user
 * in order to calculate the company's expense
 * and used to calculate the company's profit
 * @param req
 * @param res
 */
ExpenseController.updateByID = (req, res) => {
    const id = req.body.id;
    const description = req.body.description;
    const date = new Date(req.body.date);
    const type_id = req.body.expense_type_id;
    const value = req.body.value;
    const company_id = req.body.company_id;
    const userID = req.body.userID;
    expense_model_1.default.updateByID({
        id: id,
        value: value,
        description: description,
        date: date,
        expense_type_id: type_id,
        company_id: company_id,
        created_by: userID,
    })
        .then((result) => {
        const socket = new socket_helper_1.default("updateExpense", result);
        socket.create();
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on updating expense: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch expense record by year and month
 * @param req
 * @param res
 */
ExpenseController.fetch = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    expense_model_1.default.fetch(year, month, offset, limit)
        .then((result) => {
        return res.status(200).send({
            data: result[0],
            count: result[1],
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching expense: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Delete expense record by ID
 * @param req
 * @param res
 */
ExpenseController.deleteByID = (req, res) => {
    const id = parseInt(req.params.id);
    const user_id = req.body.userID;
    expense_model_1.default.deleteByID(id, user_id)
        .then((result) => {
        const socket = new socket_helper_1.default("deleteExpense", result);
        socket.create();
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on deleting expense: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch expense
 * @param req
 * @param res
 */
ExpenseController.fetchDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const todayDate = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    Promise.all([
        expense_model_1.default.fetchTodaySum(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()),
        expense_model_1.default.fetchTodaySum(yesterdayDate.getFullYear(), yesterdayDate.getMonth(), yesterdayDate.getDate()),
        expense_model_1.default.fetchTodaySum(todayDate.getFullYear(), todayDate.getMonth() + 1),
        expense_model_1.default.fetchTodaySum(todayDate.getFullYear(), todayDate.getMonth()),
    ])
        .then(([expense1, expense2, expense3, expense4]) => {
        return res.status(200).send({
            today: expense1[0].value == null ? 0 : parseFloat(expense1[0].value),
            yesterday: expense2[0].value == null ? 0 : parseFloat(expense2[0].value),
            thisMonth: expense3[0].value == null ? 0 : parseFloat(expense3[0].value),
            lastMonth: expense4[0].value == null ? 0 : parseFloat(expense4[0].value),
        });
    })
        .catch((error) => {
        console.error(error);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
exports.default = ExpenseController;
//# sourceMappingURL=expense.controller.js.map