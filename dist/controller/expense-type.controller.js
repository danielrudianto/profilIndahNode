"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const expense_model_1 = __importDefault(require("../model/expense.model"));
const expense_type_model_1 = __importDefault(require("../model/expense.type.model"));
class ExpenseTypeController {
}
ExpenseTypeController.create = (req, res) => {
    const name = req.body.name;
    const description = req.body.description;
    const parent_id = req.body.parent_id;
    const expenseType = new expense_type_model_1.default(name, description, parent_id, req.body.userId);
    expenseType
        .create()
        .then((result) => {
        const socket = new socket_helper_1.default("createExpenseType", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseTypeController.fetch = (req, res) => {
    const parent_id = !req.params.parent_id
        ? null
        : parseInt(req.params.parent_id.toString());
    const fetch_expenses = expense_type_model_1.default.fetch(parent_id);
    const fetch_expenses_children = expense_type_model_1.default.fetchChild();
    const fetch_expense_count = expense_model_1.default.countByTypeGroup();
    Promise.all([fetch_expenses, fetch_expenses_children, fetch_expense_count])
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
        return res.status(500).send(error);
    });
    expense_type_model_1.default.fetch(parent_id)
        .then((result) => { })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ExpenseTypeController.fetchByID = (req, res) => {
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
ExpenseTypeController.fetchAutocomplete = (req, res) => {
    var _a, _b;
    const mode = req.query.mode;
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    if (mode == "child") {
        (_a = expense_type_model_1.default.fetchAutocomplete(keyword, "child")) === null || _a === void 0 ? void 0 : _a.then((result) => {
            return res.status(200).send(result);
        });
    }
    else if (mode == "parent") {
        (_b = expense_type_model_1.default.fetchAutocomplete(keyword, "parent")) === null || _b === void 0 ? void 0 : _b.then((result) => {
            return res.status(200).send(result);
        });
    }
};
ExpenseTypeController.delete = (req, res) => {
    const id = parseInt(req.params.id);
    expense_type_model_1.default.fetchById(id)
        .then((expense) => {
        if (expense == null || expense.is_delete) {
            return res.status(404).send("Data pengeluaran tidak ditemukan.");
        }
        if (expense.parent_id == null) {
            expense_type_model_1.default.fetch(expense.id)
                .then((children) => {
                if (children.length == 0) {
                    expense_type_model_1.default.delete(expense.id, req.body.userId)
                        .then((result_delete) => {
                        const socket = new socket_helper_1.default("deleteExpenseType", result_delete);
                        socket.create();
                        return res.status(201).send(result_delete);
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                }
                else {
                    return res.status(500).send(error_list_1.default["Delete error"]);
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
                        const socket = new socket_helper_1.default("deleteExpenseType", result_delete);
                        socket.create();
                        return res.status(201).send(result_delete);
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                }
                else {
                    return res.status(500).send(error_list_1.default["Delete error"]);
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
ExpenseTypeController.update = (req, res) => {
    const name = req.body.name;
    const description = req.body.description;
    const id = req.body.id;
    const expense_type = new expense_type_model_1.default(name, description, null, req.body.userId, id);
    expense_type
        .update()
        .then((result) => {
        const socket = new socket_helper_1.default("updateExpenseType", result);
        socket.create();
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = ExpenseTypeController;
