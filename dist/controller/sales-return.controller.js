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
const bill_model_1 = __importDefault(require("../model/bill.model"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const sales_return_model_1 = __importDefault(require("../model/sales_return.model"));
const mongo_stock_in_model_1 = require("../mongo-model/mongo-stock-in.model");
const mongo_overflow_model_1 = require("../mongo-model/mongo-overflow.model");
class SalesReturnController {
}
_a = SalesReturnController;
/**
 * Create sales return data
 * @param req
 * @param res
 * @returns Sales return data
 */
SalesReturnController.create = (req, res) => {
    const date = new Date(req.body.date);
    const payment_method_id = req.body.payment_method_id == 0 ? null : req.body.payment_method_id;
    const items = req.body.sales_return;
    const userID = req.body.userId;
    if (items.length == 0) {
        return res.status(400).send(error_list_1.default["Parameter error"]);
    }
    // Add checker for bill id
    const billIDs = items.map((x) => x.bill_id);
    bill_model_1.default.fetchByIDs(billIDs).then((billItems) => {
        for (let i = 0; i < billItems.length; i++) {
            const itemIndex = items.findIndex((x) => x.bill_id == billItems[i].id);
            if (itemIndex == -1) {
                return res.status(400).send(error_list_1.default["Parameter error"]);
            }
            if (billItems[i].quantity - billItems[i].return_quantity <
                items[itemIndex].quantity) {
                return res.status(400).send(error_list_1.default["Parameter error"]);
            }
        }
        const name = `RJ-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
        sales_return_model_1.default.create({
            name: name,
            date: date,
            created_by: userID,
            payment_method_id: payment_method_id,
            sales_return: items.map((x) => {
                return {
                    bill_id: x.bill_id,
                    quantity: x.quantity,
                };
            }),
        })
            .then((result) => __awaiter(void 0, void 0, void 0, function* () {
            for (let i = 0; i < result.sales_return.length; i++) {
                if (result.sales_return[i].bill.item != null) {
                    const stockReturn = {
                        itemID: result.sales_return[i].bill.item.id,
                        createdAt: result.created_at,
                        date: date,
                        document: name,
                        opponent: result.sales_return[i].bill.bill_code.customer == null
                            ? "Retail customer"
                            : result.sales_return[i].bill.bill_code.customer.name,
                        displayQuantity: Number(result.sales_return[i].quantity),
                        unit: result.sales_return[i].bill.item_unit == null
                            ? result.sales_return[i].bill.item.unit
                            : result.sales_return[i].bill.item_unit.unit,
                        quantity: Number(result.sales_return[i].quantity) *
                            (result.sales_return[i].bill.item_unit == null
                                ? 1
                                : Number(result.sales_return[i].bill.item_unit.conversion)),
                        billID: result.sales_return[i].bill_id,
                        billCodeID: result.sales_return[i].bill.bill_code.id,
                        salesReturnCodeID: result.id,
                        salesReturnID: result.sales_return[i].id,
                        customerID: result.sales_return[i].bill.bill_code.customer == null
                            ? null
                            : result.sales_return[i].bill.bill_code.customer.id,
                    };
                    yield queue_helper_1.queue.add("insert-stock-return", stockReturn);
                }
                else if (result.sales_return[i].bill.package_code != null) {
                    for (let n = 0; n <
                        result.sales_return[i].bill.package_code.package_content
                            .length; n++) {
                        const stockReturn = {
                            itemID: result.sales_return[i].bill.package_code.package_content[n]
                                .item.id,
                            createdAt: result.created_at,
                            date: date,
                            document: name,
                            opponent: result.sales_return[i].bill.bill_code.customer == null
                                ? "Retail customer"
                                : result.sales_return[i].bill.bill_code.customer.name,
                            displayQuantity: Number(result.sales_return[i].bill.quantity) *
                                Number(result.sales_return[i].bill.package_code.package_content[n].quantity),
                            unit: result.sales_return[i].bill.package_code.package_content[n]
                                .item_unit == null
                                ? result.sales_return[i].bill.package_code
                                    .package_content[n].item.unit
                                : result.sales_return[i].bill.package_code
                                    .package_content[n].item_unit.unit,
                            quantity: Number(result.sales_return[i].quantity) *
                                Number(result.sales_return[i].bill.package_code.package_content[n].quantity) *
                                (result.sales_return[i].bill.item_unit == null
                                    ? 1
                                    : Number(result.sales_return[i].bill.item_unit.conversion)),
                            billID: result.sales_return[i].bill_id,
                            billCodeID: result.sales_return[i].bill.bill_code.id,
                            salesReturnCodeID: result.id,
                            salesReturnID: result.sales_return[i].id,
                            customerID: result.sales_return[i].bill.bill_code.customer == null
                                ? null
                                : result.sales_return[i].bill.bill_code.customer.id,
                        };
                        yield queue_helper_1.queue.add("insert-stock-return", stockReturn);
                    }
                }
            }
            return res.status(201).send(result);
        }))
            .catch((error) => {
            console.error(`[error]: Error on creating sales return ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    });
};
/**
 * Search for a bill that can be returned
 * @param req
 * @param res
 * @returns Bill data
 */
SalesReturnController.fetchSearch = (req, res) => {
    const date = new Date(req.body.date);
    const items = req.body.items;
    const packages = req.body.packages;
    sales_return_model_1.default.fetchSearch(date, items, packages)
        .then((result) => {
        return res.status(200).send(result.map((x) => {
            return {
                id: x.id,
                name: x.name,
                date: x.date,
                customer: {
                    name: x.customer_name,
                },
            };
        }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching sales return search ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch sales return archive
 * @param req
 * @param res
 * @return Sales return archive
 */
SalesReturnController.fetchArchives = (req, res) => {
    const year = req.body.year;
    const month = req.body.month;
    if (year == null) {
        sales_return_model_1.default.fetchArchiveYears()
            .then((result) => {
            return res.status(200).send(result.map((x) => {
                return {
                    year: x.year,
                    count: parseInt(x.count.toString()),
                };
            }));
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (year != null && month == null) {
        sales_return_model_1.default.fetchArchiveMonths(year)
            .then((result) => {
            const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            result.forEach((x) => {
                response[x.month - 1] = parseInt(x.count.toString());
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else {
        const page = req.body.limit.page;
        const keyword = req.body.search == null ? "" : req.body.search.keyword;
        const mode = req.body.mode;
        sales_return_model_1.default.fetchArchive({
            year: year,
            month: month,
            limit: 10,
            offset: (page - 1) * 10,
            keyword: (0, escape_helper_1.mysql_real_escape_string)(keyword),
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
                        customer: (x.customer_id == null) == null
                            ? null
                            : {
                                id: x.customer_id,
                                name: x.customer_name,
                            },
                    };
                }),
                count: result[1] == null || result[1].length == 0
                    ? 0
                    : parseInt(result[1][0].count.toString()),
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
};
/**
 * Fetch sales return by ID
 * @param req
 * @param res
 * @returns Sales return data
 */
SalesReturnController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id.toString());
    sales_return_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        // Take the first bill to determine the bill code ID
        const bill_code_id = result.sales_return[0].bill.bill_code_id;
        bill_code_model_1.default.fetchByID(bill_code_id).then((bill) => {
            if (!bill) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            let total = 0;
            for (let item of result.sales_return) {
                total +=
                    parseFloat(item.quantity.toString()) *
                        (parseFloat(item.bill.price.toString()) -
                            parseFloat(item.bill.discount.toString()));
            }
            return res.status(200).send(Object.assign(Object.assign({}, result), { bill: bill, customer: (result === null || result === void 0 ? void 0 : result.sales_return.length) == 0 ||
                    (result === null || result === void 0 ? void 0 : result.sales_return[0].bill.bill_code.customer) == null
                    ? null
                    : {
                        name: result.sales_return[0].bill.bill_code.customer.name,
                    }, total: total }));
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Delete sales return by ID
 * @param req
 * @param res
 * @returns
 */
SalesReturnController.deleteByID = (req, res) => {
    const id = parseInt(req.params.id.toString());
    const userID = req.body.userId;
    sales_return_model_1.default.fetchByID(id).then((salesReturn) => {
        if (!salesReturn) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (salesReturn.is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        sales_return_model_1.default.deleteByID(id, userID)
            .then((result) => __awaiter(void 0, void 0, void 0, function* () {
            for (let i = 0; i < result.sales_return.length; i++) {
                yield queue_helper_1.queue.add("delete-stock-return", {
                    salesReturnID: result.sales_return[i].id,
                });
                if (result.sales_return[i].bill.item != null) {
                    const overflowBill = yield mongo_overflow_model_1.mongoOverflowModel.findOne({
                        billID: result.sales_return[i].bill_id,
                        itemID: result.sales_return[i].bill.item.id,
                    });
                    if (overflowBill) {
                        const itemUnit = result.sales_return[i].bill.item_unit;
                        const conversion = itemUnit ? Number(itemUnit.conversion) : 1;
                        yield queue_helper_1.queue.add("insert-stock-out-plain", {
                            itemID: overflowBill.itemID,
                            billID: result.sales_return[i].bill_id,
                            billCodeID: result.sales_return[i].bill.bill_code.id,
                            adjustmentCaseID: null,
                            adjustmentCaseCodeID: null,
                            date: result.date,
                            quantity: Number(result.sales_return[i].quantity) * conversion,
                            value: overflowBill.value,
                        });
                    }
                    else {
                        const bill = yield mongo_stock_in_model_1.mongoStockOutModel.findOne({
                            billID: result.sales_return[i].bill_id,
                            itemID: result.sales_return[i].bill.item.id,
                        });
                        if (!bill) {
                            console.error(`[error]: Bill not found`);
                        }
                        else {
                            const itemUnit = result.sales_return[i].bill.item_unit;
                            const conversion = itemUnit ? Number(itemUnit.conversion) : 1;
                            yield queue_helper_1.queue.add("insert-stock-out-plain", {
                                itemID: bill.itemID,
                                billID: result.sales_return[i].bill_id,
                                billCodeID: result.sales_return[i].bill.bill_code.id,
                                adjustmentCaseID: null,
                                adjustmentCaseCodeID: null,
                                date: result.date,
                                quantity: Number(result.sales_return[i].quantity) * conversion,
                                value: bill.value,
                            });
                        }
                    }
                }
                else if (result.sales_return[i].bill.package_code != null) {
                    for (let n = 0; n <
                        result.sales_return[i].bill.package_code.package_content
                            .length; n++) {
                        const bill = yield mongo_stock_in_model_1.mongoStockOutModel.findOne({
                            billID: result.sales_return[i].bill_id,
                            itemID: result.sales_return[i].bill.package_code.package_content[n]
                                .item.id,
                        });
                        if (!bill) {
                            console.error(`[error]: Bill not found`);
                        }
                        else {
                            const itemUnit = result.sales_return[i].bill.package_code.package_content[n]
                                .item_unit;
                            const conversion = itemUnit ? Number(itemUnit.conversion) : 1;
                            yield queue_helper_1.queue.add("insert-stock-out", {
                                itemID: bill.itemID,
                                billID: result.sales_return[i].bill_id,
                                billCodeID: result.sales_return[i].bill.bill_code.id,
                                adjustmentCaseID: null,
                                adjustmentCaseCodeID: null,
                                date: result.date,
                                quantity: Number(result.sales_return[i].quantity) *
                                    Number(result.sales_return[i].bill.package_code
                                        .package_content[n].quantity) *
                                    conversion,
                                value: bill.value,
                            });
                        }
                    }
                }
            }
            return res.status(201).send(result);
        }))
            .catch((error) => {
            return res.status(500).send(error);
        });
    });
};
/**
 * Fetch sales return code by ID
 * @param req
 * @param res
 * @returns sales return code document
 */
SalesReturnController.fetchCodeByID = (req, res) => {
    const id = parseInt(req.params.id.toString());
    sales_return_model_1.default.fetchCodeByID(id)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = SalesReturnController;
//# sourceMappingURL=sales-return.controller.js.map