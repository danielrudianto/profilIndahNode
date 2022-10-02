"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const query_transaction_helper_1 = __importDefault(require("../helper/query.transaction.helper"));
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
    const purchase_invoice = req.body.purchase_invoice[0];
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    const company_validation = company_model_1.default.fetchById(company_id);
    const supplier_validation = supplier_model_1.default.fetchById(supplier_id);
    const transaction_validation = new query_transaction_helper_1.default();
    transaction_validation
        .create([company_validation, supplier_validation])
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
                const updated_purchase_document = new purchase_document_model_1.default(purchase_invoice_name, date, discount, good_receipt_result.id, req.body.userId, (_a = purchase_document === null || purchase_document === void 0 ? void 0 : purchase_document.user_good_receipt_code_confirmed_byTouser) === null || _a === void 0 ? void 0 : _a.id, (_b = good_receipt_result.purchase_invoice) === null || _b === void 0 ? void 0 : _b.id);
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
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt;
    const purchase_invoice = req.body.purchase_invoice;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    const company_validation = company_model_1.default.fetchById(company_id);
    const supplier_validation = supplier_model_1.default.fetchById(supplier_id);
    const transaction_validation = new query_transaction_helper_1.default();
    transaction_validation
        .create([company_validation, supplier_validation])
        .then((validation) => {
        if (validation[0] == null ||
            validation[1] == null ||
            validation[0].is_delete ||
            validation[1].is_delete) {
            return res.status(500).send("Perusahaan / supplier tidak ditemukan.");
        }
        const good_receipt = new good_receipt_model_1.default(name, date, req.body.userId, supplier_id, company_id);
        good_receipt
            .create()
            .then((good_receipt_result) => {
            const transactions = [];
            const transaction = new query_transaction_helper_1.default();
            transaction.create(transactions).then((result) => {
                const good_receipt_items_input = [];
                const good_receipt_items_price = [];
                for (let idx = 0; idx < good_receipt_items.length; idx++) {
                    good_receipt_items_input.push({
                        item_id: good_receipt_items[idx].item_id,
                        quantity: good_receipt_items[idx].quantity,
                        good_receipt_code_id: good_receipt_result.id,
                        price: good_receipt_items[idx].price,
                        item_unit_id: good_receipt_items[idx].item_unit_id,
                    });
                    if (good_receipt_items[idx].save == true) {
                        const purchase_price = new item_purchase_price_model_1.default(parseFloat(good_receipt_items[idx].price), good_receipt_items[idx].item_id, req.body.userId);
                        good_receipt_items_price.push(purchase_price);
                    }
                }
                const insert_item = good_receipt_model_1.default.insertItems(good_receipt_items_input);
                const save_price = item_purchase_price_model_1.default.insertItems(good_receipt_items_price);
                const purchase_document = new purchase_document_model_1.default(purchase_invoice_name, date, discount, good_receipt_result.id, req.body.userId);
                const insert_purchase_document = purchase_document.create();
                transaction
                    .create([insert_item, ...save_price, insert_purchase_document])
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
                    log_helper_1.default.log(new Date(), "error", error, "Purchase Document - Create", req.body.userId);
                    return res.status(500).send(error);
                });
            });
        })
            .catch((error) => {
            log_helper_1.default.log(new Date(), "error", error, "Purchase Document Controller - Create", req.body.userId);
            return res.status(500).send(error);
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
            purchase_document_model_1.default.confirmById(id, discount, good_receipt, req.body.userId)
                .then((result) => {
                const socket = new socket_helper_1.default("updatePurchaseDocumentStatus", result[0]);
                socket.create();
                return res.status(200).send(result[0]);
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
    const id = parseInt(req.params.id);
    purchase_document_model_1.default.fetchById(id).then((good_receipt_code) => {
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
exports.default = PurchaseDocumentController;
