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
const item_model_1 = require("../model/item.model");
const app_1 = require("../app");
const mongo_product_model_1 = require("../mongo-model/mongo-product.model");
const mongo_stock_card_model_1 = require("../mongo-model/mongo-stock-card.model");
const user_model_1 = __importDefault(require("../model/user.model"));
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
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    const mode = req.query.mode;
    switch (mode) {
        case "sales-alert":
            user_model_1.default.fetchByID(req.body.userID).then((user) => __awaiter(void 0, void 0, void 0, function* () {
                if ((user === null || user === void 0 ? void 0 : user.role) != 6) {
                    // Fetch all just like plain
                    const productStock = yield mongo_product_model_1.mongoProductModel
                        .find({
                        $and: [
                            {
                                $expr: {
                                    $lt: ["$currentStock", "$minimumStock"],
                                },
                            },
                            {
                                $expr: {
                                    $gte: ["$currentStock", 0],
                                },
                            },
                            {
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
                            },
                        ],
                    }, "itemID reference description unit currentStock minimumStock")
                        .limit(10)
                        .skip((page - 1) * 10);
                    return res.status(200).send({
                        data: productStock.map((x) => {
                            return {
                                id: x.itemID,
                                reference: x.reference,
                                description: x.description,
                                stock: x.currentStock,
                                unit: x.unit,
                                minimum_stock: x.minimumStock,
                            };
                        }),
                    });
                }
                else {
                    // Fetch only product that he is able
                    const types = user.user_sales.map((x) => x.item_type.id);
                    const productStock = yield mongo_product_model_1.mongoProductModel
                        .find({
                        $and: [
                            {
                                $expr: {
                                    $lt: ["$currentStock", "$minimumStock"],
                                },
                            },
                            {
                                $expr: {
                                    $gte: ["$currentStock", 0],
                                },
                            },
                            {
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
                            },
                            {
                                itemTypeID: {
                                    $in: types,
                                },
                            },
                        ],
                    }, "itemID reference description unit currentStock minimumStock")
                        .limit(10)
                        .skip((page - 1) * 10);
                    return res.status(200).send({
                        data: productStock.map((x) => {
                            return {
                                id: x.itemID,
                                reference: x.reference,
                                description: x.description,
                                stock: x.currentStock,
                                unit: x.unit,
                                minimum_stock: x.minimumStock,
                            };
                        }),
                    });
                }
            }));
            break;
        case "sales":
            user_model_1.default.fetchByID(req.body.userID).then((user) => {
                if ((user === null || user === void 0 ? void 0 : user.role) != 6) {
                    // Fetch all just like plain
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
                        }, "itemID unit currentStock minimumStock");
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
                                    minimum_stock: stockIndex == -1
                                        ? 0
                                        : productStock[stockIndex].minimumStock,
                                };
                            }),
                        });
                    }));
                }
                else {
                    // Fetch only product that he is able
                    const types = user.user_sales.map((x) => x.item_type.id);
                    app_1.meili
                        .index("item")
                        .search(keyword, {
                        limit: 10,
                        offset: (page - 1) * 10,
                        filter: `itemTypeID = ${types.join(" OR itemTypeID = ")}`,
                    })
                        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
                        const productStock = yield mongo_product_model_1.mongoProductModel.find({
                            itemID: {
                                $in: result.hits.map((x) => x.id),
                            },
                        }, "itemID unit currentStock minimumStock");
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
                                    minimum_stock: stockIndex == -1
                                        ? 0
                                        : productStock[stockIndex].minimumStock,
                                };
                            }),
                        });
                    }));
                }
            });
            break;
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
        case "dashboard":
            mongo_product_model_1.mongoProductModel
                .countDocuments({
                $expr: {
                    $lt: ["$currentStock", "$minimumStock"],
                },
            })
                .then((result) => {
                return res.status(200).send({
                    count: result,
                });
            })
                .catch((error) => {
                console.error(`[error]: Error while fetching product stock. ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
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
    const stockCardLength = yield mongo_stock_card_model_1.mongoStockCardModel.countDocuments({
        itemID: itemID,
    });
    if (!product) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    const stockCards = yield mongo_stock_card_model_1.mongoStockCardModel
        .find({
        itemID: itemID,
    })
        .sort({
        date: -1,
        _id: -1,
    })
        .limit(10)
        .skip((page - 1) * 10);
    return res.status(200).send({
        data: stockCards.map((x) => {
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
        count: stockCardLength,
    });
});
ProductStockController.create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const mode = req.body.mode;
    switch (mode) {
        case "inadequate-pagination":
            const inadequateBrandID = req.body.brands;
            const inadequateTypeID = req.body.types;
            const page = req.body.page;
            if (inadequateBrandID.length == 0 && inadequateTypeID.length == 0) {
                Promise.all([
                    mongo_product_model_1.mongoProductModel.aggregate([
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: { $lt: ["$currentStock", "$minimumStock"] },
                                    },
                                    { $expr: { $gte: ["$currentStock", 0] } },
                                ],
                            },
                        },
                        {
                            $project: {
                                itemID: 1,
                                currentStock: 1,
                                minimumStock: 1,
                                unit: 1,
                                reference: 1,
                                description: 1,
                            },
                        },
                        {
                            $sort: {
                                reference: 1,
                            },
                        },
                        {
                            $limit: page * 10,
                        },
                        {
                            $skip: (page - 1) * 10,
                        },
                    ]),
                    mongo_product_model_1.mongoProductModel.countDocuments({
                        $and: [
                            {
                                $expr: { $lt: ["$currentStock", "$minimumStock"] },
                            },
                            { $expr: { $gte: ["$currentStock", 0] } },
                        ],
                    }),
                ])
                    .then(([result, count]) => {
                    item_model_1.ItemModel.fetchByIDs(result.map((x) => x.itemID))
                        .then((items) => {
                        return res.status(200).send({
                            data: result.map((x, index) => {
                                return {
                                    id: x.itemID,
                                    reference: x.reference,
                                    description: x.description,
                                    stock: x.currentStock,
                                    minimum_stock: x.minimumStock,
                                    unit: x.unit,
                                    item_brand_name: items[index].item_brand_name,
                                    item_type_name: items[index].item_type_name,
                                };
                            }),
                            count: count,
                        });
                    })
                        .catch((error) => {
                        console.error(`[error]: Error on fetching inadequate product. ${error}`);
                        return res
                            .status(500)
                            .send(error_list_1.default["Internal server error"]);
                    });
                })
                    .catch((error) => {
                    console.error(`[error]: Error on fetching inadequate product. ${error}`);
                    return res.status(500).send(error_list_1.default["Internal server error"]);
                });
            }
            else if (inadequateBrandID.length == 0) {
                Promise.all([
                    mongo_product_model_1.mongoProductModel.aggregate([
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: { $lt: ["$currentStock", "$minimumStock"] },
                                    },
                                    { $expr: { $gte: ["$currentStock", 0] } },
                                    {
                                        itemTypeID: {
                                            $in: inadequateTypeID,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $project: {
                                itemID: 1,
                                currentStock: 1,
                                minimumStock: 1,
                                unit: 1,
                                reference: 1,
                                description: 1,
                            },
                        },
                        {
                            $sort: {
                                reference: 1,
                            },
                        },
                        {
                            $limit: page * 10,
                        },
                        {
                            $skip: (page - 1) * 10,
                        },
                    ]),
                    mongo_product_model_1.mongoProductModel.countDocuments({
                        $and: [
                            {
                                $expr: { $lt: ["$currentStock", "$minimumStock"] },
                            },
                            { $expr: { $gte: ["$currentStock", 0] } },
                            {
                                itemTypeID: {
                                    $in: inadequateTypeID,
                                },
                            },
                        ],
                    }),
                ])
                    .then(([result, count]) => {
                    item_model_1.ItemModel.fetchByIDs(result.map((x) => x.itemID))
                        .then((items) => {
                        return res.status(200).send({
                            data: result.map((x, index) => {
                                return {
                                    id: x.itemID,
                                    reference: x.reference,
                                    description: x.description,
                                    stock: x.currentStock,
                                    minimum_stock: x.minimumStock,
                                    unit: x.unit,
                                    item_brand_name: items[index].item_brand_name,
                                    item_type_name: items[index].item_type_name,
                                };
                            }),
                            count: count,
                        });
                    })
                        .catch((error) => {
                        console.error(`[error]: Error on fetching inadequate product. ${error}`);
                        return res
                            .status(500)
                            .send(error_list_1.default["Internal server error"]);
                    });
                })
                    .catch((error) => {
                    console.error(`[error]: Error on fetching inadequate product. ${error}`);
                    return res.status(500).send(error_list_1.default["Internal server error"]);
                });
            }
            else if (inadequateTypeID.length == 0) {
                Promise.all([
                    mongo_product_model_1.mongoProductModel.aggregate([
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: { $lt: ["$currentStock", "$minimumStock"] },
                                    },
                                    { $expr: { $gte: ["$currentStock", 0] } },
                                    {
                                        itemBrandID: {
                                            $in: inadequateBrandID,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $project: {
                                itemID: 1,
                                currentStock: 1,
                                minimumStock: 1,
                                unit: 1,
                                reference: 1,
                                description: 1,
                            },
                        },
                        {
                            $sort: {
                                reference: 1,
                            },
                        },
                        {
                            $limit: page * 10,
                        },
                        {
                            $skip: (page - 1) * 10,
                        },
                    ]),
                    mongo_product_model_1.mongoProductModel.countDocuments({
                        $and: [
                            {
                                $expr: { $lt: ["$currentStock", "$minimumStock"] },
                            },
                            { $expr: { $gte: ["$currentStock", 0] } },
                            {
                                itemBrandID: {
                                    $in: inadequateBrandID,
                                },
                            },
                        ],
                    }),
                ])
                    .then(([result, count]) => {
                    item_model_1.ItemModel.fetchByIDs(result.map((x) => x.itemID))
                        .then((items) => {
                        return res.status(200).send({
                            data: result.map((x, index) => {
                                return {
                                    id: x.itemID,
                                    reference: x.reference,
                                    description: x.description,
                                    stock: x.currentStock,
                                    minimum_stock: x.minimumStock,
                                    unit: x.unit,
                                    item_brand_name: items[index].item_brand_name,
                                    item_type_name: items[index].item_type_name,
                                };
                            }),
                            count: count,
                        });
                    })
                        .catch((error) => {
                        console.error(`[error]: Error on fetching inadequate product. ${error}`);
                        return res
                            .status(500)
                            .send(error_list_1.default["Internal server error"]);
                    });
                })
                    .catch((error) => {
                    console.error(`[error]: Error on fetching inadequate product. ${error}`);
                    return res.status(500).send(error_list_1.default["Internal server error"]);
                });
            }
            else {
                Promise.all([
                    mongo_product_model_1.mongoProductModel.aggregate([
                        {
                            $match: {
                                $and: [
                                    {
                                        $expr: { $lt: ["$currentStock", "$minimumStock"] },
                                    },
                                    { $expr: { $gte: ["$currentStock", 0] } },
                                    {
                                        itemBrandID: {
                                            $in: inadequateBrandID,
                                        },
                                    },
                                    {
                                        itemTypeID: {
                                            $in: inadequateTypeID,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $project: {
                                itemID: 1,
                                currentStock: 1,
                                minimumStock: 1,
                                unit: 1,
                                reference: 1,
                                description: 1,
                            },
                        },
                        {
                            $sort: {
                                reference: 1,
                            },
                        },
                        {
                            $limit: page * 10,
                        },
                        {
                            $skip: (page - 1) * 10,
                        },
                    ]),
                    mongo_product_model_1.mongoProductModel.countDocuments({
                        $and: [
                            {
                                $expr: { $lt: ["$currentStock", "$minimumStock"] },
                            },
                            { $expr: { $gte: ["$currentStock", 0] } },
                            {
                                itemBrandID: {
                                    $in: inadequateBrandID,
                                },
                            },
                            {
                                itemTypeID: {
                                    $in: inadequateTypeID,
                                },
                            },
                        ],
                    }),
                ])
                    .then(([result, count]) => {
                    item_model_1.ItemModel.fetchByIDs(result.map((x) => x.itemID))
                        .then((items) => {
                        return res.status(200).send({
                            data: result.map((x, index) => {
                                return {
                                    id: x.itemID,
                                    reference: x.reference,
                                    description: x.description,
                                    stock: x.currentStock,
                                    minimum_stock: x.minimumStock,
                                    unit: x.unit,
                                    item_brand_name: items[index].item_brand_name,
                                    item_type_name: items[index].item_type_name,
                                };
                            }),
                            count: count,
                        });
                    })
                        .catch((error) => {
                        console.error(`[error]: Error on fetching inadequate product. ${error}`);
                        return res
                            .status(500)
                            .send(error_list_1.default["Internal server error"]);
                    });
                })
                    .catch((error) => {
                    console.error(`[error]: Error on fetching inadequate product. ${error}`);
                    return res.status(500).send(error_list_1.default["Internal server error"]);
                });
            }
            break;
        case "inadequate":
            const brand_id = req.body.brand;
            const type_id = req.body.type;
            if (brand_id.length == 0 && type_id.length == 0) {
                mongo_product_model_1.mongoProductModel
                    .aggregate([
                    {
                        $match: {
                            $and: [
                                {
                                    $expr: { $lt: ["$currentStock", "$minimumStock"] },
                                },
                                { $expr: { $gte: ["$currentStock", 0] } },
                            ],
                        },
                    },
                    {
                        $project: {
                            itemID: 1,
                            currentStock: 1,
                            minimumStock: 1,
                            unit: 1,
                            reference: 1,
                            description: 1,
                        },
                    },
                    {
                        $sort: {
                            reference: 1,
                        },
                    },
                ])
                    .then((result) => {
                    return res.status(200).send(result.map((x) => {
                        return {
                            reference: x.reference,
                            description: x.description,
                            stock: x.currentStock,
                            minimum_stock: x.minimumStock,
                            unit: x.unit,
                        };
                    }));
                });
            }
            else if (brand_id.length == 0) {
                mongo_product_model_1.mongoProductModel
                    .aggregate([
                    {
                        $match: {
                            $and: [
                                {
                                    $expr: { $lt: ["$currentStock", "$minimumStock"] },
                                },
                                { $expr: { $gte: ["$currentStock", 0] } },
                                {
                                    itemTypeID: {
                                        $in: type_id,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $project: {
                            itemID: 1,
                            currentStock: 1,
                            minimumStock: 1,
                            unit: 1,
                            reference: 1,
                            description: 1,
                        },
                    },
                    {
                        $sort: {
                            reference: 1,
                        },
                    },
                ])
                    .then((result) => {
                    return res.status(200).send(result.map((x) => {
                        return {
                            reference: x.reference,
                            description: x.description,
                            stock: x.currentStock,
                            minimum_stock: x.minimumStock,
                            unit: x.unit,
                        };
                    }));
                });
            }
            else if (type_id.length == 0) {
                mongo_product_model_1.mongoProductModel
                    .aggregate([
                    {
                        $match: {
                            $and: [
                                {
                                    $expr: { $lt: ["$currentStock", "$minimumStock"] },
                                },
                                { $expr: { $gte: ["$currentStock", 0] } },
                                {
                                    itemBrandID: {
                                        $in: brand_id,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $project: {
                            itemID: 1,
                            currentStock: 1,
                            minimumStock: 1,
                            unit: 1,
                            reference: 1,
                            description: 1,
                        },
                    },
                    {
                        $sort: {
                            reference: 1,
                        },
                    },
                ])
                    .then((result) => {
                    return res.status(200).send(result.map((x) => {
                        return {
                            reference: x.reference,
                            description: x.description,
                            stock: x.currentStock,
                            minimum_stock: x.minimumStock,
                            unit: x.unit,
                        };
                    }));
                });
            }
            break;
        case "mutation":
            const mutationItemID = req.body.itemID;
            const date = req.body.date;
            const offset = req.body.offset;
            const startDate = new Date(date);
            const startUTCDate = new Date(startDate.getTime() + offset * 60000);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            const endUTCDate = new Date(endDate.getTime() + offset * 60000);
            const day = new Date(date).getDate();
            const month = new Date(date).getMonth();
            const year = new Date(date).getFullYear();
            const product = yield mongo_product_model_1.mongoProductModel.findOne({
                itemID: mutationItemID,
            });
            mongo_stock_card_model_1.mongoStockCardModel
                .find({
                itemID: mutationItemID,
                $or: [
                    {
                        $and: [
                            {
                                date: {
                                    $gte: new Date(year, month, day),
                                },
                            },
                            {
                                date: {
                                    $lt: new Date(year, month, day + 1),
                                },
                            },
                        ],
                    },
                    {
                        createdAt: {
                            $gte: startUTCDate,
                            $lt: endUTCDate,
                        },
                    },
                ],
            })
                .then((result) => {
                if (!result) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                else {
                    const documentBasedMutation = {
                        initialStock: result.filter((x) => x.date.getDate() == day &&
                            x.date.getMonth() == month &&
                            x.date.getFullYear() == year).length == 0
                            ? 0
                            : result
                                .filter((x) => x.date.getDate() == day &&
                                x.date.getMonth() == month &&
                                x.date.getFullYear() == year)
                                .sort((a, b) => {
                                return a.createdAt.getTime() - b.createdAt.getTime();
                            })[0].currentStock -
                                result
                                    .filter((x) => x.date.getDate() == day &&
                                    x.date.getMonth() == month &&
                                    x.date.getFullYear() == year)
                                    .sort((a, b) => {
                                    return a.createdAt.getTime() - b.createdAt.getTime();
                                })[0].quantity,
                        totalInput: result
                            .filter((x) => x.date.getDate() == day &&
                            x.date.getMonth() == month &&
                            x.date.getFullYear() == year)
                            .filter((x) => x.quantity > 0)
                            .reduce((a, b) => {
                            return a + Number(b.quantity);
                        }, 0),
                        totalOutput: result
                            .filter((x) => x.date.getDate() == day &&
                            x.date.getMonth() == month &&
                            x.date.getFullYear() == year)
                            .filter((x) => x.quantity < 0)
                            .reduce((a, b) => {
                            return a + Number(b.quantity);
                        }, 0),
                        mutation: result
                            .filter((x) => x.date.getDate() == day &&
                            x.date.getMonth() == month &&
                            x.date.getFullYear() == year)
                            .sort((a, b) => {
                            return a.createdAt.getTime() - b.createdAt.getTime();
                        })
                            .map((x) => {
                            return {
                                date: new Date(x.date),
                                defaultUnit: product.unit,
                                createdAt: new Date(x.createdAt),
                                name: x.document,
                                displayQuantity: x.displayQuantity,
                                quantity: x.quantity,
                                stock: x.currentStock,
                                unit: x.unit,
                                opponent: x.opponent,
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
                    };
                    const inputBasedMutation = {
                        initialStock: result.filter((x) => x.createdAt.getTime() >= startUTCDate.getTime() &&
                            x.createdAt.getTime() < endUTCDate.getTime()).length == 0
                            ? 0
                            : result
                                .filter((x) => x.createdAt.getTime() >= startUTCDate.getTime() &&
                                x.createdAt.getTime() < endUTCDate.getTime())
                                .sort((a, b) => {
                                return a.createdAt.getTime() - b.createdAt.getTime();
                            })[0].currentStock -
                                result
                                    .filter((x) => x.createdAt.getTime() >= startUTCDate.getTime() &&
                                    x.createdAt.getTime() < endUTCDate.getTime())
                                    .sort((a, b) => {
                                    return a.createdAt.getTime() - b.createdAt.getTime();
                                })[0].quantity,
                        totalInput: result
                            .filter((x) => x.createdAt.getTime() >= startUTCDate.getTime() &&
                            x.createdAt.getTime() < endUTCDate.getTime())
                            .filter((x) => x.quantity > 0)
                            .reduce((a, b) => {
                            return a + Number(b.quantity);
                        }, 0),
                        totalOutput: result
                            .filter((x) => x.createdAt.getTime() >= startUTCDate.getTime() &&
                            x.createdAt.getTime() < endUTCDate.getTime())
                            .filter((x) => x.quantity < 0)
                            .reduce((a, b) => {
                            return a + Number(b.quantity);
                        }, 0),
                        mutation: result
                            .filter((x) => x.createdAt.getTime() >= startUTCDate.getTime() &&
                            x.createdAt.getTime() < endUTCDate.getTime())
                            .sort((a, b) => {
                            return a.createdAt.getTime() - b.createdAt.getTime();
                        })
                            .map((x) => {
                            return {
                                date: new Date(x.date),
                                defaultUnit: product.unit,
                                createdAt: new Date(x.createdAt),
                                name: x.document,
                                displayQuantity: x.displayQuantity,
                                quantity: x.quantity,
                                stock: x.currentStock,
                                unit: x.unit,
                                opponent: x.opponent,
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
                    };
                    return res.status(200).send({
                        document: documentBasedMutation,
                        input: inputBasedMutation,
                    });
                }
            })
                .catch((error) => {
                console.error(`[error]: Error on fetching product ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
            break;
    }
});
exports.default = ProductStockController;
//# sourceMappingURL=product-stock.controller.js.map