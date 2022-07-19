"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const brand_model_1 = require("../model/brand.model");
const item_model_1 = require("../model/item.model");
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const query_transaction_helper_1 = __importDefault(require("../helper/query.transaction.helper"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const item_price_model_1 = __importDefault(require("../model/item_price.model"));
const item_purchase_price_model_1 = __importDefault(require("../model/item_purchase_price.model"));
class ItemController {
}
ItemController.create = (req, res) => {
    const reference = req.body.reference;
    const description = req.body.description;
    const brand_name = req.body.brand;
    const minimum_stock = req.body.minimum_stock;
    const user_id = req.body.userId;
    brand_model_1.BrandModel.fetchByName(brand_name)
        .then((brand) => {
        if (brand == null || brand.is_delete) {
            return res.status(404).send("Merek tidak ditemukan.");
        }
        item_model_1.ItemModel.fetchByReference(reference)
            .then((itemCheck) => {
            // There is an item exist with the same reference
            if (itemCheck != null) {
                return res.status(400).send("Referensi tidak unik.");
            }
            const item = new item_model_1.ItemModel(reference, description, minimum_stock, brand.id, user_id);
            item
                .create()
                .then((result) => {
                log_helper_1.default.log(new Date(), "info", `${result.user.name} created new item with reference ${result.reference} (ID: ${result.id})`, `Item - Create`, req.body.userId);
                const item_price = new item_price_model_1.default(req.body.price, req.body.discount, req.body.discount_project, result.id, req.body.userId);
                const item_purchase_price = new item_purchase_price_model_1.default(req.body.purchase_price, result.id, req.body.userId);
                const transaction = new query_transaction_helper_1.default();
                transaction
                    .create([
                    item_price.create(),
                    item_purchase_price.create(),
                    item_model_1.ItemModel.count(),
                ])
                    .then((item_price) => {
                    const item_object = Object.assign(Object.assign({}, result), { item_price: [item_price[0]], item_price_purchase: [item_price[1]] });
                    log_helper_1.default.log(new Date(), "info", `${result.user.name} created item sales price for item with reference ${result.reference} (ID: ${result.id})`, `Item - Create`, req.body.userId);
                    log_helper_1.default.log(new Date(), "info", `${result.user.name} created item purchase price for item with reference ${result.reference} (ID: ${result.id})`, `Item - Create`, req.body.userId);
                    const itemSocket = new socket_helper_1.default("createItem", item_object);
                    itemSocket.create();
                    item_model_1.ItemModel.countByBrandId(brand.id)
                        .then((count_brand) => {
                        const itemSocket = new socket_helper_1.default("createItemBrand", {
                            brand_id: brand.id,
                            can_delete: count_brand == 0 ? true : false,
                        });
                        itemSocket.create();
                        return res.status(201).send(result);
                    })
                        .catch((error) => {
                        log_helper_1.default.log(new Date(), "error", error, `Item - Create`, req.body.userId);
                    });
                });
            })
                .catch((error) => {
                log_helper_1.default.log(new Date(), "error", `${error}`, `Item - Create`, req.body.userId);
                return res.status(500).send(error);
            });
        })
            .catch((error) => {
            log_helper_1.default.log(new Date(), "error", `${error}`, `Item - Create`, req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", `${error}`, `Item - Create`, req.body.userId);
        return res.status(500).send(error);
    });
};
ItemController.delete = (req, res) => {
    const reference = req.params.itemReference;
    item_model_1.ItemModel.fetchByReference(reference).then((item) => {
        if (item == null || item.is_delete) {
            return res.status(404).send("Barang tidak ditemukan.");
        }
        else {
            item_model_1.ItemModel.checkDeleteByReference(reference)
                .then((count) => {
                if (count[0] == 0 && count[1] == 0) {
                    item_model_1.ItemModel.delete(item.id, req.body.userId).then((delete_result) => {
                        const socket = new socket_helper_1.default("deleteItem", delete_result);
                        socket.create();
                        log_helper_1.default.log(new Date(), "info", `${delete_result.user.name} deleted item with reference ${delete_result.reference} (ID: ${delete_result.id})`, "Item controller - Delete", req.body.userId);
                        item_model_1.ItemModel.countByBrandId(delete_result.item_brand_id)
                            .then((count_brand) => {
                            const itemSocket = new socket_helper_1.default("deleteItemBrand", {
                                brand_id: delete_result.item_brand_id,
                                can_delete: count_brand == 0 ? true : false,
                            });
                            itemSocket.create();
                            return res.status(201).send(delete_result);
                        })
                            .catch((error) => {
                            log_helper_1.default.log(new Date(), "error", error, `Item - Create`, req.body.userId);
                        });
                    });
                }
                else {
                    return res
                        .status(400)
                        .send("Penghapusan data barang tidak diijinkan.");
                }
            })
                .catch((error) => {
                log_helper_1.default.log(new Date(), `Error`, `${error}`, `Item controller - Delete`, req.body.userId);
            });
        }
    });
};
ItemController.update = (req, res) => {
    const id = req.body.id;
    const reference = req.body.reference;
    const description = req.body.description;
    const brand_name = req.body.brand;
    const minimum_stock = req.body.minimum_stock;
    brand_model_1.BrandModel.fetchByName(brand_name)
        .then((brand) => {
        if (brand == null || brand.is_delete) {
            return res.status(400).send("Merek tidak ditemukan.");
        }
        else {
            item_model_1.ItemModel.fetchById(id, new Date())
                .then((item) => {
                if (item == null || item.is_delete) {
                    return res.status(404).send("Barang tidak ditemukan.");
                }
                else {
                    const item_model = new item_model_1.ItemModel(reference, description, minimum_stock, brand.id, req.body.userId, id);
                    item_model
                        .update()
                        .then((result) => {
                        var _a;
                        log_helper_1.default.log(new Date(), "info", `${(_a = result.user_item_updated_byTouser) === null || _a === void 0 ? void 0 : _a.name} updated item with reference ${result.reference} (ID: ${result.id})`, `Item - Update`, req.body.userId);
                        const socket = new socket_helper_1.default("updateItem", result);
                        socket.create();
                        return res.status(200).send(result);
                    })
                        .catch((error) => {
                        log_helper_1.default.log(new Date(), "error", `${error}`, `Item - Update`, req.body.userId);
                        return res.status(500).send(error);
                    });
                }
            })
                .catch((error) => {
                log_helper_1.default.log(new Date(), "error", `${error}`, `Item - Update`, req.body.userId);
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemController.fetch = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);
    item_model_1.ItemModel.fetch(keyword, date, offset, limit)
        .then((result) => {
        item_model_1.ItemModel.checkCountByIds(result[0].map((x) => x.id))
            .then((count) => {
            return res.status(200).send({
                data: result[0].map((item) => {
                    return Object.assign(Object.assign({}, item), { _count: undefined, can_delete: count[0] + count[1] ? false : true });
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
ItemController.fetchByReference = (req, res) => {
    const reference = req.params.reference;
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);
    item_model_1.ItemModel.fetchByReference(reference)
        .then((item) => {
        if (item == null) {
            return res.status(404).send("Barang tidak ditemukan.");
        }
        else {
            res.status(200).send(Object.assign(Object.assign({}, item), { _count: undefined, can_delete: ((item === null || item === void 0 ? void 0 : item._count.bill) || 0) > 0 ||
                    ((item === null || item === void 0 ? void 0 : item._count.good_receipt) || 0) > 0
                    ? false
                    : true }));
        }
    })
        .catch((error) => {
        res.status(500).send(error);
    });
};
ItemController.fetchInsufficient = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const blocked_brand = (req.query.blocked_brands == null || req.query.blocked_brands == "" || req.query.blocked_brands == undefined) ? [] : req.query.blocked_brands.toString().split(",");
    item_model_1.ItemModel.fetchInsufficient(keyword, blocked_brand, offset, limit).then(result => {
        item_model_1.ItemModel.fetchByIds(result[0].map(x => { return x.id; })).then(items => {
            return res.status(200).send({
                data: items,
                count: result[1][0].count
            });
        }).catch(error => {
            log_helper_1.default.log(new Date(), "error", error, "Item Controller - Fetch Insufficient", req.body.userId);
            return res.status(500).send(error);
        });
    }).catch(error => {
        log_helper_1.default.log(new Date(), "error", error, "Item Controller - Fetch Insufficient", req.body.userId);
        return res.status(500).send(error);
    });
};
exports.default = ItemController;
