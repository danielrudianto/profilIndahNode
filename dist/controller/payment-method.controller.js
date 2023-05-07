"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const payment_method_model_1 = __importDefault(require("../model/payment-method.model"));
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
        return res.status(200).send({
            data: result[0].map((x) => {
                return Object.assign(Object.assign({}, x), { can_delete: x.count == 0 });
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
PaymentMethodController.submit = (req, res) => {
    const name = req.body.name;
    const description = req.body.description;
    const paymentMethod = new payment_method_model_1.default(name, description, req.body.userId);
    paymentMethod
        .create()
        .then((result) => {
        const socket = new socket_helper_1.default("createPaymentMethod", Object.assign(Object.assign({}, result), { can_delete: true }));
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
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
        return res.status(500).send(error);
    });
};
PaymentMethodController.fetchAll = (req, res) => {
    payment_method_model_1.default.fetchAll()
        .then((result) => {
        return res.status(200).send({
            data: result,
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
PaymentMethodController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    payment_method_model_1.default.fetchById(id)
        .then((result) => {
        return res.status(200).send(Object.assign(Object.assign({}, result[0]), { can_delete: result[1] == 0 }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
PaymentMethodController.update = (req, res) => {
    const id = parseInt(req.body.id);
    const name = req.body.name;
    const description = req.body.description;
    payment_method_model_1.default.fetchById(id)
        .then((payment_method) => {
        if (payment_method[0] == null || payment_method[0].is_delete) {
            return res.status(404).send("Metode pembayaran tidak ditemukan.");
        }
        else {
            const paymentMethod = new payment_method_model_1.default(name, description, req.body.userId, id);
            paymentMethod
                .update()
                .then((result) => {
                const socket = new socket_helper_1.default("updatePaymentMethod", result);
                socket.create();
                return res.status(201).send(result);
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
PaymentMethodController.delete = (req, res) => {
    const id = parseInt(req.params.id);
    payment_method_model_1.default.fetchById(id)
        .then((result) => {
        if (result == null || result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else if (result[0].count > 0) {
            return res.status(400).send(error_list_1.default["Delete error"]);
        }
        else {
            payment_method_model_1.default.delete(id, req.body.userId)
                .then((result) => {
                const socket = new socket_helper_1.default("deletePaymentMethod", result);
                socket.create();
                return res.status(201).send(result);
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
exports.default = PaymentMethodController;
