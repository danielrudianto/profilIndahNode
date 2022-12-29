"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const company_model_1 = __importDefault(require("../model/company.model"));
const good_receipt_model_1 = __importDefault(require("../model/good_receipt.model"));
const item_purchase_price_model_1 = __importDefault(require("../model/item_purchase_price.model"));
const purchase_document_model_1 = __importDefault(require("../model/purchase_document.model"));
const supplier_model_1 = __importDefault(require("../model/supplier.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
class GoodReceiptController {
}
GoodReceiptController.create = (req, res) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt;
    const purchase_invoice = req.body.purchase_invoice;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    Promise.all([
        company_model_1.default.fetchById(company_id),
        supplier_model_1.default.fetchById(supplier_id),
    ])
        .then((validation) => {
        if (!validation[0] ||
            !validation[1] ||
            validation[0].is_delete ||
            validation[1].is_delete) {
            return res.status(500).send("Perusahaan / supplier tidak ditemukan.");
        }
        const good_receipt = new good_receipt_model_1.default(name, date, req.body.userId, supplier_id, company_id);
        good_receipt
            .create()
            .then((good_receipt_result) => {
            const item_ids = [];
            for (let i = 0; i < good_receipt_items.length; i++) {
                item_ids.push(good_receipt_items[i].item_id);
            }
            item_purchase_price_model_1.default.fetchByItemIds(item_ids)
                .then((result) => {
                const good_receipt_items_input = [];
                for (let idx = 0; idx < good_receipt_items.length; idx++) {
                    const price = result.filter((x) => x.item_id == good_receipt_items[idx].item_id).length == 0
                        ? 0
                        : result.filter((x) => x.item_id == good_receipt_items[idx].item_id)[0].price;
                    good_receipt_items_input.push({
                        item_id: good_receipt_items[idx].item_id,
                        item_unit_id: good_receipt_items[idx].item_unit_id,
                        quantity: good_receipt_items[idx].quantity,
                        good_receipt_code_id: good_receipt_result.id,
                        price: price,
                    });
                }
                const insert_item = good_receipt_model_1.default.insertItems(good_receipt_items_input);
                const purchase_document = new purchase_document_model_1.default(purchase_invoice_name, null, date, discount, good_receipt_result.id, req.body.userId);
                const insert_purchase_document = purchase_document.create();
                Promise.all([insert_item, insert_purchase_document])
                    .then((insert_transaction) => {
                    log_helper_1.default.log(good_receipt_result.created_at, "info", `${good_receipt_result.user_good_receipt_code_created_byTouser.name} berhasil menambahkan penerimaan barang (ID: ${good_receipt_result.id}) dari ${good_receipt_result.supplier.name} (ID: ${good_receipt_result.id}) untuk perusahaan ${good_receipt_result.company.name} (ID: ${good_receipt_result.company.id})`, "Good Receipt controller - Create", good_receipt_result.created_by);
                    const socket = new socket_helper_1.default("createGoodReceipt", {
                        supplier_id: insert_transaction[1].good_receipt_code.supplier_id,
                        company_id: insert_transaction[1].good_receipt_code.company_id,
                    });
                    socket.create();
                    return res.status(201).send(Object.assign(Object.assign({}, good_receipt_result), { good_receipt: insert_transaction[0], purchase_invoice: insert_transaction[1] }));
                })
                    .catch((error) => {
                    log_helper_1.default.log(new Date(), "error", error, "Good Receipt - Create", req.body.userId);
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
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!req.params.year && !req.params.month) {
        Promise.all([
            good_receipt_model_1.default.fetchArchiveYears(),
            good_receipt_model_1.default.countArchiveByYear(),
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
        good_receipt_model_1.default.countArchiveByMonth(year)
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
            good_receipt_model_1.default.fetchArchive(year, month, offset, limit),
            good_receipt_model_1.default.countArchive(year, month),
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
exports.default = GoodReceiptController;
