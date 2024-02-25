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
const good_receipt_model_1 = __importDefault(require("../model/good_receipt.model"));
const item_purchase_price_model_1 = __importDefault(require("../model/item_purchase_price.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const queue_helper_1 = require("../helper/queue.helper");
class GoodReceiptController {
}
_a = GoodReceiptController;
/**
 * Create new good receipt
 * @param req
 * @param res
 */
GoodReceiptController.create = (req, res) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt;
    const purchase_invoice = req.body.purchase_invoice;
    const purchase_invoice_name = purchase_invoice.name;
    const userID = req.body.userId;
    const uuid = req.body.uuid;
    item_purchase_price_model_1.default.fetchCurrentPrice(good_receipt_items.map((x) => {
        return {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
        };
    })).then((priceResult) => {
        good_receipt_model_1.default.create({
            uuid: uuid,
            name: name,
            purchase_invoice_name: purchase_invoice_name,
            date: date,
            supplier_id: supplier_id,
            company_id: company_id,
            created_by: userID,
            good_receipt: good_receipt_items.map((x) => {
                const priceIndex = priceResult.findIndex((y) => y.item_id == x.item_id && y.item_unit_id == x.item_unit_id);
                return {
                    item_id: x.item_id,
                    item_unit_id: x.item_unit_id,
                    quantity: x.quantity,
                    price: priceIndex == -1 ? 0 : priceResult[priceIndex].price,
                    discount: priceIndex == -1 ? 0 : priceResult[priceIndex].discount,
                };
            }),
        })
            .then((goodReceiptResult) => __awaiter(void 0, void 0, void 0, function* () {
            Promise.all(goodReceiptResult.good_receipt.map((x) => {
                const stockIn = {
                    itemID: x.item.id,
                    createdAt: goodReceiptResult.created_at,
                    date: goodReceiptResult.date,
                    document: goodReceiptResult.name,
                    opponent: goodReceiptResult.supplier.name,
                    displayQuantity: parseFloat(x.quantity.toString()),
                    unit: x.item_unit == null ? x.item.unit : x.item_unit.unit,
                    quantity: parseFloat(x.quantity.toString()) *
                        (x.item_unit == null
                            ? 1
                            : parseFloat(x.item_unit.conversion.toString())),
                    billID: null,
                    billCodeID: null,
                    adjustmentCaseID: null,
                    adjustmentCaseCodeID: null,
                    goodReceiptID: x.id,
                    goodReceiptCodeID: goodReceiptResult.id,
                    salesReturnID: null,
                    salesReturnCodeID: null,
                    customerID: null,
                    supplierID: goodReceiptResult.supplier_id,
                    companyID: goodReceiptResult.company_id,
                    price: parseFloat(x.price.toString()) -
                        parseFloat(x.discount.toString()),
                };
                return queue_helper_1.queue.add("insert-stock-in", stockIn);
            }))
                .then(() => {
                return res.status(201).send(goodReceiptResult);
            })
                .catch((error) => {
                console.error(`[error]: Error on creating good receipt ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
        }))
            .catch((error) => {
            console.error(`[error]: Error on fetching price ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    });
};
/**
 * Search good receipt
 * @param req
 * @param res
 */
GoodReceiptController.search = (req, res) => {
    const suppliers = req.body.suppliers;
    const items = req.body.items;
    const companies = req.body.companies;
    const date = req.body.date;
    const page = req.body.page;
    const keyword = req.body.keyword;
    const status = req.body.status;
    // 0 = active only, 1 = deleted only, 2 = all
    const formattedDate_1 = date[0] == null
        ? null
        : `${new Date(date[0]).getFullYear()}}-${(new Date(date[0]).getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${new Date(date[0])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    const formattedDate_2 = date[1] == null
        ? null
        : `${new Date(date[1]).getFullYear()}}-${(new Date(date[1]).getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${new Date(date[1])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    good_receipt_model_1.default.search(suppliers, companies, items, [formattedDate_1, formattedDate_2], (0, escape_helper_1.mysql_real_escape_string)(keyword), page, status)
        .then((result) => {
        return res.status(200).send({
            data: result[0],
            count: parseInt(result[1][0].count.toString()),
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Fetch good receipt by id
 * @param req
 * @param res
 */
GoodReceiptController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    good_receipt_model_1.default.fetchByID(id)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching good receipt ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch good receipt archive
 * @param req
 * @param res
 */
GoodReceiptController.fetchArchive = (req, res) => {
    const year = req.body.year;
    const month = req.body.month;
    if (year == null) {
        good_receipt_model_1.default.fetchArchiveYears()
            .then((result) => {
            return res.status(200).send(result.map((x) => {
                return {
                    year: x.year,
                    count: parseInt(x.count.toString()),
                };
            }));
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching good receipt archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else if (year != null && month == null) {
        good_receipt_model_1.default.fetchArchiveMonths(year)
            .then((result) => {
            const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            result.forEach((x) => {
                response[x.month - 1] = parseInt(x.count.toString());
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching good receipt archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else {
        const page = req.body.limit == null ? 1 : req.body.limit.page;
        const keyword = req.body.search == null ? "" : req.body.search.keyword;
        const mode = req.body.mode;
        good_receipt_model_1.default.fetchArchive({
            year: year,
            month: month,
            mode: mode,
            keyword: (0, escape_helper_1.mysql_real_escape_string)(keyword),
            limit: 10,
            offset: (page - 1) * 10,
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
                        supplier_name: x.supplier_name,
                        company_name: x.company_name,
                    };
                }),
                count: result[1] == null || result[1].length == 0
                    ? 0
                    : parseInt(result[1][0].count.toString()),
            });
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching good receipt archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
};
exports.default = GoodReceiptController;
//# sourceMappingURL=good-receipt.controller.js.map