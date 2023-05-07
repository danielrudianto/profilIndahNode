"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const stock_card_helper_1 = __importDefault(require("../helper/stock_card.helper"));
const item_model_1 = require("../model/item.model");
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
const node_cron_1 = __importDefault(require("node-cron"));
class ProductStockController {
}
ProductStockController.fetch = (req, res) => {
    if (req.query.mode == "plain" || req.query.mode == "problem") {
        const page = !req.query.page
            ? 1
            : Math.max(parseInt(req.query.page.toString()), 1);
        const limit = parseInt(process.env.LIMIT);
        const offset = (page - 1) * limit;
        const keyword = !req.query.keyword
            ? ""
            : decodeURIComponent((0, escape_helper_1.mysql_real_escape_string)(req.query.keyword.toString()));
        product_stock_model_1.default.fetch(keyword, offset, limit, req.query.mode)
            .then((result) => {
            return res.status(200).send({
                data: result[0],
                count: result[1],
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
};
ProductStockController.fetchByID = (req, res) => {
    const itemID = parseInt(req.params.id);
    const mode = req.query.mode;
    switch (mode) {
        case "card":
            const page = req.query.page == null ? 1 : parseInt(req.query.page.toString());
            product_stock_model_1.default.fetchByID(itemID, (page - 1) * 10)
                .then((result) => {
                return res.status(200).send({
                    data: result[0].map((x) => {
                        return {
                            name: x.f0,
                            date: x.f1,
                            bill_id: x.f4,
                            adjustment_case_id: x.f5,
                            good_receipt_id: x.f6,
                            sales_return_id: x.f7,
                            quantity: x.f8,
                            stock: x.f9,
                            unit: x.f10,
                            conversion: x.f11,
                            document_id: x.f12,
                        };
                    }),
                    count: result[1][0].f0,
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
    }
};
ProductStockController.create = (req, res) => {
    const mode = req.body.mode;
    const format = req.body.format;
    switch (mode) {
        case "inadequate":
            const brand_id = req.body.brand;
            const type_id = req.body.type;
            switch (format) {
                case "PDF":
                    product_stock_model_1.default.fetchInadequate(brand_id, type_id)
                        .then((result) => {
                        if (result.length == 0) {
                            return res.status(404).send(error_list_1.default["Not found"]);
                        }
                        else {
                            stock_card_helper_1.default.createInsufficientPdf(result, function (binary) {
                                return res.status(200).send({
                                    data: binary,
                                });
                            }, function (error) {
                                return res.status(500).send(error);
                            });
                        }
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                    break;
                default:
                    product_stock_model_1.default.fetchInadequate(brand_id, type_id)
                        .then((result) => {
                        return res.status(200).send({
                            data: result.map((x) => {
                                return {
                                    reference: x.reference,
                                    description: x.description,
                                    minimumStock: x.minimum_stock,
                                    unit: x.unit,
                                    stock: x.stock,
                                };
                            }),
                        });
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                    break;
            }
            break;
        case "input":
            const inputItemID = req.body.itemID;
            const inputDate = req.body.date;
            item_model_1.ItemModel.fetchById(inputItemID)
                .then((item) => {
                if (!item) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                else {
                    product_stock_model_1.default.fetchStockData(inputItemID, "input", `${inputDate} 00:00:00`, `${inputDate} 23:59:59`)
                        .then((result) => {
                        return res.status(200).send(result.map((x) => {
                            return {
                                name: x.f0,
                                date: new Date(x.f1),
                                created_at: new Date(x.f2),
                                item_id: x.f3,
                                item_unit_id: x.f4,
                                bill_id: x.f5,
                                adjustment_case_id: x.f6,
                                good_receipt_id: x.f7,
                                sales_return_id: x.f8,
                                quantity: x.f9,
                                stock: x.f10,
                                unit: x.f11,
                                conversion: x.f12,
                            };
                        }));
                    })
                        .catch((error) => {
                        console.log(error);
                        return res.status(500).send(error);
                    });
                }
            })
                .catch((error) => {
                console.log(error);
                return res.status(500).send(error);
            });
            break;
        case "document":
            const documentItemID = req.body.itemID;
            const documentDate = req.body.date;
            item_model_1.ItemModel.fetchById(documentItemID)
                .then((item) => {
                if (!item) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                else {
                    product_stock_model_1.default.fetchStockData(documentItemID, "document", documentDate, documentDate)
                        .then((result) => {
                        return res.status(200).send(result.map((x) => {
                            return {
                                name: x.f0,
                                date: new Date(x.f1),
                                created_at: new Date(x.f2),
                                item_id: x.f3,
                                item_unit_id: x.f4,
                                bill_id: x.f5,
                                adjustment_case_id: x.f6,
                                good_receipt_id: x.f7,
                                sales_return_id: x.f8,
                                quantity: x.f9,
                                stock: x.f10,
                                unit: x.f11,
                                conversion: x.f12,
                            };
                        }));
                    })
                        .catch((error) => {
                        console.log(error);
                        return res.status(500).send(error);
                    });
                }
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
            break;
        case "download":
            const itemID = req.body.itemID;
            const cardFormat = req.body.format;
            const dateStart = req.body.dateStart;
            const dateEnd = req.body.dateEnd;
            item_model_1.ItemModel.fetchById(itemID)
                .then((item) => {
                if (!item) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                else {
                    product_stock_model_1.default.fetchStockData(itemID, "card", dateStart, dateEnd)
                        .then((result) => {
                        if (cardFormat == "CSV") {
                            stock_card_helper_1.default.createCsv(result.map((x) => {
                                return {
                                    name: x.f0,
                                    date: new Date(x.f1),
                                    created_at: new Date(x.f2),
                                    item_id: x.f3,
                                    item_unit_id: x.f4,
                                    bill_id: x.f5,
                                    adjustment_case_id: x.f6,
                                    good_receipt_id: x.f7,
                                    sales_return_id: x.f8,
                                    quantity: x.f9,
                                    stock: x.f10,
                                    unit: x.f11,
                                    conversion: x.f12,
                                    opponent: x.f13,
                                };
                            }), function (array) {
                                return res.status(200).send({
                                    data: array,
                                });
                            }, function (error) {
                                return res.status(500).send(error);
                            });
                        }
                        else {
                            stock_card_helper_1.default.createPdf(item[0], result.map((x) => {
                                return {
                                    name: x.f0,
                                    date: new Date(x.f1),
                                    created_at: new Date(x.f2),
                                    item_id: x.f3,
                                    item_unit_id: x.f4,
                                    bill_id: x.f5,
                                    adjustment_case_id: x.f6,
                                    good_receipt_id: x.f7,
                                    sales_return_id: x.f8,
                                    quantity: x.f9,
                                    stock: x.f10,
                                    unit: x.f11,
                                    conversion: x.f12,
                                    opponent: x.f13,
                                };
                            }), function (binary) {
                                return res.status(200).send({
                                    data: binary,
                                });
                            }, function (error) {
                                return res.status(500).send(error);
                            });
                        }
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                }
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
    }
};
ProductStockController.scheduleData = () => {
    product_stock_model_1.default.syncData();
    // Create a cron job to run every day at 00:00:00
    node_cron_1.default.schedule("0 0 0 * * *", () => {
        product_stock_model_1.default.syncData();
    });
};
exports.default = ProductStockController;
