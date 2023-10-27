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
const error_list_1 = __importDefault(require("../assets/error_list"));
const stock_card_helper_1 = __importDefault(require("../helper/stock_card.helper"));
const item_model_1 = require("../model/item.model");
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
const app_1 = require("../app");
const mongo_product_model_1 = require("../mongo-model/mongo-product.model");
class ProductStockController {
}
_a = ProductStockController;
/**
 * Fetch product stock
 * @param req
 * @param res
 */
ProductStockController.fetch = (req, res) => {
    const page = !req.query.page ? 1 : parseInt(req.query.page.toString());
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const mode = req.query.mode;
    switch (mode) {
        case "problem":
            Promise.all([
                mongo_product_model_1.mongoProductModel
                    .find({
                    $or: [
                        {
                            reference: {
                                $regex: keyword,
                            },
                        },
                        {
                            description: {
                                $regex: keyword,
                            },
                        },
                    ],
                    currentStock: {
                        $lt: 0,
                    },
                })
                    .sort({ reference: 1 })
                    .limit(10)
                    .skip((page - 1) * 10),
                mongo_product_model_1.mongoProductModel.countDocuments({
                    currentStock: {
                        $lt: 0,
                    },
                }),
            ]).then((result) => {
                return res.status(200).send({
                    data: result[0].map((x) => {
                        return {
                            id: x.itemID,
                            reference: x.reference,
                            description: x.description,
                            stock: x.currentStock,
                            unit: x.unit,
                            item_brand_id: x.itemBrandID,
                            item_type_id: x.itemTypeID,
                        };
                    }),
                    count: result[1],
                });
            });
            break;
        case "plain":
        default:
            app_1.meili
                .index("item")
                .search(keyword, {
                limit: 10,
                offset: (page - 1) * 10,
            })
                .then((result) => __awaiter(void 0, void 0, void 0, function* () {
                const productStock = yield mongo_product_model_1.mongoProductModel.find({
                    itemID: {
                        $in: result.hits.map((x) => x.id),
                    },
                }, "itemID unit currentStock");
                return res.status(200).send({
                    data: result.hits.map((x) => {
                        const stockIndex = productStock.findIndex((y) => y.itemID == x.id);
                        return {
                            id: x.id,
                            reference: x.reference,
                            description: x.description,
                            stock: stockIndex == -1
                                ? 0
                                : productStock[stockIndex].currentStock,
                            unit: stockIndex == -1 ? "" : productStock[stockIndex].unit,
                            item_brand_id: x.itemBrandID,
                            item_type_id: x.itemTypeID,
                            item_brand_name: x.brand,
                            item_type_name: x.type,
                        };
                    }),
                    count: result.estimatedTotalHits,
                });
            }));
            break;
    }
};
/**
 * Fetch product stock card by ID
 * @param req
 * @param res
 */
