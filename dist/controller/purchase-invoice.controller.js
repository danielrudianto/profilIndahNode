"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const company_model_1 = __importDefault(require("../model/company.model"));
const good_receipt_model_1 = __importDefault(require("../model/good_receipt.model"));
const item_purchase_price_model_1 = __importDefault(require("../model/item_purchase_price.model"));
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
const purchase_invoice_model_1 = __importDefault(require("../model/purchase-invoice.model"));
const supplier_model_1 = __importDefault(require("../model/supplier.model"));
class PurchaseInvoiceController {
}
PurchaseInvoiceController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    purchase_invoice_model_1.default.fetchById(id)
        .then((result) => {
        if (result == null) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            let subTotal = 0;
            for (let item of result.good_receipt_code.good_receipt) {
                subTotal +=
                    parseFloat(item.price.toString()) *
                        parseFloat(item.quantity.toString());
            }
            return res.status(200).send(Object.assign(Object.assign({}, result), { subTotal: subTotal, total: subTotal -
                    (result.discount == null
                        ? 0
                        : parseFloat(result.discount.toString())) }));
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
PurchaseInvoiceController.update = (req, res) => {
    const id = req.body.id;
    purchase_invoice_model_1.default.fetchById(id).then((purchase_invoice) => {
        var _a;
        if (!purchase_invoice || purchase_invoice.is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            const date = new Date(req.body.date);
            const name = req.body.name;
            const company_id = req.body.company_id;
            const supplier_id = req.body.supplier_id;
            const good_receipt_items = req.body.good_receipt;
            const purchase_invoice = req.body.purchase_invoice;
            const discount = purchase_invoice.discount;
            const purchase_invoice_name = purchase_invoice.name;
            const faktur = !purchase_invoice.faktur || ((_a = purchase_invoice.faktur) === null || _a === void 0 ? void 0 : _a.length) < 16
                ? null
                : purchase_invoice.faktur;
            const userID = req.body.userId;
            Promise.all([
                company_model_1.default.fetchById(company_id),
                supplier_model_1.default.fetchById(supplier_id),
            ])
                .then((validation) => {
                if (validation[0] == null ||
                    validation[1] == null ||
                    validation[0].length == 0 ||
                    validation[1].length == 0 ||
                    validation[0][0].is_delete ||
                    validation[1][0].is_delete) {
                    return res.status(400).send(error_list_1.default["Not found"]);
                }
                else {
                    good_receipt_model_1.default.fetchById(purchase_invoice.good_receipt_code_id)
                        .then((document) => {
                        if (document == null) {
                            return res.status(404).send(error_list_1.default["Not found"]);
                        }
                        else {
                            const good_receipt_code = new good_receipt_model_1.default(name, date, userID, supplier_id, company_id, purchase_invoice.good_receipt_code_id);
                            good_receipt_code.update().then((good_receipt_result) => {
                                const good_receipt = [];
                                for (let idx = 0; idx < good_receipt_items.length; idx++) {
                                    good_receipt.push({
                                        item_id: good_receipt_items[idx].item_id,
                                        quantity: good_receipt_items[idx].quantity,
                                        good_receipt_code_id: good_receipt_result.id,
                                        price: good_receipt_items[idx].price,
                                        item_unit_id: good_receipt_items[idx].item_unit_id,
                                    });
                                }
                                const purchase_document = new purchase_invoice_model_1.default(purchase_invoice_name, faktur, date, discount, good_receipt_result.id, req.body.userId, req.body.userId);
                                Promise.all([
                                    product_stock_model_1.default.updateStock(document.good_receipt.map((x) => {
                                        const quantity = parseFloat(x.quantity.toString()) *
                                            (x.item_unit == null
                                                ? 1
                                                : parseFloat(x.item_unit.conversion.toString())) *
                                            -1;
                                        return {
                                            item_id: x.item.id,
                                            quantity: quantity,
                                        };
                                    })),
                                    good_receipt_model_1.default.deleteItemsByGoodReceiptCodeId(purchase_invoice.good_receipt_code_id),
                                    good_receipt_model_1.default.insertItems(good_receipt),
                                    purchase_document.update(),
                                ])
                                    .then(() => {
                                    good_receipt_model_1.default.fetchById(purchase_invoice.good_receipt_code_id)
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
                                            })).then(() => {
                                                return res.status(201).send(purchase_invoice);
                                            });
                                        }
                                    })
                                        .catch(() => {
                                        return res.status(201).send(purchase_invoice);
                                    });
                                })
                                    .catch((error) => {
                                    return res.status(500).send(error);
                                });
                            });
                        }
                    })
                        .catch(() => {
                        return res.status(404).send(error_list_1.default["Not found"]);
                    });
                }
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    });
};
PurchaseInvoiceController.create = (req, res) => {
    var _a;
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt;
    const purchase_invoice = req.body.purchase_invoice;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    const faktur = !purchase_invoice.faktur || ((_a = purchase_invoice.faktur) === null || _a === void 0 ? void 0 : _a.length) < 16
        ? null
        : purchase_invoice.faktur;
    const userID = req.body.userId;
    Promise.all([
        company_model_1.default.fetchById(company_id),
        supplier_model_1.default.fetchById(supplier_id),
    ])
        .then((validation) => {
        if (validation[0] == null ||
            validation[1] == null ||
            validation[0].length == 0 ||
            validation[1].length == 0 ||
            validation[0][0].is_delete ||
            validation[1][0].is_delete) {
            return res.status(400).send(error_list_1.default["Not found"]);
        }
        else {
            const good_receipt_code = new good_receipt_model_1.default(name, date, userID, supplier_id, company_id);
            good_receipt_code.create().then((good_receipt_result) => {
                const good_receipt = [];
                const delete_price = [];
                const insert_price = [];
                for (let idx = 0; idx < good_receipt_items.length; idx++) {
                    good_receipt.push({
                        item_id: good_receipt_items[idx].item_id,
                        quantity: good_receipt_items[idx].quantity,
                        good_receipt_code_id: good_receipt_result.id,
                        price: good_receipt_items[idx].price,
                        item_unit_id: good_receipt_items[idx].item_unit_id,
                    });
                    if (good_receipt_items[idx].save == true) {
                        delete_price.push(item_purchase_price_model_1.default.delete(good_receipt_items[idx].item_id, good_receipt_items[idx].item_unit_id, req.body.userId));
                        const purchase_price = new item_purchase_price_model_1.default(parseFloat(good_receipt_items[idx].price), good_receipt_items[idx].item_id, req.body.userId, good_receipt_items[idx].item_unit_id);
                        insert_price.push(purchase_price.create());
                    }
                }
                const purchase_document = new purchase_invoice_model_1.default(purchase_invoice_name, faktur, date, discount, good_receipt_result.id, req.body.userId, req.body.userId);
                Promise.all([
                    good_receipt_model_1.default.insertItems(good_receipt),
                    delete_price,
                    purchase_document.create(),
                ])
                    .then(() => {
                    Promise.all(insert_price)
                        .then(() => {
                        const socket = new socket_helper_1.default("createGoodReceipt", {
                            supplier_id: good_receipt_result.supplier_id,
                            company_id: good_receipt_result.company_id,
                        });
                        socket.create();
                        good_receipt_model_1.default.fetchById(good_receipt_result.id)
                            .then((item) => {
                            if (item == null) {
                                return res.status(400).send(error_list_1.default["Not found"]);
                            }
                            else {
                                product_stock_model_1.default.updateStock(item === null || item === void 0 ? void 0 : item.good_receipt.map((x) => {
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
                                    return res.status(201).send(item);
                                })
                                    .catch(() => {
                                    return res.status(201).send(item);
                                });
                            }
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
PurchaseInvoiceController.fetchUnconfirmed = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    purchase_invoice_model_1.default.fetchUnconfirmed(offset, limit)
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
PurchaseInvoiceController.confirm = (req, res) => {
    const id = req.body.id;
    const discount = req.body.discount;
    const good_receipt = req.body.good_receipt;
    const good_receipt_name = req.body.good_receipt_name;
    const purchase_invoice_name = req.body.name;
    const date = new Date(req.body.date);
    good_receipt_model_1.default.fetchById(id)
        .then((good_receipt_code) => {
        if (good_receipt_code == null ||
            good_receipt_code.purchase_invoice == null) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else if (good_receipt_code.purchase_invoice.is_confirm ||
            good_receipt_code.purchase_invoice.is_delete) {
            return res.status(400).send(error_list_1.default["Not found"]);
        }
        else {
            purchase_invoice_model_1.default.confirmById(id, purchase_invoice_name, good_receipt_name, date, discount, good_receipt, req.body.userId)
                .then((result) => {
                const socket = new socket_helper_1.default("updatePurchaseDocumentStatus", result[0]);
                socket.create();
                if (good_receipt.filter((x) => x.save).length > 0) {
                    // Search for saved items
                    const filtered_good_receipt = good_receipt.filter((x) => x.save);
                    good_receipt_model_1.default.fetchByIds(filtered_good_receipt.map((y) => {
                        return y.id;
                    }))
                        .then((good_receipts) => {
                        if (filtered_good_receipt.length == 0) {
                            return res.status(200).send(result[0]);
                        }
                        else {
                            const insert_transaction = [];
                            const delete_transaction = [];
                            for (let good_receipt_item of good_receipts) {
                                const priceIndex = filtered_good_receipt.findIndex((idx) => idx.id == good_receipt_item.id);
                                if (priceIndex != -1) {
                                    delete_transaction.push(item_purchase_price_model_1.default.delete(good_receipt_item.item_id, good_receipt_item.item_unit_id, req.body.userId));
                                    const itemPurchasePrice = new item_purchase_price_model_1.default(parseFloat(good_receipt_item.price.toString()), good_receipt_item.item_id, req.body.userId, good_receipt_item.item_unit_id);
                                    insert_transaction.push(itemPurchasePrice.create());
                                }
                            }
                            Promise.all(delete_transaction)
                                .then(() => {
                                Promise.all(insert_transaction)
                                    .then(() => {
                                    return res.status(200).send(result[0]);
                                })
                                    .catch((error) => {
                                    console.error(error);
                                    return res.status(500).send(error);
                                });
                            })
                                .catch((error) => {
                                return res.status(500).send(error);
                            });
                        }
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                }
                else {
                    return res.status(200).send(result[0]);
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
PurchaseInvoiceController.delete = (req, res) => {
    try {
        const id = parseInt(req.body.id);
        purchase_invoice_model_1.default.fetchById(id).then((purchase_invoice) => {
            if (purchase_invoice == null || purchase_invoice.is_delete) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            else {
                purchase_invoice_model_1.default.deleteById(id, req.body.userId)
                    .then((result) => {
                    good_receipt_model_1.default.fetchById(result[0].good_receipt_code_id).then((document) => {
                        if (document == null) {
                            return res.status(404).send(error_list_1.default["Not found"]);
                        }
                        else {
                            product_stock_model_1.default.updateStock(document.good_receipt.map((x) => {
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
                                const socket = new socket_helper_1.default("updatePurchaseDocumentStatus", result[0]);
                                socket.create();
                                return res.status(200).send(result[0]);
                            })
                                .catch((error) => {
                                return res.status(500).send(error);
                            });
                        }
                    });
                })
                    .catch((error) => {
                    return res.status(500).send(error);
                });
            }
        });
    }
    catch (error) {
        return res.status(400).send(error);
    }
};
PurchaseInvoiceController.fetchArchive = (req, res) => {
    const mode = req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
        purchase_invoice_model_1.default.fetchArchiveYears(mode)
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.query.year != undefined && req.query.month == undefined) {
        const year = parseInt(req.query.year.toString());
        purchase_invoice_model_1.default.fetchArchiveMonths(year, mode)
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
        purchase_invoice_model_1.default.fetchArchive(year, month, page, mode)
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
PurchaseInvoiceController.searchArchive = (req, res) => {
    const suppliers = req.body.suppliers;
    const items = req.body.items;
    const companies = req.body.companies;
    const date = req.body.date;
    const page = req.body.page;
    const keyword = req.body.keyword;
    const status = req.body.status;
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
    purchase_invoice_model_1.default.search(suppliers, companies, items, [formattedDate_1, formattedDate_2], (0, escape_helper_1.mysql_real_escape_string)(keyword), page, status)
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
exports.default = PurchaseInvoiceController;
