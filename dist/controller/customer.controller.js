"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const app_1 = require("../app");
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const fetch_interface_1 = require("../interface/fetch.interface");
const customer_model_1 = __importDefault(require("../model/customer.model"));
class CustomerController {
}
_a = CustomerController;
/**
 * Create new customer
 * @param req
 * @param res
 */
CustomerController.create = (req, res) => {
    const name = req.body.name;
    const address = req.body.address;
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;
    const npwp = req.body.npwp == null
        ? null
        : req.body.npwp.toString().length == 15 ||
            req.body.npwp.toString().length == 16
            ? req.body.npwp
            : null;
    customer_model_1.default.create({
        name: name,
        address: address,
        npwp: npwp,
        pic: pic,
        phone_number: phone_number,
        created_by: req.body.userID,
    })
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        const socket = new socket_helper_1.default("createCustomer", Object.assign(Object.assign({}, result), { can_delete: true }));
        socket.create();
        yield app_1.meili.index("customer").addDocuments([result]);
        return res.status(201).send(result);
    }))
        .catch((error) => {
        console.error(`[error]: Error on creating customer: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch customer by id
 * @param req
 * @param res
 */
CustomerController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    customer_model_1.default.fetchByID(id)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching customer data: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch customers with pagination
 * @param req
 * @param res
 */
CustomerController.fetch = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    if (keyword != "") {
        app_1.meili
            .index("customer")
            .search(keyword, {
            limit: 10,
            offset: 0,
        })
            .then((result) => __awaiter(void 0, void 0, void 0, function* () {
            const ids = result.hits.map((item) => item.id);
            const data = (yield customer_model_1.default.fetchByIDs(ids));
            return res.status(200).send({
                data: result.hits.map((x) => {
                    const dataIndex = data.findIndex((y) => {
                        y.id == x.id;
                    });
                    return {
                        id: x.id,
                        name: x.name,
                        address: x.address,
                        npwp: x.npwp,
                        pic: x.pic,
                        phone_number: x.phone_number,
                        can_delete: dataIndex == -1
                            ? false
                            : data[dataIndex].count == "1"
                                ? true
                                : false,
                    };
                }),
                count: result.hits.length,
            });
        }))
            .catch((error) => {
            console.error(`[error]: Error on fetching customer data on Meilisearch ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else {
        customer_model_1.default.fetch("", offset, limit, fetch_interface_1.fetchMode.Pagination)
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching customer data: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
};
/**
 * Fetch customer autocomplete
 * @param req
 * @param res
 */
CustomerController.fetchAutocomplete = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const keyword = req.query.keyword.toString();
    customer_model_1.default.fetch(keyword, 0, 5, fetch_interface_1.fetchMode.Autocomplete)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching customer data: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Update customer
 * @param req
 * @param res
 */
CustomerController.update = (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp == null
        ? null
        : req.body.npwp.toString().length == 15 ||
            req.body.npwp.toString().length == 16
            ? req.body.npwp
            : null;
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;
    customer_model_1.default.update({
        name: name,
        address: address,
        npwp: npwp,
        pic: pic,
        phone_number: phone_number,
        created_by: req.body.userID,
        id: id,
    })
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        yield app_1.meili.index("customer").updateDocuments([result]);
        const socket = new socket_helper_1.default("updateCustomer", result);
        socket.create();
        return res.status(201).send(result);
    }))
        .catch((error) => {
        console.error(`[error]: Error on update customer: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Delete customer
 * @param req
 * @param res
 */
CustomerController.deleteByID = (req, res) => {
    const id = parseInt(req.params.id.toString());
    const userID = req.body.userID;
    customer_model_1.default.fetchByID(id).then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (!result.can_delete) {
            return res.status(400).send(error_list_1.default["Delete error"]);
        }
        customer_model_1.default.delete(id, userID)
            .then((customer) => __awaiter(void 0, void 0, void 0, function* () {
            yield app_1.meili.index("customer").deleteDocument(customer.id);
            const socket = new socket_helper_1.default("deleteCustomer", customer);
            socket.create();
            return res.status(201).send(customer);
        }))
            .catch((error) => {
            console.error(`[error]: Error on delete customer: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    });
};
exports.default = CustomerController;
//# sourceMappingURL=customer.controller.js.map