ProductStockController.fetchByID = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const itemID = parseInt(req.params.id);
    const page = req.query.page == null ? 1 : parseInt(req.query.page.toString());
    const product = yield mongo_product_model_1.mongoProductModel.findOne({ itemID: itemID }, {
        stockCard: {
            $slice: [(page - 1) * 10, 10],
        },
    });
    const stockCardLength = yield mongo_product_model_1.mongoProductModel.aggregate([
        {
            $match: {
                itemID: itemID,
            },
        },
        {
            $project: {
                stockCard: 1,
                _id: 0,
                length: { $size: "$stockCard" },
            },
        },
    ]);
    if (!product) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    return res.status(200).send({
        data: product.stockCard.map((x) => {
            return {
                name: x.document,
                date: x.date,
                bill_id: x.billID,
                adjustment_case_id: x.adjustmentCaseID,
                good_receipt_id: x.goodReceiptID,
                sales_return_id: x.salesReturnID,
                quantity: x.displayQuantity,
                unit: x.unit,
                stock: x.currentStock,
                defaultUnit: product.unit,
                document_id: x.salesReturnID != null
                    ? x.salesReturnCodeID
                    : x.billID != null
                        ? x.billCodeID
                        : x.goodReceiptID != null
                            ? x.goodReceiptCodeID
                            : x.adjustmentCaseID != null
                                ? x.adjustmentCaseCodeID
                                : null,
            };
        }),
        count: stockCardLength[0].length,
    });
});
ProductStockController.create = (req, res) => {
    const mode = req.body.mode;
    switch (mode) {
        case "inadequate":
            const brand_id = req.body.brand;
            const type_id = req.body.type;
            product_stock_model_1.default.fetchInadequate(brand_id, type_id)
                .then((result) => __awaiter(void 0, void 0, void 0, function* () {
                const products = yield mongo_product_model_1.mongoProductModel
                    .find({
                    itemID: {
                        $in: result.map((x) => x.id),
                    },
                })
                    .select("itemID currentStock");
                return res.status(200).send({
                    data: result
                        .filter((x) => {
                        const productIndex = products.findIndex((y) => y.itemID == x.id);
                        return (productIndex != -1 &&
                            products[productIndex].currentStock < x.minimum_stock &&
                            products[productIndex].currentStock > 0);
                    })
                        .map((x) => {
                        const productIndex = products.findIndex((y) => y.itemID == x.id);
                        return {
                            id: x.id,
                            reference: x.reference,
                            description: x.description,
                            stock: products[productIndex].currentStock,
                            unit: x.unit,
                            minimum_stock: x.minimum_stock,
                        };
                    }),
                });
            }))
                .catch((error) => {
                console.error(`[error]: Error on fetching products ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
            break;
        case "mutation":
            const mutationItemID = req.body.itemID;
            const date = req.body.date;
            const offset = req.body.offset;
            mongo_product_model_1.mongoProductModel
                .findOne({
                itemID: mutationItemID,
            })
                .then((result) => {
                if (!result) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                const startDate = new Date(date);
                const startUTCDate = new Date(startDate.getTime() + offset * 60000);
                const endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 1);
                const endUTCDate = new Date(endDate.getTime() + offset * 60000);
                const day = new Date(date).getDate();
                const month = new Date(date).getMonth() + 1;
                const year = new Date(date).getFullYear();
                const documentStockCard = result.stockCard
                    .filter((x) => {
                    const date = new Date(x.date);
                    return (date.getDate() == day &&
                        date.getMonth() + 1 == month &&
                        date.getFullYear() == year);
                })
                    .sort((a, b) => {
                    return (new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime());
                });
                const inputStockCard = result.stockCard
                    .filter((x) => {
                    return (new Date(x.createdAt).getTime() >= startUTCDate.getTime() &&
                        new Date(x.createdAt).getTime() <= endUTCDate.getTime());
                })
                    .sort((a, b) => {
                    return (new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime());
                });
                let documentStockCardStartStock = documentStockCard.length == 0
                    ? 0
                    : documentStockCard[documentStockCard.length - 1].currentStock;
                let inputStockCardStartStock = inputStockCard.length == 0
                    ? 0
                    : inputStockCard[inputStockCard.length - 1].currentStock;
                for (let i = 0; i < documentStockCard.length; i++) {
                    documentStockCard[i].currentStock =
                        documentStockCardStartStock + documentStockCard[i].quantity;
                    documentStockCardStartStock += documentStockCard[i].quantity;
                }
                for (let i = 0; i < inputStockCard.length; i++) {
                    inputStockCard[i].currentStock =
                        inputStockCardStartStock + inputStockCard[i].quantity;
                    inputStockCardStartStock += inputStockCard[i].quantity;
                }
                return res.status(200).send({
                    document: {
                        mutation: documentStockCard.map((x) => {
                            return {
                                name: x.document,
                                date: x.date,
                                createdAt: x.createdAt,
                                opponent: x.opponent,
                                displayQuantity: x.displayQuantity,
                                quantity: x.quantity,
                                unit: x.unit,
                                stock: x.currentStock,
                                defaultUnit: result.unit,
                            };
                        }),
                        totalInput: documentStockCard.reduce((a, b) => {
                            return a + (b.quantity > 0 ? b.quantity : 0);
                        }, 0),
                        totalOutput: documentStockCard.reduce((a, b) => {
                            return a + (b.quantity < 0 ? b.quantity : 0);
                        }, 0) * -1,
                    },
                    input: {
                        mutation: inputStockCard.map((x) => {
                            return {
                                name: x.document,
                                date: x.date,
                                createdAt: x.createdAt,
                                opponent: x.opponent,
                                displayQuantity: x.displayQuantity,
                                quantity: x.quantity,
                                unit: x.unit,
                                stock: x.currentStock,
                                defaultUnit: result.unit,
                            };
                        }),
                        totalInput: inputStockCard.reduce((a, b) => {
                            return a + (b.quantity > 0 ? b.quantity : 0);
                        }, 0),
                        totalOutput: inputStockCard.reduce((a, b) => {
                            return a + (b.quantity < 0 ? b.quantity : 0);
                        }, 0) * -1,
                    },
                });
            })
                .catch((error) => {
                console.error(`[error]: Error on fetching product ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
            break;
        case "download":
            const itemID = req.body.itemID;
            const cardFormat = req.body.format;
            const dateStart = req.body.dateStart;
            const dateEnd = req.body.dateEnd;
            item_model_1.ItemModel.fetchByID(itemID)
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
exports.default = ProductStockController;
//# sourceMappingURL=product-stock.controller.js.map