"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const good_receipt_model_1 = __importDefault(require("../model/good_receipt.model"));
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
        log_helper_1.default.log(new Date(), "info", `${supplier_result.user.name} created supplier with the name ${supplier_result.name} (ID: ${supplier_result.id})`, "Supplier - Create", req.body.userId);
        const socket = new socket_helper_1.default("createSupplier", supplier_result);
        socket.create();
        return res.status(201).send(Object.assign(Object.assign({}, supplier_result), { can_delete: true }));
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Supplier - Create", req.body.userId);
        return res.status(500).send(error);
    });
};
SupplierController.update = (req, res) => {
    const name = req.body.name;
    const id = req.body.id;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const supplier = new supplier_model_1.default(name, address, npwp, id);
    supplier
        .update()
        .then((supplier_result) => {
        const socket = new socket_helper_1.default("updateSupplier", supplier_result);
        socket.create();
        return res.status(201).send("Data supplier berhasil dirubah.");
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SupplierController.getItems = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    supplier_model_1.default.getItems(keyword, offset, limit)
        .then((result) => {
        good_receipt_model_1.default.countBySupplierIds(result[0].map((x) => {
            return x.id;
        }))
            .then((counts) => {
            return res.status(200).send({
                data: result[0].map((item) => {
                    return Object.assign(Object.assign({}, item), { can_delete: counts.filter((count) => count.supplier_id == item.id)
                            .length == 0
                            ? true
                            : counts.filter((count) => count.supplier_id == item.id)[0]._count == 0 });
                }),
                count: result[1],
            });
        })
            .catch((error) => {
            log_helper_1.default.log(new Date(), "error", error, "Supplier - Fetch", req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Supplier - Fetch", req.body.userId);
        return res.status(500).send(error);
    });
};
SupplierController.getAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    supplier_model_1.default.getAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = SupplierController;
