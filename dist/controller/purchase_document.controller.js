"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const company_model_1 = __importDefault(require("../model/company.model"));
const good_receipt_model_1 = __importDefault(require("../model/good_receipt.model"));
const item_purchase_price_model_1 = __importDefault(require("../model/item_purchase_price.model"));
const purchase_document_model_1 = __importDefault(require("../model/purchase_document.model"));
const supplier_model_1 = __importDefault(require("../model/supplier.model"));
class PurchaseDocumentController {
}
PurchaseDocumentController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    purchase_document_model_1.default.fetchById(id)
        .then((result) => {
        return res.status(200).send(Object.assign(Object.assign({}, result), { purchase_invoice: result === null || result === void 0 ? void 0 : result.purchase_invoice }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
PurchaseDocumentController.update = (req, res) => {
    const id = req.body.id;
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt;
    const purchase_invoice = req.body.purchase_invoice;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    const faktur = !purchase_invoice.faktur || purchase_invoice.faktur.length < 16
        ? null
        : purchase_invoice.faktur;
    Promise.all([
        company_model_1.default.fetchById(company_id),
        supplier_model_1.default.fetchById(supplier_id),
    ])
        .then((validation) => {
        if (validation[0] == null ||
            validation[1] == null ||
            validation[0].is_delete ||
            validation[1].is_delete) {
            return res.status(500).send("Perusahaan / supplier tidak ditemukan.");
        }
        const good_receipt = new good_receipt_model_1.default(name, date, req.body.userId, supplier_id, company_id, id);
        good_receipt
            .update()
            .then((good_receipt_result) => {
            var _a;
            const good_receipt_items_input = [];
            for (let idx = 0; idx < good_receipt_items.length; idx++) {
                good_receipt_items_input.push({
                    item_id: good_receipt_items[idx].item_id,
                    quantity: good_receipt_items[idx].quantity,
                    good_receipt_code_id: good_receipt_result.id,
                    price: good_receipt_items[idx].price,
                    item_unit_id: good_receipt_items[idx].item_unit_id,
                });
            }
            const insert_item = good_receipt_model_1.default.insertItems(good_receipt_items_input);
            const delete_item = good_receipt_model_1.default.deleteItemsByGoodReceiptCodeId(good_receipt_result.id);
            purchase_document_model_1.default.fetchById((_a = good_receipt_result.purchase_invoice) === null || _a === void 0 ? void 0 : _a.id)
                .then((purchase_document) => {
                var _a, _b;
                const updated_purchase_document = new purchase_document_model_1.default(purchase_invoice_name, faktur, date, discount, good_receipt_result.id, req.body.userId, (_a = purchase_document === null || purchase_document === void 0 ? void 0 : purchase_document.user_good_receipt_code_confirmed_byTouser) === null || _a === void 0 ? void 0 : _a.id, (_b = good_receipt_result.purchase_invoice) === null || _b === void 0 ? void 0 : _b.id);
                const update_purchase_document = updated_purchase_document.update();
                Promise.all([update_purchase_document, delete_item])
                    .then(() => {
                    insert_item
                        .then((items) => {
                        return res.status(201).send(Object.assign(Object.assign({}, good_receipt_result), { good_receipt: items }));
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
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
PurchaseDocumentController.create = (req, res) => {
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
    Promise.all([
        company_model_1.default.fetchById(company_id),
        supplier_model_1.default.fetchById(supplier_id),
    ])
        .then((validation) => {
        if (validation[0] == null ||
            validation[1] == null ||
            validation[0].is_delete ||
            validation[1].is_delete) {
            return res.status(500).send("Perusahaan / supplier tidak ditemukan.");
        }
        const good_receipt_code = new good_receipt_model_1.default(name, date, req.body.userId, supplier_id, company_id);
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
            const purchase_document = new purchase_document_model_1.default(purchase_invoice_name, faktur, date, discount, good_receipt_result.id, req.body.userId, req.body.userId);
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
                        return res.status(201).send(item);
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
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
PurchaseDocumentController.fetchUnconfirmed = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    purchase_document_model_1.default.fetchUnconfirmed(offset, limit)
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
PurchaseDocumentController.confirm = (req, res) => {
    const id = req.body.id;
    const discount = req.body.discount;
    const good_receipt = req.body.good_receipt;
    const good_receipt_name = req.body.good_receipt_name;
    const purchase_invoice_name = req.body.name;
    const date = new Date(req.body.date);
    purchase_document_model_1.default.fetchById(id)
        .then((good_receipt_code) => {
        if (good_receipt_code == null ||
            good_receipt_code.purchase_invoice == null) {
            return res.status(404).send("Pembelian tidak ditemukan.");
        }
        else if (good_receipt_code.purchase_invoice.is_confirm ||
            good_receipt_code.purchase_invoice.is_delete) {
            return res
                .status(400)
                .send("Pembelian telah dikonfirmasi atau dihapus.");
        }
        else {
            purchase_document_model_1.default.confirmById(id, purchase_invoice_name, good_receipt_name, date, discount, good_receipt, req.body.userId)
                .then((result) => {
                const socket = new socket_helper_1.default("updatePurchaseDocumentStatus", result[0]);
                socket.create();
                if (good_receipt.filter((x) => x.save).length > 0) {
                    const filtered_good_receipt = good_receipt.filter((x) => x.save);
                    good_receipt_model_1.default.fetchByIds(filtered_good_receipt.map((y) => {
                        return y.id;
                    }))
                        .then((good_receipts) => {
                        const transactions = [];
                        const good_receipt_input = [];
                        for (let good_receipt_item of good_receipts) {
                            const priceIndex = filtered_good_receipt.findIndex((idx) => idx.id == good_receipt_item.id);
                            if (priceIndex != -1) {
                                const price = filtered_good_receipt[priceIndex].price;
                                const itemPurchasePrice = new item_purchase_price_model_1.default(price, good_receipt_item.item_id, req.body.userId, good_receipt_item.item_unit_id);
                                good_receipt_input.push(itemPurchasePrice);
                            }
                        }
                        item_purchase_price_model_1.default.insertItems(good_receipt_input)
                            .then(() => {
                            return res.status(200).send(result[0]);
                        })
                            .catch((error) => {
                            return res.status(500).send(error);
                        });
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
PurchaseDocumentController.delete = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const id = parseInt(req.params.id);
    purchase_document_model_1.default.fetchById(id).then((good_receipt_code) => {
        if (good_receipt_code == null ||
            good_receipt_code.purchase_invoice == null) {
            return res.status(404).send("Pembelian tidak ditemukan.");
        }
        else if (good_receipt_code.purchase_invoice.is_delete) {
            return res
                .status(400)
                .send("Pembelian telah dikonfirmasi atau dihapus.");
        }
        else {
            purchase_document_model_1.default.deleteById(id, req.body.userId)
                .then((result) => {
                const socket = new socket_helper_1.default("updatePurchaseDocumentStatus", result[0]);
                socket.create();
                return res.status(200).send(result[0]);
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    });
};
PurchaseDocumentController.confirmUnchanged = (req, res) => {
    const id = parseInt(req.body.id);
    purchase_document_model_1.default.fetchById(id)
        .then((purchase_document) => {
        var _a, _b;
        if (purchase_document == null ||
            purchase_document.purchase_invoice == null ||
            ((_a = purchase_document.purchase_invoice) === null || _a === void 0 ? void 0 : _a.is_delete)) {
            return res.status(404).send("Dokumen pembelian tidak ditemukan.");
        }
        else if ((_b = purchase_document.purchase_invoice) === null || _b === void 0 ? void 0 : _b.is_confirm) {
            return res.status(404).send("Dokumen sudah dikonfirmasi.");
        }
        else {
            purchase_document_model_1.default.confirmByIdUnchanged(id, req.body.userId)
                .then((result) => {
                return res.status(200).send(result);
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
PurchaseDocumentController.fetchArchive = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!req.params.year && !req.params.month) {
        Promise.all([
            purchase_document_model_1.default.fetchArchiveYears(),
            purchase_document_model_1.default.countArchiveByYear(),
        ])
            .then((result) => {
            const response = [];
            result[0].forEach((item) => {
                response.push({
                    year: item.year,
                    count: result[1].filter((x) => x.year == item.year)[0]
                        .count,
                });
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (!req.params.month) {
        const count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        purchase_document_model_1.default.countArchiveByMonth(year)
            .then((counts) => {
            counts.forEach((x) => {
                const month = x.month;
                const num = x.count;
                count[month - 1] = num;
            });
            return res.status(200).send(count);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.params.year && req.params.month) {
        const page = !req.query.page
            ? 1
            : Math.max(parseInt(req.query.page.toString()), 1);
        const limit = parseInt(process.env.LIMIT.toString());
        const offset = (page - 1) * limit;
        Promise.all([
            purchase_document_model_1.default.fetchArchive(year, month, offset, limit),
            purchase_document_model_1.default.countArchive(year, month),
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
    }
    else {
        return res.status(400).send("Input tidak dikenal.");
    }
};
PurchaseDocumentController.searchArchive = (req, res) => {
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const offset = (page - 1) * 10;
    const start = !req.query.start ? null : req.query.start.toString();
    const end = !req.query.end ? null : req.query.end.toString();
    Promise.all([
        purchase_document_model_1.default.searchArchives(keyword, start, end, offset),
        purchase_document_model_1.default.searchCountArchives(keyword, start, end),
    ])
        .then((result) => {
        return res.status(200).send({
            data: result[0],
            count: result[1],
        });
    })
        .catch((error) => {
        console.error(error);
        return res.status(500).send(error);
    });
};
exports.default = PurchaseDocumentController;
