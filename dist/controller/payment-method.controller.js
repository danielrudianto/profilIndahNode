"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const fetch_interface_1 = require("../interface/fetch.interface");
const payment_method_model_1 = __importDefault(require("../model/payment-method.model"));
class PaymentMethodController {
}
/**
 * Create a new payment method
 * @param req
 * @param res
 */
PaymentMethodController.create = (req, res) => {
    const name = req.body.name;
    const description = req.body.description;
    const userID = req.body.userID;
    payment_method_model_1.default.create({
        name: name,
        description: description,
        created_by: userID,
    })
        .then((result) => {
        const socket = new socket_helper_1.default("createPaymentMethod", Object.assign(Object.assign({}, result), { can_delete: true }));
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on create payment method: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch payment method
 * @param req
 * @param res
 */
PaymentMethodController.fetch = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    payment_method_model_1.default.fetch(keyword, offset, limit, fetch_interface_1.fetchMode.Pagination)
        .then((result) => {
        return res.status(200).send({
            data: result[0].map((x) => {
                return Object.assign(Object.assign({}, x), { can_delete: x.can_delete == "1" ? true : false });
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetch payment method: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch payment method autocomplete
 * @param req
 * @param res
 */
PaymentMethodController.fetchAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    payment_method_model_1.default.fetch(keyword, 0, 5, fetch_interface_1.fetchMode.Autocomplete)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Fetch all payment method
 * @param req
 * @param res
 */
PaymentMethodController.fetchAll = (_, res) => {
    payment_method_model_1.default.fetch("", 0, 0, fetch_interface_1.fetchMode.All)
        .then((result) => {
        return res.status(200).send({
            data: result,
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Fetch payment method by id
 * @param req
 * @param res
 */
PaymentMethodController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    payment_method_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(Object.assign(Object.assign({}, result[0]), { can_delete: result[0].can_delete == "1" ? true : false }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetch payment method: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Update payment method
 * @param req
 * @param res
 */
PaymentMethodController.updateByID = (req, res) => {
    const id = parseInt(req.body.id);
    const name = req.body.name;
    const description = req.body.description;
    const userID = req.body.userID;
    payment_method_model_1.default.fetchByID(id)
        .then((payment_method) => {
        if (payment_method[0] == null || payment_method[0].is_delete) {
            return res.status(404).send("Metode pembayaran tidak ditemukan.");
        }
        else {
            payment_method_model_1.default.update({
                id: id,
                name: name,
                description: description,
                created_by: userID,
            })
                .then((result) => {
                const socket = new socket_helper_1.default("updatePaymentMethod", result);
                socket.create();
                return res.status(201).send(result);
            })
                .catch((error) => {
                console.error(`[error]: Error on update payment method: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Delete payment method
 * @param req
 * @param res
 */
PaymentMethodController.deleteByID = (req, res) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userID;
    payment_method_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result || result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (!result[0].can_delete) {
            return res.status(400).send(error_list_1.default["Delete error"]);
        }
        payment_method_model_1.default.delete(id, userID)
            .then((result) => {
            const socket = new socket_helper_1.default("deletePaymentMethod", result);
            socket.create();
            return res.status(201).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = PaymentMethodController;
//# sourceMappingURL=payment-method.controller.js.map