"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const company_model_1 = __importDefault(require("../model/company.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const fetch_interface_1 = require("../interface/fetch.interface");
class CompanyController {
}
/**
 * Create new company
 * Company is a master data to determine which
 * company that user is working on
 * since Profil Indah has 2 separate company
 * @param req
 * @param res
 */
CompanyController.create = (req, res) => {
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp == null
        ? null
        : req.body.npwp.toString().length == 15 ||
            req.body.npwp.toString() == 16
            ? req.body.npwp
            : null;
    const userID = req.body.userID;
    company_model_1.default.create({
        name: name,
        address: address,
        npwp: npwp,
        created_by: userID,
    })
        .then((result) => {
        const socket = new socket_helper_1.default("createCompany", Object.assign(Object.assign({}, result), { can_delete: true }));
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on creating company: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch companies
 * Fetch companies with keyword, page, and limit
 * @param req
 * @param res
 */
CompanyController.fetch = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    company_model_1.default.fetch(keyword, limit, offset, fetch_interface_1.fetchMode.Pagination)
        .then((result) => {
        return res.status(200).send({
            data: result[0].map((x) => {
                return Object.assign(Object.assign({}, x), { can_delete: x.can_delete == "1" ? true : false });
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching company: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch company by id
 *  - If company is not found, return 404
 *  - If company is found, return 200
 * @param req
 * @param res
 * @returns
 */
CompanyController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    company_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const company = result[0];
        return res.status(200).send({
            id: company.id,
            name: company.name,
            address: company.address,
            npwp: company.npwp,
            is_delete: company.is_delete,
            can_delete: company.can_delete == "1" ? true : false,
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching company ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch companies for autocomplete
 * Fetch companies with keyword, page, and limit
 * @param req
 * @param res
 */
CompanyController.fetchAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    company_model_1.default.fetch(keyword, 5, 0, fetch_interface_1.fetchMode.Autocomplete)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching company: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Update company data
 * @param req
 * @param res
 */
CompanyController.update = (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp == null || req.body.npwp.toString().length != 15
        ? null
        : req.body.npwp;
    const userID = req.body.userID;
    company_model_1.default.updateByID({
        id: id,
        name: name,
        address: address,
        npwp: npwp,
        created_by: userID,
    })
        .then((result) => {
        const socket = new socket_helper_1.default("updateCompany", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on updating company: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Delete company
 * Delete company by id
 * @param req
 * @param res
 */
CompanyController.delete = (req, res) => {
    const id = parseInt(req.params.id);
    company_model_1.default.fetchByID(id)
        .then((company) => {
        if (company == null || company.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (company[0].is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (!company[0].can_delete) {
            return res.status(404).send(error_list_1.default["Unable to delete"]);
        }
        company_model_1.default.deleteByID(id, req.body.userID)
            .then((result) => {
            const socket = new socket_helper_1.default("deleteCompany", {
                name: result.name,
                id: result.id,
            });
            socket.create();
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on delete company: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on delete company: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
exports.default = CompanyController;
//# sourceMappingURL=company.controller.js.map