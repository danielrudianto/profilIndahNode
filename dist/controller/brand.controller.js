"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const brand_model_1 = require("../model/brand.model");
const item_model_1 = require("../model/item.model");
class BrandController {
}
BrandController.fetchAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    brand_model_1.BrandModel.getAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
BrandController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    brand_model_1.BrandModel.fetchById(id)
        .then((result) => {
        return res.status(200).send(Object.assign(Object.assign({}, result[0]), { can_delete: result[1] == 0 ? true : false }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
BrandController.fetch = (req, res) => {
    var _a;
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const limit = parseInt((_a = process.env.LIMIT) === null || _a === void 0 ? void 0 : _a.toString());
    const offset = (page - 1) * limit;
    brand_model_1.BrandModel.get(keyword, offset, limit)
        .then((result) => {
        item_model_1.ItemModel.countByBrandIds(result[0].map((x) => {
            return x.id;
        }))
            .then((count) => {
            return res.status(200).send({
                data: result[0].map((item) => {
                    return Object.assign(Object.assign({}, item), { _count: undefined, can_delete: count.filter((x) => x.item_brand_id == item.id).length == 0
                            ? true
                            : count.filter((x) => x.item_brand_id == item.id)[0]
                                ._count == 0 });
                }),
                count: result[1],
            });
        })
            .catch((error) => {
            log_helper_1.default.log(new Date(), "error", error, "Brand - Fetch", req.body.userId);
        });
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Brand - Fetch", req.body.userId);
        return res.status(500).send(error);
    });
};
BrandController.create = (req, res) => {
    const name = req.body.name;
    brand_model_1.BrandModel.getByName(name).then((brand) => {
        if (brand != null) {
            return res.status(400).send("Mohon masukkan nama merek unik.");
        }
        else {
            const brand_object = new brand_model_1.BrandModel(name, req.body.userId);
            brand_object
                .create()
                .then((brand_result) => {
                log_helper_1.default.log(brand_result.created_at, "info", `${brand_result.user.name} created new brand with the name ${brand_result.name} (ID: ${brand_result.id})`, `Brand - Create`, req.body.userId);
                const socket = new socket_helper_1.default("createBrand", Object.assign(Object.assign({}, brand_result), { can_delete: true }));
                socket.create();
                return res.status(201).send(brand_result);
            })
                .catch((error) => {
                log_helper_1.default.log(new Date(), "error", `${error}`, `Brand - Create`, req.body.userId);
                return res.status(500).send(error);
            });
        }
    });
};
BrandController.update = (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    brand_model_1.BrandModel.fetchById(id)
        .then((brand_result) => {
        const brand = brand_result[0];
        if (brand == null || brand.is_delete) {
            return res.status(400).send("Data tidak ditemukan.");
        }
        const update_brand = new brand_model_1.BrandModel(name, brand.created_by, id);
        update_brand
            .update()
            .then((result) => {
            var _a;
            const socket = new socket_helper_1.default("updateBrand", result);
            socket.create();
            log_helper_1.default.log(result.updated_at, "info", `${(_a = result.user_item_brand_updated_byTouser) === null || _a === void 0 ? void 0 : _a.name} updated brand with the name ${result.name} (ID: ${result.id})`, `Brand - Create`, req.body.userId);
            return res.status(201).send(result);
        })
            .catch((error) => {
            log_helper_1.default.log(new Date(), "error", `${error}`, `Brand - Update`, req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
BrandController.delete = (req, res) => {
    const id = parseInt(req.params.id);
    brand_model_1.BrandModel.fetchById(id)
        .then((brand_result) => {
        const brand = brand_result[0];
        const count = brand_result[1];
        if (brand == null || count > 0) {
            return res.status(500).send("Merek tidak dapat dihapus.");
        }
        else {
            brand_model_1.BrandModel.delete(id, req.body.userId)
                .then((result) => {
                var _a;
                const socket = new socket_helper_1.default("deleteBrand", result);
                socket.create();
                log_helper_1.default.log(result.deleted_at, "info", `${(_a = result.user_item_brand_deleted_byTouser) === null || _a === void 0 ? void 0 : _a.name} deleted brand with the name ${result.name} (ID: ${result.id})`, `Brand - Delete`, req.body.userId);
                return res.status(201).send(result);
            })
                .catch((error) => {
                log_helper_1.default.log(new Date(), "error", `${error})`, `Brand - Delete`, req.body.userId);
                return res.status(500).send(error);
            });
        }
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", `${error})`, `Brand - Delete`, req.body.userId);
        return res.status(500).send(error);
    });
};
exports.default = BrandController;
