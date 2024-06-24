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
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const queue_helper_1 = require("../helper/queue.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const adjustment_case_model_1 = __importDefault(require("../model/adjustment-case.model"));
class AdjustmentCaseController {
}
_a = AdjustmentCaseController;
/**
 * Create new adjustment case
 * Adjustment case is a list of item that will be added or removed from stock
 * @param req
 * @param res
 */
AdjustmentCaseController.create = (req, res) => {
    const name = _a.generateName(new Date(req.body.date));
    const companyID = req.body.company_id;
    const userID = req.body.userId;
    const type = req.body.type;
    if (type == 0 && companyID == null) {
        // If the type is found but the company is somewhat not selected
        // Return an error
        return res.status(400).send(error_list_1.default["Parameter error"]);
    }
    else {
        // Insert adjustment case code
        adjustment_case_model_1.default.create({
            name: name,
            date: new Date(req.body.date),
            created_by: userID,
            company_id: companyID,
            adjustment_case: req.body.adjustment_case.map((x) => {
                return {
                    item_id: x.item_id,
                    item_unit_id: x.item_unit_id,
                    quantity: (type == 0 ? 1 : -1) * x.quantity,
                };
            }),
        })
            .then((result) => __awaiter(void 0, void 0, void 0, function* () {
            if (!result) {
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
            return res.status(201).send(result);
        }))
            .catch((error) => {
            console.error(`[error]: Error on create adjustment case: ${error}`);
            return res.status(500).send(error);
        });
    }
};
AdjustmentCaseController.approve = (req, res) => {
    const userID = req.body.userId;
    const id = Number(req.params.id);
    adjustment_case_model_1.default.fetchByID(id)
        .then((adjustmentCase) => {
        if (!adjustmentCase) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else if (adjustmentCase.is_confirm || adjustmentCase.is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            adjustment_case_model_1.default.approveByID(id, userID)
                .then((result) => __awaiter(void 0, void 0, void 0, function* () {
                var _b;
                const queueBody = [];
                // Start inserting using queue
                for (let i = 0; i < result.adjustment_case.length; i++) {
                    if (Number(result.adjustment_case[i].quantity) > 0) {
                        // Added item
                        const stockIn = {
                            itemID: result.adjustment_case[i].item.id,
                            createdAt: result.created_at,
                            date: result.date,
                            document: result.name,
                            opponent: "Internal",
                            displayQuantity: Number(result.adjustment_case[i].quantity.toString()),
                            unit: result.adjustment_case[i].item_unit == null
                                ? result.adjustment_case[i].item.unit
                                : result.adjustment_case[i].item_unit.unit,
                            quantity: Number(result.adjustment_case[i].quantity) *
                                (result.adjustment_case[i].item_unit == null
                                    ? 1
                                    : Number((_b = result.adjustment_case[i].item_unit) === null || _b === void 0 ? void 0 : _b.conversion)),
                            billID: null,
                            billCodeID: null,
                            adjustmentCaseID: result.adjustment_case[i].id,
                            adjustmentCaseCodeID: result.id,
                            goodReceiptID: null,
                            goodReceiptCodeID: null,
                            salesReturnID: null,
                            salesReturnCodeID: null,
                            customerID: null,
                            supplierID: null,
                            companyID: result.company_id,
                            price: 0,
                        };
                        queueBody.push(stockIn);
                        yield queue_helper_1.queue.add("insert-stock-in", stockIn);
                    }
                    else {
                        // Removed item
                        const stockIn = {
                            itemID: result.adjustment_case[i].item.id,
                            createdAt: result.created_at,
                            date: result.date,
                            document: result.name,
                            opponent: "Internal",
                            displayQuantity: Number(result.adjustment_case[i].quantity),
                            unit: result.adjustment_case[i].item_unit == null
                                ? result.adjustment_case[i].item.unit
                                : result.adjustment_case[i].item_unit.unit,
                            quantity: Number(result.adjustment_case[i].quantity) *
                                (result.adjustment_case[i].item_unit == null
                                    ? 1
                                    : Number(result.adjustment_case[i].item_unit.conversion)),
                            billID: null,
                            billCodeID: null,
                            adjustmentCaseID: result.adjustment_case[i].id,
                            adjustmentCaseCodeID: result.id,
                            goodReceiptID: null,
                            goodReceiptCodeID: null,
                            salesReturnID: null,
                            salesReturnCodeID: null,
                            customerID: null,
                            supplierID: null,
                            companyID: result.company_id,
                            price: 0,
                        };
                        yield queue_helper_1.queue.add("insert-stock-out", stockIn);
                    }
                }
                return res.status(201).send(adjustmentCase);
            }))
                .catch((error) => {
                console.error(`[error]: Error on approve adjustment case: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
        }
    })
        .catch((error) => {
        console.error(`[error]: Error on fetch adjustment case: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
AdjustmentCaseController.disapprove = (req, res) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;
    adjustment_case_model_1.default.disapproveByID(id, userID)
        .then((result) => {
        return res.status(201).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on disapprove adjustment case: ${error}`);
        return res.status(500).send(error);
    });
};
/**
 * Generate adjustment case name
 * Generating name of adjustment case code based on date
 * @param date
 * @returns string
 */
AdjustmentCaseController.generateName = (date) => {
    return `ADJ-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
};
/**
 * Fetch all adjustment case
 * Fetch all adjustment case code
 * @param req
 * @param res
 */
AdjustmentCaseController.fetch = (req, res) => {
    const id = parseInt(req.params.id);
    adjustment_case_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(Object.assign(Object.assign({}, result), { type: Number(result.adjustment_case[0].quantity) > 0 ? 0 : 1 }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching adjustment case: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
AdjustmentCaseController.fetchUnconfirmed = (req, res) => {
    const page = req.query.page == null || req.query.page == undefined
        ? 1
        : Number(req.query.page);
    adjustment_case_model_1.default.fetchUnconfirmed(page)
        .then(([result, count]) => {
        return res.status(200).send({
            data: result.map((x) => {
                return {
                    id: x.id,
                    name: x.name,
                    date: x.date,
                    type: Number(x.adjustment_case[0].quantity) > 0 ? 0 : 1,
                    user_adjustment_case_code_created_byTouser: x.user_adjustment_case_code_created_byTouser,
                    company: x.company,
                };
            }),
            count: count,
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching unconfirmed adjustment case ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch archive adjustment case
 * Fetch all adjustment case code that has been archived
 * @param req
 * @param res
 */
AdjustmentCaseController.fetchArchives = (req, res) => {
    const year = req.body.year;
    const month = req.body.month;
    if (year == null) {
        adjustment_case_model_1.default.fetchArchiveYears()
            .then((result) => {
            return res.status(200).send(result
                .map((x) => {
                return {
                    year: x.year,
                    count: parseInt(x.count.toString()),
                };
            })
                .sort((a, b) => {
                return a.year - b.year;
            }));
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching adjustment case: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else if (year != null && month == null) {
        adjustment_case_model_1.default.fetchArchiveMonths(year)
            .then((result) => {
            const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            result.forEach((x) => {
                response[x.month - 1] = parseInt(x.count.toString());
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching adjustment case: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else {
        const page = req.body.limit.page;
        req.query.page == undefined ? 1 : parseInt(req.query.page.toString());
        const keyword = req.body.search.keyword;
        const mode = req.body.mode;
        adjustment_case_model_1.default.fetchArchive({
            year: year,
            month: month,
            keyword: (0, escape_helper_1.mysql_real_escape_string)(keyword),
            limit: 10,
            offset: (page - 1) * 10,
            mode: mode,
        })
            .then((result) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        date: x.date,
                        is_delete: x.is_delete == 1,
                        is_confirm: x.is_confirm == 1,
                        company_name: x.company_name,
                    };
                }),
                count: result[1] == null || result[1].length == 0
                    ? 0
                    : parseInt(result[1][0].count.toString()),
            });
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching adjustment case: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
};
/**
 * Fetch archive adjustment case
 * Fetch all adjustment case code that has been archived
 * @param req
 * @param res
 */
AdjustmentCaseController.fetchArchivesV2 = (req, res) => {
    var _b;
    const year = req.body.year;
    const month = req.body.month;
    if (year == null && month == null) {
        adjustment_case_model_1.default.fetchArchiveYearsV2()
            .then((result) => {
            return res.status(200).send(result.map((x) => {
                return {
                    year: x.year,
                    month: x.month,
                    count: Number(x.count.toString().replace("n", "")),
                };
            }));
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching adjustment case: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else {
        const keyword = req.body.keyword;
        const page = (_b = req.body.page) !== null && _b !== void 0 ? _b : 1;
        const status = req.body.status;
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;
        const type = req.body.type;
        adjustment_case_model_1.default.fetchArchiveV2({
            year: Number(year),
            month: Number(month),
            mode: status,
            status: status,
            limit: 20,
            offset: (page - 1) * 20,
            keyword: (0, escape_helper_1.mysql_real_escape_string)(keyword !== null && keyword !== void 0 ? keyword : ""),
            startDate: startDate,
            endDate: endDate,
            type: type,
        })
            .then(([result, count]) => {
            return res.status(200).send({
                data: result.map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        date: x.date,
                        is_delete: x.is_delete == 1,
                        is_confirm: x.is_confirm == 1,
                        company_name: x.company_name,
                        type: x.type.toString().replace("n", ""),
                    };
                }),
                count: count == null || count.length == 0
                    ? 0
                    : parseInt(count[0].count.toString().replace("n", "")),
            });
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching adjustment archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
};
/**
 * Fetch adjustment case by id
 * Fetch adjustment case code by id
 * @param req
 * @param res
 */
AdjustmentCaseController.fetchCodeByID = (req, res) => {
    const id = parseInt(req.params.id.toString());
    adjustment_case_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching adjustment case: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Delete adjustment case
 * Delete adjustment case code by id
 * @param req
 * @param res
 */
AdjustmentCaseController.deleteByID = (req, res) => {
    const id = parseInt(req.params.id);
    adjustment_case_model_1.default.fetchByID(id).then((adjustmentCase) => {
        if (!adjustmentCase) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        adjustment_case_model_1.default.deleteByID(id)
            .then((result) => __awaiter(void 0, void 0, void 0, function* () {
            var _b, _c, _d, _e;
            if (!result) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            const socket = new socket_helper_1.default("deleteAdjustmentCase", result);
            socket.create();
            for (let i = 0; i < adjustmentCase.adjustment_case.length; i++) {
                const quantity = Number(adjustmentCase.adjustment_case[i].quantity);
                if (quantity > 0) {
                    yield queue_helper_1.queue.add("delete-stock-in", {
                        itemID: (_c = (_b = adjustmentCase.adjustment_case[i]) === null || _b === void 0 ? void 0 : _b.item) === null || _c === void 0 ? void 0 : _c.id,
                        goodReceiptID: null,
                        adjustmentCaseID: adjustmentCase.adjustment_case[i].id,
                        quantity: Number(adjustmentCase.adjustment_case[i].quantity) *
                            (adjustmentCase.adjustment_case[i].item_unit == null
                                ? 1
                                : Number(adjustmentCase.adjustment_case[i].item_unit.conversion)),
                    });
                }
                else if (quantity < 0) {
                    yield queue_helper_1.queue.add("delete-stock-out", {
                        itemID: (_e = (_d = adjustmentCase.adjustment_case[i]) === null || _d === void 0 ? void 0 : _d.item) === null || _e === void 0 ? void 0 : _e.id,
                        billID: null,
                        adjustmentCaseID: adjustmentCase.adjustment_case[i].id,
                        quantity: Number(adjustmentCase.adjustment_case[i].quantity) *
                            (adjustmentCase.adjustment_case[i].item_unit == null
                                ? 1
                                : Number(adjustmentCase.adjustment_case[i].item_unit.conversion)),
                    });
                }
            }
            return res.status(200).send(result);
        }))
            .catch((error) => {
            console.error(`[error]: Error on deleting adjustment case: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    });
};
exports.default = AdjustmentCaseController;
//# sourceMappingURL=adjustment-event.controller.js.map