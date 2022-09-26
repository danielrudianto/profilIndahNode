"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const query_transaction_helper_1 = __importDefault(require("../helper/query.transaction.helper"));
const bill_model_1 = __importDefault(require("../model/bill.model"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const item_price_model_1 = __importDefault(require("../model/item_price.model"));
class BillController {
}
BillController.create = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const customer_id = req.body.customer_id;
    const payment_method_id = req.body.payment_method_id;
    const discount = parseFloat(req.body.discount);
    const delivery = parseFloat(req.body.delivery);
    const service = parseFloat(req.body.service);
    const bill = req.body.bill;
    const date = (!req.body.date || req.body.date == null) ? new Date() : new Date(req.body.date);
    const bill_code = new bill_code_model_1.default(customer_id, req.body.userId, payment_method_id, discount, delivery, service, date);
    bill_code
        .create()
        .then((result) => {
        Promise.all([
            bill_model_1.default.create(bill.map((x) => {
                return {
                    item_id: x.item_id,
                    item_unit_id: x.item_unit_id,
                    price: x.price,
                    discount: x.discount,
                    quantity: x.quantity,
                    bill_code_id: result.id,
                };
            })),
            item_price_model_1.default.updateMany(bill.filter(x => x.save), req.body.userId)
        ])
            .then(() => {
            log_helper_1.default.log(new Date(), "info", `${result.user_bill_code_created_byTouser.name} berhasil menambahkan faktur penjualan ${result.name} (ID: ${result.id})`, "Bill controller - Create", req.body.userId);
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(error);
            log_helper_1.default.log(new Date(), "error", error, "Bill controller - Create", req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        console.error(error);
        log_helper_1.default.log(new Date(), "error", error, "Bill controller - Create", req.body.userId);
        return res.status(500).send(error);
    });
};
BillController.fetchCodeById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    bill_code_model_1.default.fetchCodeById(id).then(result => {
        return res.status(200).send(result === null || result === void 0 ? void 0 : result.bill_code);
    }).catch(error => {
        log_helper_1.default.log(new Date(), "error", error, "Bill controller - Fetch code by ID", req.body.userId);
        return res.status(500).send(error);
    });
};
BillController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    bill_code_model_1.default.fetchById(id).then(result => {
        return res.status(200).send(result);
    }).catch(error => {
        return res.status(500).send(error);
    });
};
BillController.fetchArchive = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!req.params.year && !req.params.month) {
        const archive_years = bill_code_model_1.default.fetchArchiveYears();
        const count_archive_years = bill_code_model_1.default.countArchiveByYear();
        const transaction = new query_transaction_helper_1.default();
        transaction
            .create([archive_years, count_archive_years])
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
        bill_code_model_1.default.countArchiveByMonth(year)
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
        const transaction = new query_transaction_helper_1.default();
        transaction
            .create([
            bill_code_model_1.default.fetchArchive(year, month, offset, limit),
            bill_code_model_1.default.countArchive(year, month),
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
exports.default = BillController;
