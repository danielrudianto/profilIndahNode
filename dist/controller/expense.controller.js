"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const query_transaction_helper_1 = __importDefault(require("../helper/query.transaction.helper"));
const app_1 = require("../app");
const expense_model_1 = __importDefault(require("../model/expense.model"));
const expense_type_model_1 = __importDefault(require("../model/expense.type.model"));
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
class ExpenseController {
}
ExpenseController.create = (req, res) => {
    const description = req.body.description;
    const date = req.body.date;
    const type_id = req.body.expense_type_id;
    const value = req.body.value;
    expense_type_model_1.default.fetchById(type_id).then((type) => {
        if (type == null || type.is_delete) {
            return res.status(404).send("Tipe pengeluaran tidak ditemukan.");
        }
        const expense = new expense_model_1.default(value, description, date, type_id, req.body.userId);
        expense
            .create()
            .then((result) => {
            app_1.io.emit("createExpense", result);
            return res.status(201).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
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
    const expense = expense_model_1.default.fetch(year, month, offset, limit);
    const count = expense_model_1.default.count(year, month);
    const transaction = new query_transaction_helper_1.default();
    transaction
        .create([expense, count])
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
ExpenseController.parentAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    expense_type_model_1.default.fetchAutocomplete(keyword, null)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseController.itemAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    expense_type_model_1.default.fetchItemAutocomplete(keyword)
        .then((result) => {
        const response = [];
        result.forEach((item) => {
            var _a;
            response.push({
                id: item.id,
                name: `${(_a = item.expense_type) === null || _a === void 0 ? void 0 : _a.name}/${item.name}`,
                description: item.description,
            });
        });
        return res.status(200).send(response);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseController.createType = (req, res) => {
    const name = req.body.name;
    const description = req.body.description;
    const parent_id = req.body.parent_id;
    const expenseType = new expense_type_model_1.default(name, description, parent_id, req.body.userId);
    expenseType
        .create()
        .then((result) => {
        app_1.io.emit("createExpenseType", result);
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseController.updateType = (req, res) => {
    const name = req.body.name;
    const description = req.body.description;
    const id = req.body.id;
    const expense_type = new expense_type_model_1.default(name, description, null, req.body.userId, id);
    expense_type
        .update()
        .then((result) => {
        app_1.io.emit("updateExpenseType", result);
        return res.status(200).send(result);
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Expense Type - Update", req.body.userId);
        return res.status(500).send(error);
    });
};
ExpenseController.deleteType = (req, res) => {
    const id = parseInt(req.params.id);
    expense_type_model_1.default.fetchById(id)
        .then((expense) => {
        if (expense == null || expense.is_delete) {
            return res.status(404).send("Data pengeluaran tidak ditemukan.");
        }
        if (expense.parent_id == null) {
            // Data is a parent
            // Check whether there is still class that uses that parent
            expense_type_model_1.default.fetch(expense.id)
                .then((children) => {
                if (children.length == 0) {
                    expense_type_model_1.default.delete(expense.id, req.body.userId)
                        .then((result_delete) => {
                        app_1.io.emit("deleteExpenseType", result_delete);
                        return res.status(201).send(result_delete);
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                }
                else {
                    return res
                        .status(500)
                        .send("Data tidak dapat dihapus karena ada jenis pengeluaran yang menggunakan data ini.");
                }
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
        else {
            // Data is a child
            // Check whether there is still expense data that uses this type
            expense_model_1.default.countByType(expense.id)
                .then((expenses) => {
                if (expenses == 0) {
                    expense_type_model_1.default.delete(expense.id, req.body.userId)
                        .then((result_delete) => {
                        app_1.io.emit("deleteExpenseType", result_delete);
                        return res.status(201).send(result_delete);
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                }
                else {
                    return res
                        .status(500)
                        .send("Data tidak dapat dihapus karena ada pengeluaran yang menggunakan data ini.");
                }
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseController.fetchType = (req, res) => {
    const parent_id = !req.params.parent_id
        ? null
        : parseInt(req.params.parent_id.toString());
    const fetch_expenses = expense_type_model_1.default.fetch(parent_id);
    const fetch_expenses_children = expense_type_model_1.default.fetchChild();
    const fetch_expense_count = expense_model_1.default.countByTypeGroup();
    const transaction = new query_transaction_helper_1.default();
    transaction
        .create([fetch_expenses, fetch_expenses_children, fetch_expense_count])
        .then((result) => {
        const expense_type = [];
        result[0].forEach((item, index) => {
            const id = item.id;
            const name = item.name;
            const description = item.description;
            const parent_id = item.parent_id;
            const children = [];
            result[1]
                .filter((x) => x.parent_id == id)
                .forEach((child) => {
                child.count =
                    result[2].filter((x) => x.expense_type_id == child.id)
                        .length == 0
                        ? 0
                        : result[2].filter((x) => x.expense_type_id == child.id)[0]._count;
                children.push({
                    id: child.id,
                    name: child.name,
                    description: child.description,
                    count: child.count,
                });
            });
            expense_type.push({
                id: id,
                name: name,
                description: description,
                children: children,
            });
        });
        return res.status(200).send(expense_type);
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Expense Type - Fetch", req.body.userId);
        return res.status(500).send(error);
    });
    expense_type_model_1.default.fetch(parent_id)
        .then((result) => { })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseController.fetchTypeById = (req, res) => {
    const id = parseInt(req.params.id);
    expense_type_model_1.default.fetchById(id)
        .then((result) => {
        if ((result === null || result === void 0 ? void 0 : result.parent_id) == null) {
            // Get the children
            expense_type_model_1.default.fetch(result === null || result === void 0 ? void 0 : result.id)
                .then((children) => {
                return res.status(200).send(Object.assign(Object.assign({}, result), { children: children }));
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
        else {
            expense_model_1.default.countByType(result === null || result === void 0 ? void 0 : result.id)
                .then((count) => {
                return res.status(200).send(Object.assign(Object.assign({}, result), { count: count }));
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    expense_model_1.default.fetchById(id).then(result => {
        if (result == null) {
            return res.status(404).send("Pengeluaran tidak ditemukan.");
        }
        else {
            return res.status(200).send(Object.assign(Object.assign({}, result), { value: parseFloat(result.value.toString()) }));
        }
    }).catch(error => {
        return res.status(500).send(error);
    });
};
ExpenseController.deleteById = (req, res) => {
    const id = parseInt(req.params.id);
    const user_id = req.body.userId;
    expense_model_1.default.deleteById(id, user_id).then(result => {
        const socket = new socket_helper_1.default("deleteExpense", result);
        socket.create();
        return res.status(200).send(result);
    }).catch(error => {
        return res.status(500).send(error);
    });
};
exports.default = ExpenseController;
