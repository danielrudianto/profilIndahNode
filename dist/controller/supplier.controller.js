"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const fetch_interface_1 = require("../interface/fetch.interface");
const supplier_model_1 = __importDefault(require("../model/supplier.model"));
class SupplierController {
}
/**
 * Create a new supplier data
 * @param req
 * @param res
 */
SupplierController.create = (req, res) => {
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const userID = req.body.userID;
    supplier_model_1.default.create({
        name: name,
        address: address,
        npwp: npwp,
        created_by: userID,
    })
        .then((supplier_result) => {
        const socket = new socket_helper_1.default("createSupplier", supplier_result);
        socket.create();
        return res.status(201).send(Object.assign(Object.assign({}, supplier_result), { can_delete: true }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Fetch supplier data by keyword, page, and limit
 * @param req
 * @param res
 */
SupplierController.fetch = (req, res) => {
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent((0, escape_helper_1.mysql_real_escape_string)(req.query.keyword.toString()));
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    supplier_model_1.default.fetch(keyword, limit, offset, fetch_interface_1.fetchMode.Pagination)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching supplier data ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch supplier data autocomplete
 * @param req
 * @param res
 */
SupplierController.fetchAutocomplete = (req, res) => {
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    supplier_model_1.default.fetch(keyword, 5, 0, fetch_interface_1.fetchMode.Autocomplete)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Fetch supplier data by ID
 * @param req
 * @param res
 */
SupplierController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    supplier_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching supplier ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Update supplier data
 * @param req
 * @param res
 */
SupplierController.updateByID = (req, res) => {
    const id = parseInt(req.body.id);
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const userID = req.body.userID;
    supplier_model_1.default.update({
        id: id,
        name: name,
        address: address,
        npwp: npwp,
        created_by: userID,
    })
        .then((result) => {
        const socket = new socket_helper_1.default("updateSupplier", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on updating supplier data ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Delete supplier data by ID
 * @param req
 * @param res
 */
SupplierController.deleteByID = (req, res) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userID;
    supplier_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result.is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (!result.can_delete) {
            return res.status(403).send(error_list_1.default["Delete error"]);
        }
        supplier_model_1.default.deleteByID(id, userID)
            .then((result) => {
            const socket = new socket_helper_1.default("deleteSupplier", result);
            socket.create();
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on deleting supplier data ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching supplier ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
exports.default = SupplierController;
//# sourceMappingURL=supplier.controller.js.map