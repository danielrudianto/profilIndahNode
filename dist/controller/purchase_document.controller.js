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
        return res.status(200).send(result);
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
            const good_receipt_items_input = [];
            for (let idx = 0; idx < good_receipt_items.length; idx++) {
                good_receipt_items_input.push({
                    item_id: good_receipt_items[idx].item_id,
                    quantity: good_receipt_items[idx].quantity,
                    good_receipt_code_id: good_receipt_result.id,
                    price: good_receipt_items[idx].price,
                });
            }
            const insert_item = good_receipt_model_1.default.insertItems(good_receipt_items_input);
            const delete_item = good_receipt_model_1.default.deleteItemsByGoodReceiptCodeId(good_receipt_result.id);
            const purchase_document = new purchase_document_model_1.default(purchase_invoice_name, date, discount, good_receipt_result.id, req.body.userId, good_receipt_result.purchase_invoice[0].id);
            const update_purchase_document = purchase_document.update();
            const transaction = new query_transaction_helper_1.default();
            transaction
                .create([update_purchase_document, delete_item])
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
};
PurchaseDocumentController.create = (req, res) => {
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
exports.default = PurchaseDocumentController;
