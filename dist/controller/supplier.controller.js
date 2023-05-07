"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const supplier_model_1 = __importDefault(require("../model/supplier.model"));
class SupplierController {
}
SupplierController.create = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const supplier = new supplier_model_1.default(name, address, npwp, null, req.body.userId);
    supplier
        .create()
        .then((supplier_result) => {
        const socket = new socket_helper_1.default("createSupplier", supplier_result);
        socket.create();
        return res.status(201).send(Object.assign(Object.assign({}, supplier_result), { can_delete: true }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SupplierController.update = (req, res) => {
    const id = parseInt(req.body.id);
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const supplier = new supplier_model_1.default(name, address, npwp, id);
    supplier
        .update()
        .then((supplier_result) => {
        const socket = new socket_helper_1.default("updateSupplier", supplier_result);
        socket.create();
        return res.status(201).send(supplier_result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SupplierController.fetch = (req, res) => {
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent((0, escape_helper_1.mysql_real_escape_string)(req.query.keyword.toString()));
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    supplier_model_1.default.fetch(keyword, offset, limit)
        .then((result) => {
        return res.status(200).send({
            data: result[0].map((x) => {
                return {
                    id: x.id,
                    name: x.name,
                    address: x.address,
                    npwp: x.npwp,
                    created_by: x.created_by,
                    created_at: new Date(x.created_at),
                    can_delete: x.count == 0 ? true : false,
                    user: {
                        name: x.created_by_name,
                    },
                };
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SupplierController.delete = (req, res) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    supplier_model_1.default.fetchById(id).then((result) => {
        if (result == null || result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else if (result[0].count > 0) {
            return res.status(400).send(error_list_1.default["Delete error"]);
        }
        else {
            supplier_model_1.default.deleteById(id, req.body.UserID).then((supplier) => {
                const socket = new socket_helper_1.default("deleteSupplier", supplier);
                socket.create();
                return res.status(201).send(supplier);
            });
        }
    });
};
SupplierController.getAutocomplete = (req, res) => {
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    supplier_model_1.default.getAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SupplierController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    supplier_model_1.default.fetchById(id)
        .then((result) => {
        if (result == null || result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            return res.status(200).send(result[0]);
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = SupplierController;
