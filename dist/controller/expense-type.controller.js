"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const fetch_interface_1 = require("../interface/fetch.interface");
const expense_model_1 = __importDefault(require("../model/expense.model"));
const expense_type_model_1 = __importDefault(require("../model/expense.type.model"));
class ExpenseTypeController {
}
/**
 * Create new expense type
 * @param req
 * @param res
 */
ExpenseTypeController.create = (req, res) => {
    const name = req.body.name;
    const description = req.body.description;
    const parent_id = req.body.parent_id;
    expense_type_model_1.default.create({
        name: name,
        description: description,
        parent_id: parent_id,
        created_by: req.body.userId,
    })
        .then((result) => {
        const socket = new socket_helper_1.default("createExpenseType", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Fetch expense type
 * @param req
 * @param res
 */
ExpenseTypeController.fetchV2 = (req, res) => {
    expense_type_model_1.default.fetch("", 0, 0, fetch_interface_1.fetchMode.AllV2)
        .then((result) => {
        return res.status(200).send(result.map((x) => {
            return {
                id: x.id,
                name: x.name,
                description: x.description,
                can_delete: x.can_delete.toString().replace("n", "") == "1",
            };
        }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching expense type: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch expense type
 * @param req
 * @param res
 */
ExpenseTypeController.fetch = (req, res) => {
    expense_type_model_1.default.fetch("", 0, 0, fetch_interface_1.fetchMode.All).then((result) => {
        const parentExpenseType = result.filter((x) => x.parent_id == null);
        const childExpenseType = result.filter((x) => x.parent_id != null);
        const expenseType = [];
        parentExpenseType.forEach((parent) => {
            const children = [];
            childExpenseType
                .filter((x) => x.parent_id == parent.id)
                .forEach((child) => {
                children.push({
                    id: child.id,
                    name: child.name,
                    description: child.description,
                });
            });
            expenseType.push({
                id: parent.id,
                name: parent.name,
                description: parent.description,
                children: children,
            });
        });
    });
};
/**
 * Fetch expense type children
 * @param req
 * @param res
 */
ExpenseTypeController.fetchChildren = (req, res) => {
    const id = parseInt(req.params.id);
    expense_type_model_1.default.fetch("", 0, 0, fetch_interface_1.fetchMode.ChildByParentID, id)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching expense type children :${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch expense by ID
 * @param req
 * @param res
 */
ExpenseTypeController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    expense_type_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result.parent_id == null) {
            // Get the children
            expense_type_model_1.default.fetchByID(result === null || result === void 0 ? void 0 : result.id)
                .then((children) => {
                return res.status(200).send(Object.assign(Object.assign({}, result), { children: children }));
            })
                .catch((error) => {
                console.error(`[error]: Error on fetch expense type by id ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
        }
        else {
            expense_model_1.default.countByType(result === null || result === void 0 ? void 0 : result.id)
                .then((count) => {
                return res.status(200).send(Object.assign(Object.assign({}, result), { count: count }));
            })
                .catch((error) => {
                console.error(`[error]: Error on counting expense type by id ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Fetch expense type autocomplete
 * @param req
 * @param res
 */
ExpenseTypeController.fetchAutocomplete = (req, res) => {
    var _a, _b;
    const mode = req.query.mode;
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    if (mode == "parent") {
        (_a = expense_type_model_1.default.fetch(keyword, 5, 0, fetch_interface_1.fetchMode.ParentAutocomplete)) === null || _a === void 0 ? void 0 : _a.then((result) => {
            return res.status(200).send(result);
        }).catch((error) => {
            console.error(`[error]: Error on fetching autocomplete ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else {
        (_b = expense_type_model_1.default.fetch(keyword, 5, 0, fetch_interface_1.fetchMode.ChildAutocomplete)) === null || _b === void 0 ? void 0 : _b.then((result) => {
            return res.status(200).send(result);
        }).catch((error) => {
            console.error(`[error]: Error on fetching autocomplete ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
};
/**
 * Delete expense type by ID
 * @param req
 * @param res
 */
ExpenseTypeController.deleteByID = (req, res) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    expense_type_model_1.default.fetchByID(id).then((expense) => {
        if (!expense) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (expense.parent_id == null) {
            expense_type_model_1.default.fetchByParentID(expense.id)
                .then((children) => {
                if (children.length == 0) {
                    expense_type_model_1.default.deleteByID({
                        id: expense.id,
                        deleted_by: userID,
                    })
                        .then((result) => {
                        const socket = new socket_helper_1.default("deleteExpenseType", result);
                        socket.create();
                        return res.status(201).send(result);
                    })
                        .catch((error) => {
                        console.error(`[error]: Error on deleting expense type ${error}`);
                        return res
                            .status(500)
                            .send(error_list_1.default["Internal server error"]);
                    });
                }
                else {
                    return res.status(400).send(error_list_1.default["Expense type has child"]);
                }
            })
                .catch((error) => {
                console.error(`[error]: Error on fetching children ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
        }
        else {
            expense_type_model_1.default.deleteByID({
                id: expense.id,
                deleted_by: userID,
            })
                .then((result) => {
                const socket = new socket_helper_1.default("deleteExpenseType", result);
                socket.create();
                return res.status(201).send(result);
            })
                .catch((error) => {
                console.error(`[error]: Error on deleting expense type ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
        }
    });
};
/**
 * Update expense type by ID
 * @param req
 * @param res
 */
ExpenseTypeController.updateByID = (req, res) => {
    const name = req.body.name;
    const description = req.body.description;
    const id = req.body.id;
    expense_type_model_1.default.updateByID({
        name: name,
        description: description,
        created_by: req.body.userId,
        id: id,
    })
        .then((result) => {
        const socket = new socket_helper_1.default("updateExpenseType", result);
        socket.create();
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on updating expense type ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
exports.default = ExpenseTypeController;
//# sourceMappingURL=expense-type.controller.js.map