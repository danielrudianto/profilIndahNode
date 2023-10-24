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
const item_model_1 = require("../model/item.model");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const app_1 = require("../app");
const escape_helper_1 = require("../helper/escape.helper");
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
const queue_helper_1 = require("../helper/queue.helper");
class ProductController {
}
_a = ProductController;
/**
 * Create new item
 * @param req
 * @param res
 * @returns {Promise<Response<any, Record<string, any>, number>>}
 */
ProductController.create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const reference = req.body.reference;
    const description = req.body.description;
    const brand_id = req.body.brand;
    const type_id = req.body.type;
    const minimum_stock = req.body.minimum_stock;
    const userID = req.body.userId;
    const unit = req.body.unit;
    const price = req.body.price;
    const discount = req.body.discount;
    const purchase_price = req.body.purchase_price;
    const purchase_discount = req.body.purchase_discount;
    const units = req.body.units;
    const existingItem = yield item_model_1.ItemModel.fetchByReference(reference);
    if (existingItem) {
        return res.status(400).send(error_list_1.default["Reference unique constraint"]);
    }
    item_model_1.ItemModel.create({
        reference: reference,
        description: description,
        minimum_stock: minimum_stock,
        brand_id: brand_id,
        type_id: type_id,
        created_by: userID,
        price: price,
        discount: discount,
        purchase_price: purchase_price,
        purchase_discount: purchase_discount,
        unit: unit,
    })
        .then((item) => __awaiter(void 0, void 0, void 0, function* () {
        const itemID = item.id;
        const unitResult = yield item_model_1.ItemModel.createUnits(itemID, userID, units);
        yield queue_helper_1.queue.add("insert-product", {
            reference: item.reference,
            description: item.description,
            id: item.id,
            itemTypeID: item.item_type_id,
            itemBrandID: item.item_brand_id,
            unit: item.unit,
        });
        yield product_stock_model_1.default.createStockData(item.id);
        const response = Object.assign(Object.assign({}, item), { item_price: item.item_price[0], item_price_purchase: item.item_price_purchase[0], units: unitResult });
        const itemSocket = new socket_helper_1.default("createItem", response);
        itemSocket.create();
        return res.status(201).send(response);
    }))
        .catch((error) => {
        console.error(`[error]: Error on creating item ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
/**
 * Fetch items with pagination
 * @param req
 * @param res
 * @returns {Promise<Response<any, Record<string, any>, number>>}
 */
ProductController.fetch = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
        ? ""
        : (0, escape_helper_1.mysql_real_escape_string)(decodeURIComponent(req.query.keyword.toString()));
    const mode = req.query.mode;
    switch (mode) {
        case "purchase":
            item_model_1.ItemModel.fetch(keyword, offset, limit, 1)
                .then((result) => {
                return res.status(200).send({
                    data: result[0].map((x) => {
                        return {
                            id: x.id,
                            reference: x.reference,
                            description: x.description,
                            unit: x.unit,
                            price: x.item_price_purchase == null ||
                                x.item_price_purchase.length == 0
                                ? 0
                                : x.item_price_purchase[0].price,
                            discount: x.item_price_purchase == null ||
                                x.item_price_purchase.length == 0
                                ? 0
                                : x.item_price_purchase[0].discount,
                            unit_price: x.item_unit.map((y) => {
                                return {
                                    id: y.id,
                                    unit: y.unit,
                                    conversion: y.conversion,
                                    price: y.item_price_purchase == null ||
                                        y.item_price_purchase.length == 0
                                        ? 0
                                        : y.item_price_purchase[0].price,
                                    discount: y.item_price_purchase == null ||
                                        y.item_price_purchase.length == 0
                                        ? 0
                                        : y.item_price_purchase[0].discount,
                                    item_unit_id: y.id,
                                };
                            }),
                        };
                    }),
                    count: result[1],
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
            break;
        case "sales":
            item_model_1.ItemModel.fetch(keyword, offset, limit, 2)
                .then((result) => {
                return res.status(200).send({
                    data: result[1].map((x) => {
                        const priceIndex = result[0].findIndex((item) => item.item_id == x.id && item.item_unit_id == null);
                        return {
                            id: x.id,
                            reference: x.reference,
                            description: x.description,
                            unit: x.unit,
                            stock: x.stock,
                            price: priceIndex == -1
                                ? 0
                                : result[0][priceIndex].price,
                            discount: priceIndex == -1
                                ? 0
                                : result[0][priceIndex].discount,
                            unit_price: result[0]
                                .filter((item) => item.item_id == x.id && item.item_unit_id != null)
                                .map((unit) => {
                                return {
                                    id: unit.id,
                                    unit: unit.unit,
                                    conversion: unit.conversion,
                                    price: unit.price,
                                    discount: unit.discount,
                                    item_unit_id: unit.item_unit_id,
                                };
                            }),
                        };
                    }),
                    count: result[2],
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
            break;
        case "plain":
            item_model_1.ItemModel.fetch(keyword, offset, limit, 3)
                .then((result) => {
                return res.status(200).send({
                    data: result[1].map((x) => {
                        return {
                            id: x.id,
                            reference: x.reference,
                            description: x.description,
                            minimum_stock: x.minimum_stock,
                            unit: x.unit,
                            item_type_id: x.item_type_id,
                            item_brand_id: x.item_brand_id,
                            item_type: {
                                name: x.item_type_name,
                            },
                            item_brand: {
                                name: x.item_brand_name,
                            },
                            is_active: x.is_active == 1 ? true : false,
                            unit_price: result[0]
                                .filter((item) => item.item_id == x.id)
                                .map((unit) => {
                                return {
                                    id: unit.id,
                                    unit: unit.unit,
                                    conversion: unit.conversion,
                                    item_unit_id: unit.id,
                                };
                            }),
                        };
                    }),
                    count: result[2],
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
            break;
        case "return":
            item_model_1.ItemModel.fetch(keyword, offset, limit, 4)
                .then((result) => {
                return res.status(200).send({
                    data: result[1].map((x) => {
                        return {
                            id: x.id,
                            reference: x.reference,
                            description: x.description,
                            minimum_stock: x.minimum_stock,
                            unit: x.unit,
                            item_type_id: x.item_type_id,
                            item_brand_id: x.item_brand_id,
                            item_type: {
                                name: x.item_type_name,
                            },
                            item_brand: {
                                name: x.item_brand_name,
                            },
                            is_active: x.is_active == 1 ? true : false,
                            unit_price: result[0]
                                .filter((item) => item.item_id == x.id)
                                .map((unit) => {
                                return {
                                    id: unit.id,
                                    unit: unit.unit,
                                    conversion: unit.conversion,
                                    item_unit_id: unit.id,
                                };
                            }),
                        };
                    }),
                    count: result[2],
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
            break;
        default:
            app_1.meili
                .index("item")
                .search(keyword, {
                limit: limit,
                offset: offset,
            })
                .then((result) => {
                item_model_1.ItemModel.fetchByIDs(result.hits.map((x) => x.id)).then((items) => {
                    return res.status(200).send({
                        data: items.map((x) => {
                            return Object.assign(Object.assign({}, x), { can_delete: x.can_delete == "1" ? true : false });
                        }),
                        count: result.estimatedTotalHits,
                    });
                });
            });
            break;
    }
};
/**
 * Fetch autocomplete items
 * @param req
 * @param res
 * @returns {Promise<Response>}
 */
ProductController.fetchAutocomplete = (req, res) => {
    const keyword = req.query.keyword == null
        ? ""
        : (0, escape_helper_1.mysql_real_escape_string)(req.query.keyword.toString());
    item_model_1.ItemModel.fetchAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetch autocomplete item ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch item by ID
 * @param req
 * @param res
 */
ProductController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    item_model_1.ItemModel.fetchByID(id)
        .then((result) => {
        if (result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const item = result[0];
        return res.status(200).send({
            id: item.id,
            reference: item.reference,
            description: item.description,
            unit: item.unit,
            minimum_stock: item.minimum_stock,
            item_brand_id: item.item_brand_id,
            item_type_id: item.item_type_id,
            item_type: {
                name: item.item_type_name,
            },
            item_brand: {
                name: item.item_brand_name,
            },
            can_delete: item.can_delete == "1",
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching item by id ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch item by ID with price
 * @param req
 * @param res
 */
ProductController.fetchCompleteById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    item_model_1.ItemModel.fetchByIDWithPrice(id)
        .then((item) => {
        if (!item) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const priceIdx = item.item_price.findIndex((x) => {
            x.item_unit == null;
        });
        const purchasePriceIdx = item.item_price_purchase.findIndex((x) => {
            x.item_unit == null;
        });
        const price = priceIdx == -1
            ? 0
            : parseFloat(item.item_price[priceIdx].price.toString());
        const discount = priceIdx == -1
            ? 0
            : parseFloat(item.item_price[priceIdx].discount.toString());
        const purchasePrice = purchasePriceIdx == -1
            ? 0
            : parseFloat(item.item_price_purchase[purchasePriceIdx].price.toString());
        return res.status(200).send({
            reference: item.reference,
            description: item.description,
            unit: item.unit,
            item_brand: item.item_brand.name,
            item_type: item.item_type.name,
            price: price,
            discount: discount,
            purchase_price: purchasePrice,
            units: item.item_unit.map((x) => {
                const priceIndex = item.item_price.findIndex((y) => y.item_unit != null && y.item_unit.id == x.id);
                const purchasePriceIndex = item.item_price_purchase.findIndex((y) => y.item_unit != null && y.item_unit.id == x.id);
                return {
                    id: x.id,
                    unit: x.unit,
                    conversion: parseFloat(x.conversion.toString()),
                    price: priceIndex == -1
                        ? 0
                        : parseFloat(item.item_price[priceIndex].price.toString()),
                    discount: priceIndex == -1
                        ? 0
                        : parseFloat(item.item_price[priceIndex].discount.toString()),
                    price_purchase: purchasePriceIndex == -1
                        ? 0
                        : parseFloat(item.item_price_purchase[purchasePriceIndex].price.toString()),
                };
            }),
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching item By ID with price ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Update product data by ID
 * @param req
 * @param res
 */
ProductController.updateByID = (req, res) => {
    const id = req.body.id;
    const reference = req.body.reference;
    const description = req.body.description;
    const brand = parseInt(req.body.brand.toString());
    const type = parseInt(req.body.type.toString());
    const minimum_stock = req.body.minimum_stock;
    const unit = req.body.unit;
    const userID = req.body.userId;
    item_model_1.ItemModel.fetchByID(id).then((result) => {
        if (result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result[0].is_delete == 1) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        Promise.all([
            item_model_1.ItemModel.update({
                id: id,
                reference: reference,
                description: description,
                brand_id: brand,
                type_id: type,
                updated_by: userID,
                minimum_stock: minimum_stock,
                unit: unit,
            }),
            app_1.meili.index("item").updateDocuments([
                {
                    id: id,
                    reference: reference,
                    description: description,
                },
            ]),
            queue_helper_1.queue.add("updateItem", {
                id: id,
                reference: reference,
                description: description,
                unit: unit,
                item_type_id: type,
                item_brand_id: brand,
            }),
        ])
            .then(([updateItemResult, _, __]) => {
            const socket = new socket_helper_1.default("updateItem", updateItemResult);
            socket.create();
            return res.status(201).send(updateItemResult);
        })
            .catch((error) => {
            console.error(`[error]: Error on updating item ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    });
};
/**
 * Delete item by ID
 * @param req
 * @param res
 */
