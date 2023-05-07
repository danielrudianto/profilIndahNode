"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const expense_model_1 = __importDefault(require("../model/expense.model"));
const expense_type_model_1 = __importDefault(require("../model/expense.type.model"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
class ExpenseController {
}
ExpenseController.create = (req, res) => {
    const description = req.body.description;
    const date = new Date(req.body.date);
    const expense_type_id = req.body.expense_type_id;
    const value = req.body.value;
    const company_id = req.body.company_id;
    expense_type_model_1.default.fetchById(expense_type_id).then((type) => {
        if (type == null || type.is_delete) {
            return res.status(404).send("Tipe pengeluaran tidak ditemukan.");
        }
        const expense = new expense_model_1.default(value, description, date, expense_type_id, company_id, req.body.userId);
        expense
            .create()
            .then((result) => {
            const socket = new socket_helper_1.default("createExpense", result);
            socket.create();
            return res.status(201).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    });
};
ExpenseController.update = (req, res) => {
    const id = req.body.id;
    const description = req.body.description;
    const date = new Date(req.body.date);
    const type_id = req.body.expense_type_id;
    const value = req.body.value;
    const company_id = req.body.company_id;
    const expense = new expense_model_1.default(value, description, date, type_id, company_id, req.body.userId, id);
    expense
        .update()
        .then((result) => {
        const socket = new socket_helper_1.default("updateExpense", result);
        socket.create();
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseController.fetch = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    Promise.all([
        expense_model_1.default.fetch(year, month, offset, limit),
        expense_model_1.default.count(year, month),
    ])
        .then((result) => {
        return res.status(200).send({
            data: result[0],
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    expense_model_1.default.fetchById(id)
        .then((result) => {
        if (result == null) {
            return res.status(404).send("Pengeluaran tidak ditemukan.");
        }
        else {
            return res.status(200).send(Object.assign(Object.assign({}, result), { value: parseFloat(result.value.toString()) }));
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseController.deleteById = (req, res) => {
    const id = parseInt(req.params.id);
    const user_id = req.body.userId;
    expense_model_1.default.deleteById(id, user_id)
        .then((result) => {
        const socket = new socket_helper_1.default("deleteExpense", result);
        socket.create();
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = ExpenseController;
