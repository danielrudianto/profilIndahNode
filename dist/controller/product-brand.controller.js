"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const brand_model_1 = require("../model/brand.model");
class BrandController {
}
/**
 * Create a new brand
 * @param req
 * @param res
 */
BrandController.create = (req, res) => {
    const name = req.body.name;
    const userID = req.body.userId;
    brand_model_1.BrandModel.fetchByName(name)
        .then((brand) => {
        if (brand) {
            return res.status(400).send(error_list_1.default["Brand unique constraint"]);
        }
        brand_model_1.BrandModel.create({
            name: name,
            created_by: userID,
        })
            .then((result) => {
            const socket = new socket_helper_1.default("createBrand", Object.assign(Object.assign({}, result), { can_delete: true }));
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
/**
 * Fetch brand data for autocomplete
 * @param req
 * @param res
 */
BrandController.fetchAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    brand_model_1.BrandModel.fetchAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Fetch brand by id
 * @param req
 * @param res
 */
BrandController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    brand_model_1.BrandModel.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const itemBrand = result[0];
        return res.status(200).send(Object.assign(Object.assign({}, itemBrand), { can_delete: itemBrand.can_delete == "1" ? true : false }));
    })
        .catch((error) => {
        console.error(`[error]: Error while fetching brand by id [${id}] ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch brand data
 * @param req
 * @param res
 */
BrandController.fetch = (req, res) => {
    var _a;
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent((0, escape_helper_1.mysql_real_escape_string)(req.query.keyword.toString()));
    const limit = parseInt((_a = process.env.LIMIT) === null || _a === void 0 ? void 0 : _a.toString());
    const offset = (page - 1) * limit;
    brand_model_1.BrandModel.fetch(keyword, offset, limit)
        .then((result) => {
        return res.status(200).send({
            data: result[0].map((x) => {
                return {
                    id: x.id,
                    name: x.name,
                    created_at: x.created_at,
                    created_by: x.created_by,
                    user: {
                        name: x.created_by_name,
                    },
                    is_delete: x.is_delete,
                    can_delete: x.count == 0 ? true : false,
                };
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Update brand data
 * @param req
 * @param res
 */
BrandController.updateByID = (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    const userID = req.body.userId;
    brand_model_1.BrandModel.fetchByID(id)
        .then((brand_result) => {
        const brand = brand_result[0];
        if (brand == null || brand.is_delete) {
            return res.status(400).send("Data tidak ditemukan.");
        }
        brand_model_1.BrandModel.updateByID({
            id: id,
            name: name,
            created_by: userID,
        })
            .then((result) => {
            const socket = new socket_helper_1.default("updateBrand", result);
            socket.create();
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on updating brand ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on updating brand ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Delete brand data
 * @param req
 * @param res
 */
BrandController.deleteByID = (req, res) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    brand_model_1.BrandModel.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result[0].is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (!result[0].can_delete) {
            return res.status(400).send(error_list_1.default["Unable to delete"]);
        }
        brand_model_1.BrandModel.deleteByID(id, userID)
            .then((result) => {
            const socket = new socket_helper_1.default("deleteBrand", result);
            socket.create();
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on deleting brand ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on deleting brand ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
exports.default = BrandController;
//# sourceMappingURL=product-brand.controller.js.map