ProductController.deleteByID = (req, res) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    item_model_1.ItemModel.fetchByID(id)
        .then((item) => {
        if (item.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (item[0].can_delete == "0") {
            return res.status(404).send(error_list_1.default["Delete error"]);
        }
        Promise.all([
            item_model_1.ItemModel.delete(id, userID),
            app_1.meili.index("item").deleteDocument(id),
        ])
            .then(([deleteItemResult, _]) => {
            const socket = new socket_helper_1.default("deleteItem", deleteItemResult);
            socket.create();
            return res.status(201).send(deleteItemResult);
        })
            .catch((error) => {
            console.error(`[error]: Error on deleting item ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fething item by id [${id}] ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Activate or deactivate item
 * @param req
 * @param res
 */
ProductController.activateByID = (req, res) => {
    const id = req.body.id;
    item_model_1.ItemModel.fetchByID(id).then((item) => {
        if (!item) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (item.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (item[0].is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const currentStatus = item[0].is_active == 1;
        item_model_1.ItemModel.activateByID(id, !currentStatus)
            .then((result) => __awaiter(void 0, void 0, void 0, function* () {
            yield app_1.meili.index("item").updateDocuments([
                {
                    id: id,
                    is_active: currentStatus ? 0 : 1,
                },
            ]);
            const socket = new socket_helper_1.default("updateItemActive", result);
            socket.create();
            return res.status(200).send(result);
        }))
            .catch((error) => {
            console.error(`[error]: Error on activating item ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    });
};
exports.default = ProductController;
//# sourceMappingURL=product.controller.js.map