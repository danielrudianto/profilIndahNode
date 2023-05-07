"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../assets/error_list"));
const error_list_2 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const adjustment_case_model_1 = __importDefault(require("../model/adjustment_case.model"));
const adjustment_case_code_model_1 = __importDefault(require("../model/adjustment_case_code.model"));
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
class AdjustmentCaseController {
}
_a = AdjustmentCaseController;
AdjustmentCaseController.create = (req, res) => {
    const name = _a.generateName(new Date(req.body.date));
    const companyID = req.body.company_id;
    const userID = req.body.userId;
    const adjustment_case = new adjustment_case_code_model_1.default(name, new Date(req.body.date), userID, companyID);
    adjustment_case
        .create()
        .then((result) => {
        adjustment_case_model_1.default.createMany(req.body.adjustment_case.map((x) => {
            return Object.assign(Object.assign({}, x), { quantity: req.body.type == 0 ? x.quantity : -1 * x.quantity, adjustment_case_code_id: result.id });
        }))
            .then(() => {
            adjustment_case_code_model_1.default.fetchById(result.id)
                .then((document) => {
                if (document == null) {
                    return res.status(201).send(result);
                }
                else {
                    product_stock_model_1.default.updateStock(document.adjustment_case.map((x) => {
                        const quantity = parseFloat(x.quantity.toString()) *
                            (x.item_unit == null
                                ? 1
                                : parseFloat(x.item_unit.conversion.toString()));
                        return {
                            item_id: x.item.id,
                            quantity: quantity,
                        };
                    }))
                        .then(() => {
                        return res.status(201).send(result);
                    })
                        .catch(() => {
                        return res.status(201).send(result);
                    });
                }
            })
                .catch((error) => {
                return res.status(404).send(error_list_1.default["Not found"]);
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
AdjustmentCaseController.fetchArchives = (req, res) => {
    const mode = req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
        adjustment_case_code_model_1.default.fetchArchiveYears(mode)
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.query.year != undefined && req.query.month == undefined) {
        const year = parseInt(req.query.year.toString());
        adjustment_case_code_model_1.default.fetchArchiveMonths(year, mode)
            .then((result) => {
            const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            result.forEach((x) => {
                response[x.month - 1] = x.count;
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.query.year != undefined && req.query.month != undefined) {
        const year = parseInt(req.query.year.toString());
        const month = parseInt(req.query.month.toString());
        const page = req.query.page == undefined ? 1 : parseInt(req.query.page.toString());
        adjustment_case_code_model_1.default.fetchArchive(year, month, page, mode)
            .then((result) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        date: x.date,
                        is_delete: x.is_delete == 1,
                        is_confirm: x.is_confirm == 1,
                        company: (x.company_id == null) == null
                            ? null
                            : {
                                id: x.company_id,
                                name: x.company_name,
                            },
                    };
                }),
                count: result[1] == null || result[1].length == 0
                    ? 0
                    : result[1][0].count,
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
};
AdjustmentCaseController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    adjustment_case_code_model_1.default.fetchById(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_2.default["Not found"]);
        }
        else {
            return res.status(200).send(result);
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
AdjustmentCaseController.fetchCodeById = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const id = parseInt(req.params.id.toString());
    adjustment_case_model_1.default.fetchById(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            return res.status(200).send(result === null || result === void 0 ? void 0 : result.adjustment_case_code);
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
AdjustmentCaseController.deleteById = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        adjustment_case_code_model_1.default.fetchById(id).then((adjustment_case) => {
            if (!adjustment_case) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            else {
                adjustment_case_code_model_1.default.deleteById(id)
                    .then((result) => {
                    const socket = new socket_helper_1.default("deleteAdjustmentCase", result);
                    socket.create();
                    if (!result) {
                        return res.status(404).send(error_list_1.default["Not found"]);
                    }
                    else {
                        product_stock_model_1.default.updateStock(result.adjustment_case.map((x) => {
                            const quantity = parseFloat(x.quantity.toString()) *
                                -1 *
                                (x.item_unit == null
                                    ? 1
                                    : parseFloat(x.item_unit.conversion.toString()));
                            return {
                                item_id: x.item.id,
                                quantity: quantity,
                            };
                        }))
                            .then(() => {
                            return res.status(200).send(result);
                        })
                            .catch(() => {
                            return res.status(200).send(result);
                        });
                    }
                })
                    .catch((error) => {
                    return res.status(500).send(error);
                });
            }
        });
    }
    catch (err) {
        if (err instanceof Error) {
            return res.status(500).send(err);
        }
        else {
            return res.status(500).send(error_list_1.default["Unknown error"]);
        }
    }
};
AdjustmentCaseController.generateName = (date) => {
    return `ADJ-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
};
exports.default = AdjustmentCaseController;
