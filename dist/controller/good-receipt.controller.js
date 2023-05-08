"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const company_model_1 = __importDefault(require("../model/company.model"));
const good_receipt_model_1 = __importDefault(require("../model/good_receipt.model"));
const item_purchase_price_model_1 = __importDefault(require("../model/item_purchase_price.model"));
const purchase_invoice_model_1 = __importDefault(require("../model/purchase-invoice.model"));
const supplier_model_1 = __importDefault(require("../model/supplier.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
class GoodReceiptController {
}
GoodReceiptController.create = (req, res) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt;
    const purchase_invoice = req.body.purchase_invoice;
    const purchase_invoice_name = purchase_invoice.name;
    const userID = req.body.userId;
    Promise.all([
        company_model_1.default.fetchById(company_id),
        supplier_model_1.default.fetchById(supplier_id),
    ])
        .then((validation) => {
        if (validation[0] == null ||
            validation[1] == null ||
            validation[0].length == 0 ||
            validation[1].length == 0) {
            return res.status(400).send(error_list_1.default["Not found"]);
        }
        else {
            const goodReceipt = new good_receipt_model_1.default(name, date, userID, supplier_id, company_id);
            goodReceipt.create().then((goodReceiptResult) => {
                const purchaseDocument = new purchase_invoice_model_1.default(purchase_invoice_name, null, date, 0, goodReceiptResult.id, req.body.userId);
                purchaseDocument
                    .create()
                    .then(() => {
                    item_purchase_price_model_1.default.fetchCurrentPrice(good_receipt_items.map((x) => {
                        return {
                            item_id: x.item_id,
                            item_unit_id: x.item_unit_id,
                        };
                    }))
                        .then((priceResult) => {
                        for (let x of good_receipt_items) {
                            const price = priceResult.filter((y) => y.item_id == x.item_id &&
                                y.item_unit_id == x.item_unit_id)[0].price;
                            x.price = price;
                        }
                        good_receipt_model_1.default.insertItems(good_receipt_items.map((x) => {
                            return {
                                good_receipt_code_id: goodReceiptResult.id,
                                item_id: x.item_id,
                                item_unit_id: x.item_unit_id,
                                quantity: x.quantity,
                                price: x.price,
                            };
                        }))
                            .then(() => {
                            good_receipt_model_1.default.fetchById(goodReceiptResult.id)
                                .then((document) => {
                                if (document == null) {
                                    return res
                                        .status(400)
                                        .send(error_list_1.default["Not found"]);
                                }
                                else {
                                    product_stock_model_1.default.updateStock(document === null || document === void 0 ? void 0 : document.good_receipt.map((x) => {
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
                                        return res
                                            .status(201)
                                            .send(goodReceiptResult);
                                    })
                                        .catch((error) => {
                                        return res.status(500).send(error);
                                    });
                                }
                            })
                                .catch(() => {
                                return res.status(201).send(goodReceiptResult);
                            });
                        })
                            .catch((error) => {
                            return res.status(500).send(error);
                        });
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                })
                    .catch((error) => {
                    return res.status(500).send(error);
                });
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
GoodReceiptController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    good_receipt_model_1.default.fetchById(id)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
GoodReceiptController.fetchArchive = (req, res) => {
    const mode = req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
        good_receipt_model_1.default.fetchArchiveYears(mode)
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.query.year != undefined && req.query.month == undefined) {
        const year = parseInt(req.query.year.toString());
        good_receipt_model_1.default.fetchArchiveMonths(year, mode)
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
        good_receipt_model_1.default.fetchArchive(year, month, page, mode)
            .then((result) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        date: x.date,
                        is_delete: x.is_delete == 1,
                        is_confirm: x.is_confirm == 1,
                        supplier: {
                            id: x.supplier_id,
                            name: x.supplier_name,
                        },
                        company: {
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
GoodReceiptController.fetchCodeById = (req, res) => {
    try {
        const id = parseInt(req.params.id.toString());
        good_receipt_model_1.default.fetchCodeById(id)
            .then((result) => {
            if (!result) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            else {
                return res.status(200).send(result.good_receipt_code);
            }
        })
            .catch((error) => {
            return res.status(500).send(error);
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
            count: result[1][0].count,
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = GoodReceiptController;
