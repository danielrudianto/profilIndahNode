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
const item_price_model_1 = __importDefault(require("../model/item_price.model"));
const item_purchase_price_model_1 = __importDefault(require("../model/item_purchase_price.model"));
const product_unit_model_1 = __importDefault(require("../model/product-unit.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const app_1 = require("../app");
const escape_helper_1 = require("../helper/escape.helper");
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
class ProductController {
}
_a = ProductController;
ProductController.create = (req, res) => {
    try {
        const reference = req.body.reference;
        const description = req.body.description;
        const brand_id = req.body.brand;
        const type_id = req.body.type;
        const minimum_stock = req.body.minimum_stock;
        const userID = req.body.userId;
        const unit = req.body.unit;
        const units = req.body.units;
        item_model_1.ItemModel.fetchByReference(reference)
            .then((itemCheck) => {
            // There is an item exist with the same reference
            if (itemCheck != null) {
                return res.status(400).send("Referensi tidak unik.");
            }
            const item = new item_model_1.ItemModel(reference, description, minimum_stock, brand_id, type_id, userID, unit);
            item
                .create()
                .then((result) => __awaiter(void 0, void 0, void 0, function* () {
                if (units.length == 0) {
                    const item_price = new item_price_model_1.default(req.body.price, req.body.discount, result.id, null, userID);
                    const item_purchase_price = new item_purchase_price_model_1.default(req.body.purchase_price, result.id, userID, null);
                    Promise.all([
                        item_price.create(),
                        item_purchase_price.create(),
                        item_model_1.ItemModel.count(),
                        app_1.meili.index("item").addDocuments([
                            {
                                id: result.id,
                                reference: result.reference,
                                description: result.description,
                            },
                        ], {
                            primaryKey: "id",
                        }),
                        product_stock_model_1.default.createStockData(result.id),
                    ])
                        .then((item_price) => {
                        const item_object = Object.assign(Object.assign({}, result), { item_price: item_price[0], item_price_purchase: item_price[1], item_units: [] });
                        const itemSocket = new socket_helper_1.default("createItem", item_object);
                        itemSocket.create();
                        return res.status(201).send(result);
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                }
                else {
                    const item_units = product_unit_model_1.default.createMany(units, result.id, userID);
                    const item_price = new item_price_model_1.default(req.body.price, req.body.discount, result.id, null, userID);
                    const item_purchase_price = new item_purchase_price_model_1.default(req.body.purchase_price, result.id, userID, null);
                    Promise.all([
                        item_price.create(),
                        item_purchase_price.create(),
                        item_model_1.ItemModel.count(),
                        item_units,
                        app_1.meili.index("item").addDocuments([
                            {
                                id: result.id,
                                reference: result.reference,
                                description: result.description,
                            },
                        ], {
                            primaryKey: "id",
                        }),
                        product_stock_model_1.default.createStockData(result.id),
                    ])
                        .then((item_price) => {
                        const item_object = Object.assign(Object.assign({}, result), { item_price: item_price[0], item_price_purchase: item_price[1], item_units: item_price[2] });
                        const itemSocket = new socket_helper_1.default("createItem", item_object);
                        itemSocket.create();
                        return res.status(201).send(result);
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                }
            }))
                .catch((error) => {
                console.log(error);
                return res.status(500).send(error);
            });
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
ProductController.delete = (req, res) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    item_model_1.ItemModel.fetchById(id)
        .then((item) => {
        if (item == null || item.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else if (item[0].can_delete == 0) {
            return res.status(404).send(error_list_1.default["Delete error"]);
        }
        else {
            Promise.all([
                item_model_1.ItemModel.delete(id, userID),
                app_1.meili.index("item").deleteDocument(id),
            ])
                .then((result) => {
                const socket = new socket_helper_1.default("deleteItem", result[0]);
                socket.create();
                return res.status(201).send(result[0]);
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
ProductController.update = (req, res) => {
    const id = req.body.id;
    const reference = req.body.reference;
    const description = req.body.description;
    const brand = parseInt(req.body.brand.toString());
    const type = parseInt(req.body.type.toString());
    const minimum_stock = req.body.minimum_stock;
    const unit = req.body.unit;
    const userID = req.body.userId;
    item_model_1.ItemModel.fetchById(id).then((result) => {
        if (!result || result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else if (result[0].is_delete == 1) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            Promise.all([
                item_model_1.ItemModel.update(id, reference, description, brand, type, userID, minimum_stock, unit),
                app_1.meili.index("item").updateDocuments([
                    {
                        id: id,
                        reference: reference,
                        description: description,
                    },
                ]),
            ]).then((item) => {
                const socket = new socket_helper_1.default("updateItem", item[0]);
                socket.create();
                return res.status(201).send(item);
            });
        }
    });
};
ProductController.fetch = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent((0, escape_helper_1.mysql_real_escape_string)(req.query.keyword.toString()));
    const mode = req.query.mode;
    switch (mode) {
        case "purchase":
            item_model_1.ItemModel.fetch(keyword, offset, limit, true, false)
                .then((result) => {
                return res.status(200).send({
                    data: result[1].map((x) => {
                        const priceIndex = result[0].findIndex((item) => item.item_id == x.id && item.item_unit_id == null);
                        return {
                            id: x.id,
                            reference: x.reference,
                            description: x.description,
                            unit: x.unit,
                            price: priceIndex == -1
                                ? 0
                                : result[0][priceIndex].price,
                            unit_price: result[0]
                                .filter((item) => item.item_id == x.id && item.item_unit_id != null)
                                .map((unit) => {
                                return {
                                    id: unit.id,
                                    unit: unit.unit,
                                    conversion: unit.conversion,
                                    price: unit.price,
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
        case "sales":
            item_model_1.ItemModel.fetch(keyword, offset, limit, false, true)
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
            item_model_1.ItemModel.fetch(keyword, offset, limit, false, false)
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
            item_model_1.ItemModel.fetch(keyword, offset, limit, false, false)
                .then((result) => {
                item_model_1.ItemModel.countRelations(result[1].map((x) => {
                    return x.id;
                }))
                    .then((count) => {
                    return res.status(200).send({
                        data: result[1].map((x) => {
                            const relations = count[0] == 0 && count[1] == 0 && count[2] == 0;
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
                                can_delete: relations,
                            };
                        }),
                        count: result[2],
                    });
                })
                    .catch((_) => {
                    return res.status(200).send({
                        data: result[0].map((x) => {
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
                                can_delete: false,
                            };
                        }),
                        count: result[1],
                    });
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
            break;
    }
};
ProductController.fetchAutocomplete = (req, res) => {
    const keyword = req.query.keyword == null
        ? ""
        : (0, escape_helper_1.mysql_real_escape_string)(req.query.keyword.toString());
    item_model_1.ItemModel.fetchAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ProductController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    item_model_1.ItemModel.fetchById(id)
        .then((result) => {
        if (!result || result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else if (result[0].is_delete == 1) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            var item = result[0];
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
                can_delete: item.can_delete == 1,
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ProductController.active = (req, res) => {
    const id = req.body.id;
    item_model_1.ItemModel.fetchById(id).then((item) => {
        if (item == null || item.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else if (item[0].is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            const currentStatus = item[0].is_active == 1;
            item_model_1.ItemModel.active(id, !currentStatus)
                .then((result) => {
                const socket = new socket_helper_1.default("updateItemActive", result);
                socket.create();
                return res.status(200).send(result);
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    });
};
ProductController.fetchSmartSearchStock = (req, res) => {
    const keyword = req.query.keyword == null
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    const page = req.query.page == null ? 1 : parseInt(req.query.page.toString());
    const offset = (page - 1) * 20;
    app_1.meili
        .index("item")
        .search(keyword, {
        limit: 20,
        offset: offset,
    })
        .then((result) => {
        if (result.hits.length == 0) {
            return res.status(200).send({
                data: [],
                count: 0,
            });
        }
        else {
            product_stock_model_1.default.fetchByIDs(result.hits.map((x) => {
                return x.id;
            })).then((items) => {
                return res.status(200).send({
                    data: items,
                    count: result.estimatedTotalHits,
                });
            });
        }
    });
};
ProductController.search = (req, res) => {
    const keyword = req.body.keyword;
    const page = req.body.page;
    const offset = (page - 1) * 20;
    const brands = req.body.brands;
    if (brands.length == 0) {
        // Fetch all products
        app_1.meili
            .index("item")
            .search(keyword, {
            limit: 20,
            offset: offset,
        })
            .then((result) => {
            if (result.hits.length == 0) {
                return res.status(200).send({
                    data: [],
                    count: 0,
                });
            }
            else {
                item_model_1.ItemModel.fetchCompleteByIDs(result.hits.map((x) => {
                    return x.id;
                })).then((items) => {
                    return res.status(200).send({
                        data: items.map((x) => {
                            var _b, _c;
                            const priceIndex = x.item_price.findIndex((y) => {
                                y.item_unit == null;
                            });
                            return {
                                id: x.id,
                                reference: x.reference,
                                description: x.description,
                                item_type: {
                                    name: (_b = x.item_type) === null || _b === void 0 ? void 0 : _b.name,
                                },
                                item_brand: {
                                    name: (_c = x.item_brand) === null || _c === void 0 ? void 0 : _c.name,
                                },
                                stock: x.stock,
                                price: priceIndex == -1 ? 0 : x.item_price[priceIndex].price,
                                discount: 0,
                                unit: x.unit,
                                unit_price: x.item_price
                                    .filter((z) => z.item_unit != null)
                                    .map((a) => {
                                    var _b, _c, _d;
                                    return {
                                        id: (_b = a.item_unit) === null || _b === void 0 ? void 0 : _b.id,
                                        unit: (_c = a.item_unit) === null || _c === void 0 ? void 0 : _c.unit,
                                        conversion: (_d = a.item_unit) === null || _d === void 0 ? void 0 : _d.conversion,
                                        price: a.price,
                                    };
                                }),
                            };
                        }),
                        count: result.estimatedTotalHits,
                    });
                });
            }
        });
    }
    else {
        app_1.meili
            .index("item")
            .search(keyword, {
            filter: `brand in [${brands
                .map((x) => {
                return x;
            })
                .join(",")}]`,
            limit: 20,
            offset: offset,
        })
            .then((result) => {
            if (result.hits.length == 0) {
                return res.status(200).send({
                    data: [],
                    count: 0,
                });
            }
            else {
                item_model_1.ItemModel.fetchCompleteByIDs(result.hits.map((x) => {
                    return x.id;
                })).then((items) => {
                    return res.status(200).send({
                        data: items.map((x) => {
                            var _b, _c;
                            const priceIndex = x.item_price.findIndex((y) => {
                                y.item_unit == null;
                            });
                            return {
                                id: x.id,
                                reference: x.reference,
                                description: x.description,
                                item_type: {
                                    name: (_b = x.item_type) === null || _b === void 0 ? void 0 : _b.name,
                                },
                                item_brand: {
                                    name: (_c = x.item_brand) === null || _c === void 0 ? void 0 : _c.name,
                                },
                                stock: x.stock,
                                price: priceIndex == -1 ? 0 : x.item_price[priceIndex].price,
                                discount: 0,
                                unit: x.unit,
                                unit_price: x.item_price
                                    .filter((z) => z.item_unit != null)
                                    .map((a) => {
                                    var _b, _c, _d;
                                    return {
                                        id: (_b = a.item_unit) === null || _b === void 0 ? void 0 : _b.id,
                                        unit: (_c = a.item_unit) === null || _c === void 0 ? void 0 : _c.unit,
                                        conversion: (_d = a.item_unit) === null || _d === void 0 ? void 0 : _d.conversion,
                                        price: a.price,
                                    };
                                }),
                            };
                        }),
                        count: result.estimatedTotalHits,
                    });
                });
            }
        });
    }
};
exports.default = ProductController;
