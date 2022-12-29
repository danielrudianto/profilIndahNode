import { ItemModel } from "../model/item.model";
import LogHelper from "../helper/log.helper";
import SocketHelper from "../helper/socket.helper";
import ItemPriceModel from "../model/item_price.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import { validationResult } from "express-validator";
import StockCardHelper from "../helper/stock_card.helper";
import ItemUnitModel from "../model/item_unit.model";
import UserModel from "../model/user.model";
class ItemController {
}
ItemController.create = (req, res) => {
    const reference = req.body.reference;
    const description = req.body.description;
    const brand_id = req.body.brand;
    const type_id = req.body.type;
    const minimum_stock = req.body.minimum_stock;
    const user_id = req.body.userId;
    const unit = req.body.unit;
    const units = req.body.units;
    ItemModel.fetchByReference(reference)
        .then((itemCheck) => {
        // There is an item exist with the same reference
        if (itemCheck != null) {
            return res.status(400).send("Referensi tidak unik.");
        }
        const item = new ItemModel(reference, description, minimum_stock, brand_id, type_id, user_id, unit);
        item
            .create()
            .then((result) => {
            LogHelper.log(new Date(), "info", `${result.user.name} created new item with reference ${result.reference} (ID: ${result.id})`, `Item - Create`, req.body.userId);
            const item_units = ItemUnitModel.createMany(units, result.id, req.body.userId);
            const item_price = new ItemPriceModel(req.body.price, req.body.discount, result.id, null, req.body.userId);
            const item_purchase_price = new ItemPurchasePriceModel(req.body.purchase_price, result.id, req.body.userId, null);
            Promise.all([
                item_price.create(),
                item_purchase_price.create(),
                ItemModel.count(),
                item_units,
            ])
                .then((item_price) => {
                const item_object = Object.assign(Object.assign({}, result), { item_price: item_price[0], item_price_purchase: item_price[1], item_units: item_price[2] });
                LogHelper.log(new Date(), "info", `${result.user.name} created item unit for item with reference ${result.reference} (ID: ${result.id})`, `Item - Create`, req.body.userId);
                LogHelper.log(new Date(), "info", `${result.user.name} created item sales price for item with reference ${result.reference} (ID: ${result.id})`, `Item - Create`, req.body.userId);
                LogHelper.log(new Date(), "info", `${result.user.name} created item purchase price for item with reference ${result.reference} (ID: ${result.id})`, `Item - Create`, req.body.userId);
                const itemSocket = new SocketHelper("createItem", item_object);
                itemSocket.create();
                ItemModel.countByBrandId(brand_id)
                    .then((count_brand) => {
                    const itemSocket = new SocketHelper("createItemBrand", {
                        brand_id: brand_id,
                        can_delete: count_brand == 0 ? true : false,
                    });
                    itemSocket.create();
                    return res.status(201).send(result);
                })
                    .catch((error) => {
                    LogHelper.log(new Date(), "error", error, `Item - Create`, req.body.userId);
                });
            })
                .catch((error) => {
                console.log(error);
                LogHelper.log(new Date(), "error", error, "Item Controller - Create", req.body.userId);
                return res.status(500).send(error);
            });
        })
            .catch((error) => {
            console.log(error);
            LogHelper.log(new Date(), "error", `${error}`, `Item - Create`, req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", `${error}`, `Item - Create`, req.body.userId);
        return res.status(500).send(error);
    });
};
ItemController.delete = (req, res) => {
    const reference = decodeURIComponent(req.params.itemReference);
    ItemModel.fetchByReference(reference).then((item) => {
        if (item == null || item.is_delete) {
            return res.status(404).send("Barang tidak ditemukan.");
        }
        else {
            ItemModel.checkDeleteByReference(reference)
                .then((count) => {
                if (count[0] == 0 && count[1] == 0) {
                    ItemModel.delete(item.id, req.body.userId).then((delete_result) => {
                        const socket = new SocketHelper("deleteItem", delete_result);
                        socket.create();
                        LogHelper.log(new Date(), "info", `${delete_result.user.name} deleted item with reference ${delete_result.reference} (ID: ${delete_result.id})`, "Item controller - Delete", req.body.userId);
                        ItemModel.countByBrandId(delete_result.item_brand_id)
                            .then((count_brand) => {
                            const itemSocket = new SocketHelper("deleteItemBrand", {
                                brand_id: delete_result.item_brand_id,
                                can_delete: count_brand == 0 ? true : false,
                            });
                            itemSocket.create();
                            return res.status(201).send(delete_result);
                        })
                            .catch((error) => {
                            LogHelper.log(new Date(), "error", error, `Item - Create`, req.body.userId);
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
                LogHelper.log(new Date(), `Error`, `${error}`, `Item controller - Delete`, req.body.userId);
            });
        }
    });
};
ItemController.update = (req, res) => {
    const id = req.body.id;
    const reference = req.body.reference;
    const description = req.body.description;
    const brand = parseInt(req.body.brand.toString());
    const type = parseInt(req.body.type.toString());
    const minimum_stock = req.body.minimum_stock;
    const unit = req.body.unit;
    ItemModel.fetchById(id, new Date())
        .then((item) => {
        if (item == null || item.is_delete) {
            return res.status(404).send("Barang tidak ditemukan.");
        }
        else {
            ItemModel.update(id, reference, description, brand, type, req.body.userId, minimum_stock, unit)
                .then((result) => {
                var _a;
                LogHelper.log(new Date(), "info", `${(_a = result.user_item_updated_byTouser) === null || _a === void 0 ? void 0 : _a.name} updated item with reference ${result.reference} (ID: ${result.id})`, `Item - Update`, req.body.userId);
                const socket = new SocketHelper("updateItem", result);
                socket.create();
                return res.status(200).send(result);
            })
                .catch((error) => {
                LogHelper.log(new Date(), "error", `${error}`, `Item - Update`, req.body.userId);
                return res.status(500).send(error);
            });
        }
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", `${error}`, `Item - Update`, req.body.userId);
    });
};
ItemController.fetchSearchResult = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    ItemModel.fetchSearch(keyword, offset, limit)
        .then((result) => {
        const ids = result[0].map((x) => {
            return x.id;
        });
        ItemModel.fetchSearchByIds(ids)
            .then((items) => {
            return res.status(200).send({
                data: items.map((x) => {
                    return Object.assign(Object.assign({}, x), { price: x.item_price.filter((y) => y.item_unit == null)[0]
                            .price, discount: x.item_price.filter((y) => y.item_unit == null)[0]
                            .discount });
                }),
                count: result[1][0].count,
            });
        })
            .catch((error) => {
            console.error(error);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        console.error(error);
        return res.status(500).send(error);
    });
};
ItemController.fetchPurchaseSearchResult = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    ItemModel.fetchSearch(keyword, offset, limit)
        .then((result) => {
        const ids = result[0].map((x) => {
            return x.id;
        });
        ItemModel.fetchPurchaseSearchByIds(ids)
            .then((items) => {
            return res.status(200).send({
                data: items.map((x) => {
                    return Object.assign(Object.assign({}, x), { price: x.item_price_purchase.filter((y) => y.item_unit == null)[0].price });
                }),
                count: result[1].length,
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
ItemController.fetchSearchStock = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    ItemModel.fetchSearch(keyword, offset, limit)
        .then((result) => {
        const ids = result[0].map((x) => {
            return x.id;
        });
        ItemModel.fetchStockByItemIds(ids)
            .then((stock) => {
            return res.status(200).send({
                data: stock[0].map((x) => {
                    var _a, _b;
                    return Object.assign(Object.assign({}, x), { price: (_a = x.item_price.find((x) => x.item_unit == null)) === null || _a === void 0 ? void 0 : _a.price, discount: (_b = x.item_price.find((x) => x.item_unit == null)) === null || _b === void 0 ? void 0 : _b.discount, unit: x.unit, item_price: x.item_price.filter((x) => x.item_unit != null) });
                }),
                count: result[1][0].count,
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
ItemController.fetch = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword ? "" : decodeURIComponent(req.query.keyword.toString());
    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);
    ItemModel.fetch(keyword, date, offset, limit)
        .then((result) => {
        ItemModel.checkCountByIds(result[0].map((x) => x.id))
            .then((count) => {
            return res.status(200).send({
                data: result[0].map((item) => {
                    return Object.assign(Object.assign({}, item), { _count: undefined, can_delete: count[0] + count[1] + count[2] == 0 ? true : false });
                }),
                count: result[1],
            });
        })
            .catch((error) => {
            LogHelper.log(new Date(), "error", error, "Item controller - count", req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Item controller - fetch", req.body.userId);
        console.log(error);
        return res.status(500).send(error);
    });
};
ItemController.fetchByReference = (req, res) => {
    const reference = req.params.reference;
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);
    ItemModel.fetchByReference(reference)
        .then((item) => {
        if (item == null) {
            return res.status(404).send("Barang tidak ditemukan.");
        }
        else {
            res.status(200).send(Object.assign(Object.assign({}, item), { _count: undefined, can_delete: ((item === null || item === void 0 ? void 0 : item._count.bill) || 0) > 0 ||
                    ((item === null || item === void 0 ? void 0 : item._count.good_receipt) || 0) > 0 ||
                    ((item === null || item === void 0 ? void 0 : item._count.adjustment_case) || 0) > 0
                    ? false
                    : true }));
        }
    })
        .catch((error) => {
        res.status(500).send(error);
    });
};
ItemController.fetchStock = (req, res) => {
    var _a;
    const errors = validationResult(req);
    if (errors.array().length > 0) {
        return res.status(400).send("Mohon isikan dengan format yang sesuai.");
    }
    const reference = decodeURIComponent((_a = req.query.reference) === null || _a === void 0 ? void 0 : _a.toString());
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    ItemModel.fetchByReference(reference).then((item) => {
        if (item == null) {
            return res.status(404).send("Referensi tidak ditemukan.");
        }
        else {
            ItemModel.fetchStockById(item.id, offset, limit)
                .then((result) => {
                return res.status(200).send({
                    data: result[0].map((x) => {
                        return Object.assign(Object.assign({}, x), { quantity: parseFloat(x.quantity.toString()), lead_quantity: parseFloat(x.lead_quantity.toString()) });
                    }),
                    count: result[1],
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    });
};
ItemController.downloadStock = (req, res) => {
    const start = req.body.start;
    const end = req.body.end;
    const format = req.body.format;
    const reference = req.body.reference;
    ItemModel.fetchByReference(reference)
        .then((item) => {
        if (item == null) {
            return res.status(404).send("Barang tidak ditemukan.");
        }
        else {
            ItemModel.fetchStockData(item.id, start, end).then((result) => {
                switch (format) {
                    case "pdf":
                        StockCardHelper.createPdf(result.map((x) => {
                            return Object.assign(Object.assign({}, x), { date: new Date(x.date), stock: parseFloat(x.stock.toString()), quantity: parseFloat(x.quantity.toString()) });
                        }), function (binary) {
                            return res.status(200).send({
                                data: binary,
                            });
                        }, function (error) {
                            return res.status(500).send(error);
                        });
                        break;
                    case "csv":
                        StockCardHelper.createCsv(result.map((x) => {
                            return Object.assign(Object.assign({}, x), { date: new Date(x.date), quantity: parseFloat(x.quantity.toString()), stock: parseFloat(x.stock.toString()) });
                        }), function (array) {
                            return res.status(200).send({
                                data: array,
                            });
                        }, function (error) {
                            return res.status(500).send(error);
                        });
                        break;
                    default:
                        return res.status(405).send("Format tidak ditemukan.");
                }
            });
        }
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Item Controller - Download stock", req.body.userId);
        return res.status(500).send(error);
    });
};
ItemController.fetchUnits = (req, res) => {
    const reference = decodeURIComponent(req.params.reference);
    ItemUnitModel.fetchByItemReference(reference)
        .then((result) => {
        if (result == null || result.is_delete) {
            return res.status(404).send("Barang tidak ditemukan.");
        }
        else {
            return res.status(200).send(result);
        }
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Item Controller - fetch Units", req.body.userId);
        return res.status(500).send(error);
    });
};
ItemController.updateUnit = (req, res) => {
    const units = req.body.units;
    const item_id = req.body.item_id;
    const new_units = units.filter((x) => x.id == "");
    const update_units = units.filter((x) => x.id != "");
    Promise.all([
        ItemUnitModel.createMany(new_units, item_id, req.body.userId),
        ItemUnitModel.updateMany(update_units, req.body.userId),
    ])
        .then(() => {
        ItemModel.fetchById(item_id, new Date())
            .then((item) => {
            return res.status(200).send(item);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Item Controller - Update units", req.body.userId);
        return res.status(500).send(error);
    });
};
ItemController.fetchDailyStock = (req, res) => {
    var _a;
    const errors = validationResult(req);
    if (errors.array().length > 0) {
        return res.status(400).send("Mohon isikan dengan format yang sesuai.");
    }
    const reference = decodeURIComponent(req.params.reference);
    const start = (_a = req.query.start) === null || _a === void 0 ? void 0 : _a.toString();
    ItemModel.fetchByReference(reference)
        .then((item) => {
        if (item == null) {
            return res.status(404).send("Barang tidak ditemukan.");
        }
        else {
            ItemModel.fetchStockData(item.id, start, start)
                .then((result) => {
                return res.status(200).send(result);
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
ItemController.toggleActive = (req, res) => {
    const reference = decodeURIComponent(req.params.reference);
    ItemModel.fetchByReference(reference).then((item) => {
        if (item == null || item.is_delete) {
            return res.status(404).send("Barang tidak ditemukan.");
        }
        else {
            ItemModel.toggleActive(item.id, !item.is_active)
                .then((result) => {
                const socket = new SocketHelper("updateItemActive", result);
                socket.create();
                return res.status(200).send(result);
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    });
};
ItemController.fetchStockReportPdf = (req, res) => {
    if (typeof req.body.brand_id === "string") {
        const brand_ids = JSON.parse(req.body.brand_id.replace("'", "").replace('"', ""));
        const type_ids = JSON.parse(req.body.type_id.replace("'", "").replace('"', ""));
        Promise.all([
            UserModel.fetchById(req.body.userId),
            ItemModel.fetchInsufficient(brand_ids, type_ids),
        ]).then((result) => {
            if (result[0] == null) {
                return res.status(400).send("Pengguna tidak ditemukan.");
            }
            else {
                const items = result[1].filter((x) => (!x.stock ? 0 : x.stock.stock) < x.minimum_stock);
                StockCardHelper.createInsufficientPdf(items, function (binary) {
                    return res.status(200).send({
                        data: binary,
                    });
                }, function (error) {
                    return res.status(500).send(error);
                });
            }
        });
    }
    else {
        const brand_ids = req.body.brand_id;
        const type_ids = req.body.type_id;
        Promise.all([
            UserModel.fetchById(req.body.userId),
            ItemModel.fetchInsufficient(brand_ids, type_ids),
        ]).then((result) => {
            if (result[0] == null) {
                return res.status(400).send("Pengguna tidak ditemukan.");
            }
            else {
                const items = result[1].filter((x) => (!x.stock ? 0 : x.stock.stock) < x.minimum_stock);
                StockCardHelper.createInsufficientPdf(items, function (binary) {
                    return res.status(200).send({
                        data: binary,
                    });
                }, function (error) {
                    return res.status(500).send(error);
                });
            }
        });
    }
};
ItemController.fetchStockReport = (req, res) => {
    if (typeof req.body.brand_id === "string") {
        const brand_ids = JSON.parse(req.body.brand_id.replace("'", "").replace('"', ""));
        const type_ids = JSON.parse(req.body.type_id.replace("'", "").replace('"', ""));
        ItemModel.fetchInsufficient(brand_ids, type_ids)
            .then((result) => {
            return res.status(200).send({
                data: result
                    .filter((x) => (!x.stock ? 0 : x.stock.stock) < x.minimum_stock)
                    .map((y) => {
                    return Object.assign(Object.assign({}, y), { stock: y.stock == null ? 0 : y.stock.stock });
                }),
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else {
        const brand_ids = req.body.brand_id;
        const type_ids = req.body.type_id;
        ItemModel.fetchInsufficient(brand_ids, type_ids)
            .then((result) => {
            return res.status(200).send({
                data: result
                    .filter((x) => (!x.stock ? 0 : x.stock.stock) < x.minimum_stock)
                    .map((y) => {
                    return Object.assign(Object.assign({}, y), { stock: y.stock == null ? 0 : y.stock.stock });
                }),
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
};
ItemController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    ItemModel.fetchById(id, new Date())
        .then((result) => {
        return res.status(200).send(Object.assign(Object.assign({}, result), { item_price_id: result === null || result === void 0 ? void 0 : result.item_price.filter((x) => x.item_unit == null)[0].id, item_price_purchase_id: result === null || result === void 0 ? void 0 : result.item_price_purchase.filter((x) => x.item_unit == null)[0].id, price: result === null || result === void 0 ? void 0 : result.item_price.filter((x) => x.item_unit == null)[0].price, discount: result === null || result === void 0 ? void 0 : result.item_price.filter((x) => x.item_unit == null)[0].discount, purchase_price: result === null || result === void 0 ? void 0 : result.item_price_purchase.filter((x) => x.item_unit == null)[0].price, item_price: result === null || result === void 0 ? void 0 : result.item_price.filter((x) => x.item_unit != null), item_price_purchase: result === null || result === void 0 ? void 0 : result.item_price_purchase.filter((x) => x.item_unit != null) }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
export default ItemController;
