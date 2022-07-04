"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const payment_method_model_1 = __importDefault(require("../model/payment_method.model"));
class PaymentMethodController {
}
PaymentMethodController.fetch = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    payment_method_model_1.default.fetch(keyword, offset, limit)
        .then((result) => {
        bill_code_model_1.default.countByPaymentMethodIds(result[0].map((x) => {
            return x.id;
        }))
            .then((count) => {
            return res.status(200).send({
                data: result[0].map((datum) => {
                    return Object.assign(Object.assign({}, datum), { can_delete: count.filter((y) => {
                            y.payment_method_id == datum.id;
                        }).length == 0
                            ? true
                            : count.filter((y) => {
                                y.payment_method_id == datum.id;
                            })[0]._count == 0 });
                }),
                count: result[1],
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
PaymentMethodController.submit = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const name = req.body.name;
    const description = req.body.description;
    const paymentMethod = new payment_method_model_1.default(name, description, req.body.userId);
    paymentMethod
        .create()
        .then((result) => {
        log_helper_1.default.log(result.created_at, "info", `${result.user.name} berhasil menambahkan metode pembayaran dengan nama ${result.name} (ID: ${result.id}).`, "Payment Method - Create", req.body.userId);
        const socket = new socket_helper_1.default("createPaymentMethod", Object.assign(Object.assign({}, result), { can_delete: true }));
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Payment Method - Create", req.body.userId);
        return res.status(500).send(error);
    });
};
PaymentMethodController.fetchAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    payment_method_model_1.default.fetchAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Payment Method - Create", req.body.userId);
        return res.status(500).send(error);
    });
};
PaymentMethodController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    payment_method_model_1.default.fetchById(id).then((result) => {
        return res.status(200).send(Object.assign(Object.assign({}, result[0]), { can_delete: result[1] == 0 }));
    }).catch(error => {
        log_helper_1.default.log(new Date(), "error", error, "Payment Method - Fetch by ID", req.body.userId);
        return res.status(500).send(error);
    });
};
PaymentMethodController.update = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const id = parseInt(req.body.id);
    const name = req.body.name;
    const description = req.body.description;
    payment_method_model_1.default.fetchById(id).then((payment_method) => {
        if (payment_method[0] == null || payment_method[0].is_delete) {
            return res.status(404).send("Metode pembayaran tidak ditemukan.");
        }
        else {
            const paymentMethod = new payment_method_model_1.default(name, description, req.body.userId, id);
            paymentMethod.update().then((result) => {
                const socket = new socket_helper_1.default("updatePaymentMethod", result);
                socket.create();
                return res.status(201).send(result);
            }).catch(error => {
                log_helper_1.default.log(new Date(), "error", error, "Payment Method - Update", req.body.userId);
                return res.status(500).send(error);
            });
        }
    }).catch(error => {
        log_helper_1.default.log(new Date(), "error", error, "Payment Method - Update", req.body.userId);
        return res.status(500).send(error);
    });
};
PaymentMethodController.delete = (req, res) => {
    const id = parseInt(req.params.id);
    bill_code_model_1.default.countByPaymentMethodId(id).then(count => {
        if (count == 0) {
            payment_method_model_1.default.delete(id, req.body.userId).then(result => {
                log_helper_1.default.log(new Date(), "info", `${result.user_payment_method_deleted_byTouser.name} berhasil menghapus data metode penjualan dengan nama ${result.name} (ID: ${result.id})`, "Payment method - Delete", req.body.userId);
                const socket = new socket_helper_1.default("deletePaymentMethod", result);
                socket.create();
                return res.status(201).send(result);
            }).catch(error => {
                log_helper_1.default.log(new Date(), "error", error, "Payment method - Delete", req.body.userId);
            });
        }
        else {
            return res.status(400).send("Data tidak dapat dihapus karena ada penjualan yang menggunakan data ini.");
        }
    }).catch(error => {
        log_helper_1.default.log(new Date(), "error", error, "Payment method - Delete", req.body.userId);
        return res.status(500).send(error);
    });
};
exports.default = PaymentMethodController;
