"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const company_model_1 = __importDefault(require("../model/company.model"));
const good_receipt_model_1 = __importDefault(require("../model/good_receipt.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
class CompanyController {
}
CompanyController.fetch = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    company_model_1.default.fetch(keyword, offset, limit)
        .then((result) => {
        good_receipt_model_1.default.countByCompanyIds(result[0].map((x) => {
            return x.id;
        }))
            .then((counts) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return Object.assign(Object.assign({}, x), { can_delete: counts.filter((count) => count.company_id == x.id).length ==
                            0
                            ? true
                            : counts.filter((count) => count.company_id == x.id)[0]
                                ._count == 0 });
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
CompanyController.getAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    company_model_1.default.fetchAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
CompanyController.delete = (req, res) => {
    const id = parseInt(req.params.id);
    company_model_1.default.fetchById(id)
        .then((company) => {
        if (company == null || company.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else if (company[0].is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            company_model_1.default.delete(id, req.body.userId)
                .then((company_result) => {
                const socket = new socket_helper_1.default("deleteCompany", {
                    name: company_result.name,
                    id: company_result.id,
                });
                socket.create();
                return res.status(201).send(company_result);
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
CompanyController.update = (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp == null || req.body.toString().length != 15
        ? null
        : req.body.npwp;
    const userID = req.body.userId;
    const company = new company_model_1.default(name, address, npwp, userID, id);
    company
        .update()
        .then((result) => {
        const socket = new socket_helper_1.default("updateCompany", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
CompanyController.create = (req, res) => {
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const company = new company_model_1.default(name, address, npwp, req.body.userId);
    company
        .create()
        .then((result) => {
        const socket = new socket_helper_1.default("createCompany", Object.assign(Object.assign({}, result), { can_delete: true }));
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
CompanyController.fetchById = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        company_model_1.default.fetchById(id)
            .then((result) => {
            if (result == null || result.length == 0) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            else {
                const company = result[0];
                return res.status(200).send({
                    id: company.id,
                    name: company.name,
                    address: company.address,
                    npwp: company.npwp,
                    is_delete: company.is_delete,
                    can_delete: company.count == 0,
                });
            }
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    catch (err) {
        if (err instanceof Error) {
            return res.status(500).send(err);
        }
        else {
            return res.status(500).send(error_list_1.default["Unknown error"]);
        }
    }
};
CompanyController.fetchAvailable = (req, res) => {
    company_model_1.default.fetchAvailable()
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = CompanyController;
