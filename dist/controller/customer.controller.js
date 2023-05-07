"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const customer_model_1 = __importDefault(require("../model/customer.model"));
class CustomerController {
}
CustomerController.create = (req, res) => {
    const name = req.body.name;
    const address = req.body.address;
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const customer = new customer_model_1.default(name, address, npwp, pic, phone_number, req.body.userId);
    customer
        .create()
        .then((result) => {
        const socket = new socket_helper_1.default("createCustomer", Object.assign(Object.assign({}, result), { can_delete: true }));
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
CustomerController.update = (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp;
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;
    const customer = new customer_model_1.default(name, address, npwp, pic, phone_number, req.body.userId, id);
    customer
        .update()
        .then((result) => {
        const socket = new socket_helper_1.default("updateCustomer", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
CustomerController.delete = (req, res) => {
    const id = parseInt(req.params.id.toString());
    customer_model_1.default.fetchById(id).then((result) => {
        if (result == null || result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            if (result[0].count == 0) {
                customer_model_1.default.delete(id, req.body.userId)
                    .then((customer) => {
                    const socket = new socket_helper_1.default("deleteCustomer", customer);
                    socket.create();
                    return res.status(201).send(customer);
                })
                    .catch((error) => {
                    return res.status(500).send(error);
                });
            }
            else {
                return res.status(400).send(error_list_1.default["Delete error"]);
            }
        }
    });
};
CustomerController.fetchAutocomplete = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const keyword = req.query.keyword.toString();
    customer_model_1.default.fetchAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
CustomerController.fetch = (req, res) => {
    var _a;
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword ? "" : (_a = req.query.keyword) === null || _a === void 0 ? void 0 : _a.toString();
    customer_model_1.default.fetch(keyword, offset, limit)
        .then((result) => {
        return res.status(200).send({
            data: result[0].map((x) => {
                return {
                    id: x.id,
                    name: x.name,
                    address: x.address,
                    phoneNumber: x.phoneNumber,
                    npwp: x.npwp,
                    pic: x.pic,
                    can_delete: x.count == 0 ? true : false,
                };
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
CustomerController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    customer_model_1.default.fetchById(id).then((result) => {
        if (result == null || result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            return res.status(200).send(Object.assign(Object.assign({}, result[0]), { can_delete: result[0].count == 0 }));
        }
    });
};
exports.default = CustomerController;
