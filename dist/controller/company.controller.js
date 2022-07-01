"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const query_transaction_helper_1 = __importDefault(require("../helper/query.transaction.helper"));
const app_1 = require("../app");
const company_model_1 = __importDefault(require("../model/company.model"));
const good_receipt_model_1 = __importDefault(require("../model/good_receipt.model"));
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
            log_helper_1.default.log(new Date(), "error", error, "Company - Fetch", req.body.userId);
        });
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Company - Fetch", req.body.userId);
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
    const id = parseInt(req.params.companyId);
    company_model_1.default.fetchById(id)
        .then((company) => {
        if (company == null || (company === null || company === void 0 ? void 0 : company.is_delete)) {
            return res
                .status(404)
                .send("Perusahaan tidak ditemukan atau sudah dihapus.");
        }
        company_model_1.default.delete(id, req.body.userId)
            .then((company_result) => {
            var _a;
            (_a = company_model_1.default.count()) === null || _a === void 0 ? void 0 : _a.then((company_count) => {
                var _a;
                log_helper_1.default.log(new Date(), "info", `${(_a = company_result.user_company_deleted_byTouser) === null || _a === void 0 ? void 0 : _a.name} deleted company with the name ${company_result.name} (ID: ${company_result.id})`, "Company - Delete", req.body.userId);
                app_1.io.emit("deleteCompany", {
                    name: company_result.name,
                    id: company_result.id,
                    count: company_count,
                });
                return res.status(201).send(company_result);
            });
        })
            .catch((error) => {
            log_helper_1.default.log(new Date(), "error", `${error}`, `Item - Delete`, req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", `${error}`, `Item - Delete`, req.body.userId);
        return res.status(500).send(error);
    });
};
CompanyController.update = (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    const code_name = req.body.code_name;
    const address = req.body.address;
    const npwp = req.body.npwp == null || req.body.toString().length != 15
        ? null
        : req.body.npwp;
    company_model_1.default.getByCodeName(code_name)
        .then((result) => {
        // There is another company
        // Using this code name
        if (result.filter((x) => x.id != id).length > 0) {
            return res
                .status(500)
                .send("Kode perusahaan sudah terdaftar, mohon pastikan kode perusahaan unik.");
        }
        const company = new company_model_1.default(name, address, npwp, req.body.userId, code_name, id);
        company
            .update()
            .then((company_result) => {
            var _a;
            log_helper_1.default.log(new Date(), "info", `${(_a = company_result.user_company_updated_byTouser) === null || _a === void 0 ? void 0 : _a.name} updated company with the name ${company_result.name} (ID: ${company_result}`, "Company - Update", req.body.userId);
            app_1.io.emit("updateCompany", company_result);
            return res.status(201).send(company_result);
        })
            .catch((error) => {
            log_helper_1.default.log(new Date(), "error", error, "Company - Update", req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Company - Update", req.body.userId);
        return res.status(500).send(error);
    });
};
CompanyController.create = (req, res) => {
    const code_name = req.body.code_name;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const company = new company_model_1.default(name, address, npwp, req.body.userId, code_name);
    company
        .create()
        .then((result) => {
        log_helper_1.default.log(new Date(), "info", `${result.user.name} created company with the name ${result.name} (ID: ${result.id})`, "Company - Create", req.body.userId);
        app_1.io.emit("createCompany", Object.assign(Object.assign({}, result), { can_delete: true }));
        return res.status(201).send(result);
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Company - Create", req.body.userId);
        return res.status(500).send(error);
    });
};
CompanyController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    const transaction = new query_transaction_helper_1.default();
    transaction
        .create([company_model_1.default.fetchById(id), company_model_1.default.checkDeleteById(id)])
        .then((result) => {
        return res.status(200).send(Object.assign(Object.assign({}, result[0]), { can_delete: result[1] == 0 ? true : false }));
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Company - Fetch by ID", req.body.userId);
        return res.status(500).send(error);
    });
};
exports.default = CompanyController;
