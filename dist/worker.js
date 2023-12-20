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
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const meilisearch_1 = __importDefault(require("meilisearch"));
const mongoose_1 = __importDefault(require("mongoose"));
const queue_helper_1 = require("./helper/queue.helper");
const mongo_overflow_model_1 = require("./mongo-model/mongo-overflow.model");
const mongo_product_model_1 = require("./mongo-model/mongo-product.model");
const mongo_stock_in_model_1 = require("./mongo-model/mongo-stock-in.model");
const mongo_error_model_1 = require("./mongo-model/mongo-error.model");
const mongo_stock_card_model_1 = require("./mongo-model/mongo-stock-card.model");
const meili = new meilisearch_1.default({
    host: "http://127.0.0.1:7700",
    apiKey: "UTw9kRYvov_K4fd1mQnDFKpdcxXVevHPcVEPWWlTVSg",
});
const workerOptions = {
    connection: {
        host: "127.0.0.1",
        port: 6379,
    },
    concurrency: 1,
};
const url = "mongodb://127.0.0.1:27017";
// Establish connection to database
function connectToDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose_1.default.connect(url, {
            dbName: "ProfilIndah",
            autoCreate: true,
        });
    });
}
const workerHandler = (job) => __awaiter(void 0, void 0, void 0, function* () {
    const name = job.name;
    switch (name) {
        case "insert-stock-in":
            const stockInData = job.data;
            try {
                yield mongo_stock_in_model_1.mongoStockInModel.create({
                    companyID: stockInData.companyID,
                    adjustmentCaseCodeID: stockInData.adjustmentCaseCodeID,
                    adjustmentCaseID: stockInData.adjustmentCaseID,
                    goodReceiptCodeID: stockInData.goodReceiptCodeID,
                    goodReceiptID: stockInData.goodReceiptID,
                    date: stockInData.date,
                    price: stockInData.price,
                    quantity: stockInData.quantity,
                    residue: stockInData.quantity,
                    itemID: stockInData.itemID,
                    stockOut: [],
                });
                const product = yield mongo_product_model_1.mongoProductModel.findOne({
                    itemID: stockInData.itemID,
                });
                if (!product) {
                    throw new Error("Product not found");
                }
                product.currentStock += stockInData.quantity;
                yield product.save();
                yield mongo_stock_card_model_1.mongoStockCardModel.create({
                    createdAt: stockInData.createdAt,
                    date: stockInData.date,
                    document: stockInData.document,
                    opponent: stockInData.opponent,
                    displayQuantity: stockInData.displayQuantity,
                    quantity: stockInData.quantity,
                    unit: stockInData.unit,
                    billID: stockInData.billID,
                    billCodeID: stockInData.billCodeID,
                    adjustmentCaseID: stockInData.adjustmentCaseID,
                    adjustmentCaseCodeID: stockInData.adjustmentCaseCodeID,
                    goodReceiptID: stockInData.goodReceiptID,
                    goodReceiptCodeID: stockInData.goodReceiptCodeID,
                    salesReturnID: stockInData.salesReturnID,
                    salesReturnCodeID: stockInData.salesReturnCodeID,
                    customerID: stockInData.customerID,
                    supplierID: stockInData.supplierID,
                    itemID: stockInData.itemID,
                    currentStock: 0,
                });
                yield queue_helper_1.queue.add("rearrange-stock-card", product.itemID);
                yield queue_helper_1.queue.add("check-overflow", product.itemID);
            }
            catch (error) {
                console.log(error);
                yield mongo_error_model_1.mongoErrorModel.create({
                    name: "insert-stock-in",
                    error: error,
                    data: stockInData,
                });
                throw new Error(error);
            }
            // DOMBA
            // complete overflow checking process
            break;
        case "insert-stock-out":
            const stockOutData = job.data;
            const product = yield mongo_product_model_1.mongoProductModel.findOne({
                itemID: stockOutData.itemID,
            });
            if (!product) {
                throw new Error("Product not found");
            }
            product.currentStock += stockOutData.quantity;
            yield product.save();
            try {
                // Add to stock card
                yield mongo_stock_card_model_1.mongoStockCardModel.create({
                    createdAt: stockOutData.createdAt,
                    date: stockOutData.date,
                    document: stockOutData.document,
                    opponent: stockOutData.opponent,
                    displayQuantity: stockOutData.displayQuantity,
                    quantity: stockOutData.quantity,
                    unit: stockOutData.unit,
                    billID: stockOutData.billID,
                    billCodeID: stockOutData.billCodeID,
                    adjustmentCaseID: stockOutData.adjustmentCaseID,
                    adjustmentCaseCodeID: stockOutData.adjustmentCaseCodeID,
                    goodReceiptID: stockOutData.goodReceiptID,
                    goodReceiptCodeID: stockOutData.goodReceiptCodeID,
                    salesReturnID: stockOutData.salesReturnID,
                    salesReturnCodeID: stockOutData.salesReturnCodeID,
                    customerID: stockOutData.customerID,
                    supplierID: stockOutData.supplierID,
                    itemID: stockOutData.itemID,
                    currentStock: 0,
                });
                let quantity = stockOutData.quantity * -1;
                while (quantity >= 0) {
                    if (quantity == 0) {
                        yield queue_helper_1.queue.add("rearrange-stock-card", product.itemID);
                        break;
                    }
                    else {
                        const stockIn = yield mongo_stock_in_model_1.mongoStockInModel
                            .findOne({
                            itemID: stockOutData.itemID,
                            residue: { $gt: 0 },
                        })
                            .sort({ date: 1 });
                        if (stockIn) {
                            const stockInResidue = stockIn.residue;
                            if (stockInResidue > quantity) {
                                stockIn.residue = stockInResidue - quantity;
                                yield stockIn.save();
                                yield mongo_stock_in_model_1.mongoStockOutModel.create({
                                    companyID: stockOutData.companyID,
                                    adjustmentCaseID: stockOutData.adjustmentCaseID,
                                    adjustmentCaseCodeID: stockOutData.adjustmentCaseCodeID,
                                    billID: stockOutData.billID,
                                    billCodeID: stockOutData.billCodeID,
                                    date: stockOutData.date,
                                    value: stockOutData.price,
                                    quantity: quantity,
                                    unit: stockOutData.unit,
                                    itemID: stockOutData.itemID,
                                    stockInID: stockIn._id,
                                });
                                quantity = 0;
                                yield stockIn.save();
                            }
                            else {
                                yield mongo_stock_in_model_1.mongoStockOutModel.create({
                                    companyID: stockOutData.companyID,
                                    adjustmentCaseID: stockOutData.adjustmentCaseID,
                                    adjustmentCaseCodeID: stockOutData.adjustmentCaseCodeID,
                                    billID: stockOutData.billID,
                                    billCodeID: stockOutData.billCodeID,
                                    date: stockOutData.date,
                                    value: stockOutData.price,
                                    quantity: stockInResidue,
                                    unit: stockOutData.unit,
                                    itemID: stockOutData.itemID,
                                    stockInID: stockIn._id,
                                });
                                quantity -= stockInResidue;
                                stockIn.residue = 0;
                                yield stockIn.save();
                            }
                        }
                        else {
                            yield mongo_overflow_model_1.mongoOverflowModel.create({
                                itemID: stockOutData.itemID,
                                date: stockOutData.date,
                                quantity: quantity,
                                billID: stockOutData.billID,
                                billCodeID: stockOutData.billCodeID,
                                adjustmentCaseID: stockOutData.adjustmentCaseID,
                                adjustmentCaseCodeID: stockOutData.adjustmentCaseCodeID,
                                value: stockOutData.price,
                            });
                            quantity = 0;
                        }
                    }
                }
            }
            catch (error) {
                yield mongo_error_model_1.mongoErrorModel.create({
                    name: "insert-stock-out",
                    error: error,
                    data: stockOutData,
                });
                throw new Error(error);
            }
            break;
        case "delete-stock-out":
            const deleteStockOutData = job.data;
            const stockOuts = yield mongo_stock_in_model_1.mongoStockOutModel.find({
                itemID: deleteStockOutData.itemID,
                billID: deleteStockOutData.billID,
                adjustmentCaseID: deleteStockOutData.adjustmentCaseID,
            });
            for (let i = 0; i < stockOuts.length; i++) {
                const stockOut = stockOuts[i];
                const stockIn = yield mongo_stock_in_model_1.mongoStockInModel.findById(stockOut.stockInID);
                if (!stockIn) {
                    throw new Error("Stock in not found");
                }
                stockIn.residue += stockOut.quantity;
                yield stockIn.save();
                yield mongo_stock_in_model_1.mongoStockOutModel.findByIdAndDelete(stockOut._id);
            }
            yield mongo_overflow_model_1.mongoOverflowModel.deleteMany({
                itemID: deleteStockOutData.itemID,
                billID: deleteStockOutData.billID,
                adjustmentCaseID: deleteStockOutData.adjustmentCaseID,
            });
            // Remove from stockCard
            yield mongo_stock_card_model_1.mongoStockCardModel.deleteMany({
                itemID: deleteStockOutData.itemID,
                billID: deleteStockOutData.billID,
                adjustmentCaseID: deleteStockOutData.adjustmentCaseID,
            });
            // Update product current stock
            const deleteStockOutProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                itemID: deleteStockOutData.itemID,
            });
            if (!deleteStockOutProduct) {
                throw new Error("Product not found");
            }
            deleteStockOutProduct.currentStock -= deleteStockOutData.quantity;
            yield deleteStockOutProduct.save();
            yield queue_helper_1.queue.add("rearrange-stock-card", deleteStockOutData.itemID);
            break;
        case "delete-stock-in":
            const deleteStockInStockOuts = yield mongo_stock_in_model_1.mongoStockOutModel.aggregate([
                // Match goodReceiptID in stockIn
                {
                    $match: {
                        itemID: job.data.itemID,
                    },
                },
                {
                    $lookup: {
                        from: "stock-ins",
                        localField: "stockInID",
                        foreignField: "_id",
                        as: "stockIn",
                    },
                },
                {
                    $match: {
                        "stockIn.goodReceiptID": job.data.goodReceiptID,
                        "stockIn.adjustmentCaseID": job.data.adjustmentCaseID,
                    },
                },
            ]);
            // Move the stock out that depends on the stock in to overflow
            for (let i = 0; i < deleteStockInStockOuts.length; i++) {
                const stockOut = deleteStockInStockOuts[i];
                yield mongo_overflow_model_1.mongoOverflowModel.create({
                    itemID: stockOut.itemID,
                    date: stockOut.date,
                    quantity: stockOut.quantity,
                    billID: stockOut.billID,
                    billCodeID: stockOut.billCodeID,
                    adjustmentCaseID: stockOut.adjustmentCaseID,
                    adjustmentCaseCodeID: stockOut.adjustmentCaseCodeID,
                    value: stockOut.value,
                });
                yield mongo_stock_in_model_1.mongoStockOutModel.findByIdAndDelete(stockOut._id);
            }
            // Delete the stock in
            yield mongo_stock_in_model_1.mongoStockInModel.deleteMany({
                goodReceiptID: job.data.goodReceiptID,
                itemID: job.data.itemID,
                adjustmentCaseID: job.data.adjustmentCaseID,
            });
            // Delete stock card
            yield mongo_stock_card_model_1.mongoStockCardModel.deleteMany({
                goodReceiptID: job.data.goodReceiptID,
                itemID: job.data.itemID,
                adjustmentCaseID: job.data.adjustmentCaseID,
            });
            const deleteStockInProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                itemID: job.data.itemID,
            });
            if (!deleteStockInProduct) {
                throw new Error("Product not found");
            }
            deleteStockInProduct.currentStock -= job.data.quantity;
            yield deleteStockInProduct.save();
            yield queue_helper_1.queue.add("rearange-stock-card", job.data.itemID);
            break;
        case "update-stock-in":
            const updateStockInData = job.data;
            // Find the stock in that needs to be updated
            const stockIn = yield mongo_stock_in_model_1.mongoStockInModel.find({
                itemID: updateStockInData.itemID,
                goodReceiptID: updateStockInData.goodReceiptID,
                goodReceiptCodeID: updateStockInData.goodReceiptCodeID,
            });
            for (let i = 0; i < stockIn.length; i++) {
                const stockInItem = stockIn[i];
                stockInItem.price = updateStockInData.price;
                yield stockInItem.save();
            }
            break;
        case "insert-stock-return":
            const stockReturnData = job.data;
            // Insert to stock card
            yield mongo_stock_card_model_1.mongoStockCardModel.create({
                createdAt: stockReturnData.createdAt,
                date: stockReturnData.date,
                document: stockReturnData.document,
                opponent: stockReturnData.opponent,
                displayQuantity: stockReturnData.displayQuantity,
                quantity: stockReturnData.quantity,
                unit: stockReturnData.unit,
                billID: stockReturnData.billID,
                billCodeID: stockReturnData.billCodeID,
                salesReturnID: stockReturnData.salesReturnID,
                salesReturnCodeID: stockReturnData.salesReturnCodeID,
                customerID: stockReturnData.customerID,
                itemID: stockReturnData.itemID,
                currentStock: 0,
            });
            yield queue_helper_1.queue.add("rearrange-stock-card", stockReturnData.itemID);
            let salesReturnQuantity = stockReturnData.quantity;
            while (salesReturnQuantity > 0) {
                if (salesReturnQuantity == 0) {
                    break;
                }
                // First search from overflow
                const overflow = yield mongo_overflow_model_1.mongoOverflowModel.findOne({
                    itemID: stockReturnData.itemID,
                    billID: stockReturnData.billID,
                    billCodeID: stockReturnData.billCodeID,
                });
                if (overflow) {
                    if (overflow.quantity > salesReturnQuantity) {
                        overflow.quantity -= salesReturnQuantity;
                        yield overflow.save();
                        salesReturnQuantity = 0;
                        break;
                    }
                    else {
                        salesReturnQuantity -= overflow.quantity;
                        yield mongo_overflow_model_1.mongoOverflowModel.findByIdAndDelete(overflow._id);
                    }
                }
                else {
                    // Search from stock out
                    const stockOut = yield mongo_stock_in_model_1.mongoStockOutModel.findOne({
                        itemID: stockReturnData.itemID,
                        billID: stockReturnData.billID,
                        billCodeID: stockReturnData.billCodeID,
                    });
                    if (!stockOut) {
                        throw new Error("Stock out not found");
                    }
                    const stockIn = yield mongo_stock_in_model_1.mongoStockInModel.findById(stockOut.stockInID);
                    if (!stockIn) {
                        throw new Error("Stock in not found");
                    }
                    if (stockOut.quantity > salesReturnQuantity) {
                        stockOut.quantity -= salesReturnQuantity;
                        yield stockOut.save();
                        salesReturnQuantity = 0;
                        stockIn.residue += salesReturnQuantity;
                        yield stockIn.save();
                        break;
                    }
                    else {
                        salesReturnQuantity -= stockOut.quantity;
                        stockIn.residue += stockOut.quantity;
                        yield stockIn.save();
                        yield mongo_stock_in_model_1.mongoStockOutModel.findByIdAndDelete(stockOut._id);
                    }
                }
            }
            break;
        case "delete-stock-return":
            const stockCard = yield mongo_stock_card_model_1.mongoStockCardModel.find({
                salesReturnID: job.data.salesReturnID,
            });
            for (let i = 0; i < stockCard.length; i++) {
                // Delete stock card document then rearrange stock card
                const stockCardItem = stockCard[i];
                yield mongo_stock_card_model_1.mongoStockCardModel.findByIdAndDelete(stockCardItem._id);
                yield queue_helper_1.queue.add("rearrange-stock-card", stockCardItem.itemID);
            }
            break;
        case "insert-stock-out-plain":
            // Only to calculate stock out, not to insert to stock cards
            const stockOutPlainData = job.data;
            let quantity = stockOutPlainData.quantity;
            while (quantity > 0) {
                if (quantity == 0) {
                    break;
                }
                else {
                    const stockIn = yield mongo_stock_in_model_1.mongoStockInModel
                        .findOne({
                        itemID: stockOutPlainData.itemID,
                        residue: { $gt: 0 },
                    })
                        .sort({ date: 1 });
                    if (stockIn) {
                        const stockInResidue = stockIn.residue;
                        if (stockInResidue > quantity) {
                            stockIn.residue = stockInResidue - quantity;
                            yield stockIn.save();
                            yield mongo_stock_in_model_1.mongoStockOutModel.create({
                                itemID: stockOutPlainData.itemID,
                                adjustmentCaseID: stockOutPlainData.adjustmentCaseID,
                                adjustmentCaseCodeID: stockOutPlainData.adjustmentCaseCodeID,
                                billID: stockOutPlainData.billID,
                                billCodeID: stockOutPlainData.billCodeID,
                                date: stockOutPlainData.date,
                                value: stockOutPlainData.value,
                                quantity: quantity,
                                stockInID: stockIn._id,
                            });
                            quantity = 0;
                            yield stockIn.save();
                        }
                        else {
                            yield mongo_stock_in_model_1.mongoStockOutModel.create({
                                itemID: stockOutPlainData.itemID,
                                adjustmentCaseID: stockOutPlainData.adjustmentCaseID,
                                adjustmentCaseCodeID: stockOutPlainData.adjustmentCaseCodeID,
                                billID: stockOutPlainData.billID,
                                billCodeID: stockOutPlainData.billCodeID,
                                date: stockOutPlainData.date,
                                value: stockOutPlainData.value,
                                quantity: stockInResidue,
                                stockInID: stockIn._id,
                            });
                            quantity -= stockInResidue;
                            stockIn.residue = 0;
                            yield stockIn.save();
                        }
                    }
                    else {
                        yield mongo_overflow_model_1.mongoOverflowModel.create({
                            itemID: stockOutPlainData.itemID,
                            date: stockOutPlainData.date,
                            quantity: quantity,
                            billID: stockOutPlainData.billID,
                            billCodeID: stockOutPlainData.billCodeID,
                            adjustmentCaseID: stockOutPlainData.adjustmentCaseID,
                            adjustmentCaseCodeID: stockOutPlainData.adjustmentCaseCodeID,
                            value: stockOutPlainData.value,
                        });
                        quantity = 0;
                        break;
                    }
                }
            }
            break;
        case "insert-product":
            const insertProductRreference = job.data.reference;
            const insertProductDescription = job.data.description;
            const insertProductID = job.data.id;
            const insertProductUnit = job.data.unit;
            const insertProductBrand = job.data.itemBrand;
            const insertProductType = job.data.itemType;
            const insertProductItemTypeID = job.data.itemTypeID;
            const insertProductItemBrandID = job.data.itemBrandID;
            const insertProductMinimumStock = job.data.minimumStock;
            try {
                yield mongo_product_model_1.mongoProductModel.create({
                    reference: insertProductRreference,
                    description: insertProductDescription,
                    itemID: insertProductID,
                    unit: insertProductUnit,
                    currentStock: 0,
                    itemTypeID: insertProductItemTypeID,
                    itemBrandID: insertProductItemBrandID,
                    minimumStock: insertProductMinimumStock,
                    calculatedMinimumStock: 0,
                });
                yield meili.index("item").addDocuments([
                    {
                        id: insertProductID,
                        reference: insertProductRreference,
                        description: insertProductDescription,
                        brand: insertProductBrand,
                        brandID: insertProductItemBrandID,
                        type: insertProductType,
                        typeID: insertProductItemTypeID,
                        is_active: 1,
                    },
                ], {
                    primaryKey: "id",
                });
            }
            catch (error) {
                yield mongo_error_model_1.mongoErrorModel.create({
                    date: new Date(),
                    error: error.toString(),
                    function: "insert-product",
                    data: job.data,
                });
            }
            break;
        case "update-product":
            const updateProductRreference = job.data.reference;
            const updateProductDescription = job.data.description;
            const updateProductID = job.data.id;
            const updateProductUnit = job.data.unit;
            const updateProductBrand = job.data.item_brand.name;
            const updateProductType = job.data.item_type.name;
            const updateProductItemTypeID = job.data.itemTypeID;
            const updateProductItemBrandID = job.data.itemBrandID;
            const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                itemID: updateProductID,
            });
            if (updateProduct) {
                updateProduct.reference = updateProductRreference;
                updateProduct.description = updateProductDescription;
                updateProduct.unit = updateProductUnit;
                updateProduct.itemTypeID = updateProductItemTypeID;
                updateProduct.itemBrandID = updateProductItemBrandID;
                yield updateProduct.save();
            }
            else {
                try {
                    yield mongo_product_model_1.mongoProductModel.create({
                        reference: updateProductRreference,
                        description: updateProductDescription,
                        itemID: updateProductID,
                        unit: updateProductUnit,
                        currentStock: 0,
                        itemTypeID: updateProductItemTypeID,
                        itemBrandID: updateProductItemBrandID,
                    });
                    yield meili.index("item").updateDocuments([
                        {
                            id: updateProductID,
                            reference: updateProductRreference,
                            description: updateProductDescription,
                            brand: updateProductBrand,
                            brandID: updateProductItemBrandID,
                            type: updateProductType,
                            typeID: updateProductItemTypeID,
                            is_active: true,
                        },
                    ]);
                }
                catch (error) {
                    yield mongo_error_model_1.mongoErrorModel.create({
                        date: new Date(),
                        error: error.toString(),
                        function: "update-product",
                        data: job.data,
                    });
                }
            }
            break;
        case "update-product-type":
            let updateProductTypeName = job.data.name;
            let updateProductTypeItemID = job.data.item;
            try {
                yield meili.index("product").updateDocuments(updateProductTypeItemID.map((x) => {
                    return {
                        id: x.id,
                        type: updateProductTypeName,
                    };
                }));
            }
            catch (error) {
                yield mongo_error_model_1.mongoErrorModel.create({
                    date: new Date(),
                    errror: error.toString(),
                    function: "update-product-type",
                    data: job.data,
                });
            }
            break;
        case "create-product-package":
            const createProductPackageID = job.data.id;
            const createProductPackageName = job.data.name;
            const createProductPackageDescription = job.data.description;
            const createProductPackagePackageContent = job.data
                .package_content;
            try {
                yield meili.index("package").addDocuments([
                    {
                        id: createProductPackageID,
                        name: createProductPackageName,
                        description: createProductPackageDescription,
                        product_content: createProductPackagePackageContent.map((y) => {
                            return {
                                quantity: y.quantity,
                                item: {
                                    reference: y.item.reference,
                                    description: y.item.description,
                                    unit: y.item.unit,
                                },
                                item_unit: y.item_unit == null
                                    ? null
                                    : {
                                        unit: y.item_unit.unit,
                                        conversion: y.item_unit.conversion,
                                    },
                            };
                        }),
                    },
                ], {
                    primaryKey: "id",
                });
            }
            catch (error) {
                yield mongo_error_model_1.mongoErrorModel.create({
                    date: new Date(),
                    error: error.toString(),
                    function: "create-package",
                    data: job.data,
                });
            }
            break;
        case "update-product-package":
            const updateProductPackageID = job.data.id;
            const updateProductPackageName = job.data.name;
            const updateProductPackageDescription = job.data.description;
            try {
                yield meili.index("package").updateDocuments([
                    {
                        id: updateProductPackageID,
                        name: updateProductPackageName,
                        description: updateProductPackageDescription,
                    },
                ], {
                    primaryKey: "id",
                });
            }
            catch (error) {
                yield mongo_error_model_1.mongoErrorModel.create({
                    date: new Date(),
                    error: error.toString(),
                    function: "update-package",
                    data: job.data,
                });
            }
            break;
        case "delete-good-receipt":
            const goodReceiptID = job.data.id;
            const deleteGoodReceiptItems = job.data.items;
            const deleteGoodReceiptStockInIds = yield mongo_stock_in_model_1.mongoStockInModel.find({
                goodReceiptCodeID: goodReceiptID,
            });
            // Move the stock out that depends on the good receipt to overflow
            const stockOut = yield mongo_stock_in_model_1.mongoStockOutModel.find({
                goodReceiptCodeID: goodReceiptID,
            });
            for (let i = 0; i < stockOut.length; i++) {
                const stockOutItem = stockOut[i];
                yield mongo_overflow_model_1.mongoOverflowModel.create({
                    itemID: stockOutItem.itemID,
                    date: stockOutItem.date,
                    quantity: stockOutItem.quantity,
                    billID: stockOutItem.billID,
                    billCodeID: stockOutItem.billCodeID,
                    adjustmentCaseID: stockOutItem.adjustmentCaseID,
                    adjustmentCaseCodeID: stockOutItem.adjustmentCaseCodeID,
                    value: stockOutItem.value,
                });
            }
            // Delete the stock out
            yield mongo_stock_in_model_1.mongoStockOutModel.deleteMany({
                stockInID: {
                    $in: deleteGoodReceiptStockInIds,
                },
            });
            // Delete the stock in
            yield mongo_stock_in_model_1.mongoStockInModel.deleteMany({
                goodReceiptCodeID: goodReceiptID,
            });
            // Delete stock card
            yield mongo_stock_card_model_1.mongoStockCardModel.deleteMany({
                goodReceiptCodeID: goodReceiptID,
            });
            // Update product current stock
            for (let i = 0; i < deleteGoodReceiptItems.length; i++) {
                const quantity = deleteGoodReceiptItems[i].quantity;
                const itemID = deleteGoodReceiptItems[i].item_id;
                const product = yield mongo_product_model_1.mongoProductModel.findOne({
                    itemID: itemID,
                });
                if (!product) {
                    throw new Error("Product not found");
                }
                product.currentStock -= quantity;
                yield product.save();
            }
            break;
        case "rearrange-stock-card":
            const productID = job.data;
            const rearrangeStockCards = yield mongo_stock_card_model_1.mongoStockCardModel
                .find({
                itemID: productID,
            })
                .sort({ date: 1 });
            // Rearrage the stock card
            let currentStock = 0;
            for (let i = 0; i < rearrangeStockCards.length; i++) {
                currentStock += rearrangeStockCards[i].quantity;
                rearrangeStockCards[i].currentStock = currentStock;
                yield rearrangeStockCards[i].save();
            }
            break;
        case "check-overflow":
            const jobID = job.data;
            const overflow = yield mongo_overflow_model_1.mongoOverflowModel
                .find({
                itemID: jobID,
            })
                .sort({
                date: 1,
            });
            if (overflow.length == 0) {
                // Nothing to do here
                return;
            }
            else {
                for (let i = 0; i < overflow.length; i++) {
                    const overflowItem = overflow[i];
                    let overflowQuantity = overflowItem.quantity;
                    while (overflowQuantity > 0) {
                        if (overflowQuantity == 0) {
                            break;
                        }
                        const stockIn = yield mongo_stock_in_model_1.mongoStockInModel
                            .findOne({
                            itemID: overflowItem.itemID,
                            residue: { $gt: 0 },
                        })
                            .sort({
                            date: 1,
                        });
                        if (!stockIn) {
                            // Save the overflow residue
                            overflowItem.quantity = overflowQuantity;
                            yield overflowItem.save();
                            break;
                        }
                        else {
                            if (stockIn.residue > overflowItem.quantity) {
                                stockIn.residue = stockIn.residue - overflowItem.quantity;
                                yield stockIn.save();
                                yield mongo_stock_in_model_1.mongoStockOutModel.create({
                                    adjustmentCaseID: overflowItem.adjustmentCaseID,
                                    adjustmentCaseCodeID: overflowItem.adjustmentCaseCodeID,
                                    billID: overflowItem.billID,
                                    billCodeID: overflowItem.billCodeID,
                                    date: overflowItem.date,
                                    value: overflowItem.value,
                                    quantity: overflowQuantity,
                                    itemID: overflowItem.itemID,
                                    stockInID: stockIn._id,
                                });
                                yield mongo_overflow_model_1.mongoOverflowModel.findByIdAndDelete(overflowItem._id);
                                overflowQuantity = 0;
                                break;
                            }
                            else {
                                overflowItem.quantity = overflowItem.quantity - stockIn.residue;
                                yield mongo_stock_in_model_1.mongoStockOutModel.create({
                                    adjustmentCaseID: overflowItem.adjustmentCaseID,
                                    adjustmentCaseCodeID: overflowItem.adjustmentCaseCodeID,
                                    billID: overflowItem.billID,
                                    billCodeID: overflowItem.billCodeID,
                                    date: overflowItem.date,
                                    value: overflowItem.value,
                                    quantity: overflowQuantity,
                                    itemID: overflowItem.itemID,
                                    stockInID: stockIn._id,
                                });
                                stockIn.residue = 0;
                                yield stockIn.save();
                                overflowQuantity = overflowQuantity - stockIn.residue;
                            }
                        }
                    }
                }
            }
            break;
        case "check-all-overflow":
            const allOverflow = yield mongo_overflow_model_1.mongoOverflowModel.find({});
            for (let i = 0; i < allOverflow.length; i++) {
                const overflowItem = allOverflow[i];
                let overflowQuantity = overflowItem.quantity;
                while (overflowQuantity > 0) {
                    if (overflowQuantity == 0) {
                        break;
                    }
                    const stockIn = yield mongo_stock_in_model_1.mongoStockInModel
                        .findOne({
                        itemID: overflowItem.itemID,
                        residue: { $gt: 0 },
                    })
                        .sort({
                        date: 1,
                    });
                    if (!stockIn) {
                        // No quantity left in stock in
                        break;
                    }
                    else {
                        if (stockIn.residue > overflowItem.quantity) {
                            stockIn.residue = stockIn.residue - overflowItem.quantity;
                            yield stockIn.save();
                            yield mongo_stock_in_model_1.mongoStockOutModel.create({
                                adjustmentCaseID: overflowItem.adjustmentCaseID,
                                adjustmentCaseCodeID: overflowItem.adjustmentCaseCodeID,
                                billID: overflowItem.billID,
                                billCodeID: overflowItem.billCodeID,
                                date: overflowItem.date,
                                value: overflowItem.value,
                                quantity: overflowQuantity,
                                itemID: overflowItem.itemID,
                                stockInID: stockIn._id,
                            });
                            yield mongo_overflow_model_1.mongoOverflowModel.findByIdAndDelete(overflowItem._id);
                            overflowQuantity = 0;
                            break;
                        }
                        else {
                            overflowItem.quantity = overflowItem.quantity - stockIn.residue;
                            yield mongo_stock_in_model_1.mongoStockOutModel.create({
                                adjustmentCaseID: overflowItem.adjustmentCaseID,
                                adjustmentCaseCodeID: overflowItem.adjustmentCaseCodeID,
                                billID: overflowItem.billID,
                                billCodeID: overflowItem.billCodeID,
                                date: overflowItem.date,
                                value: overflowItem.value,
                                quantity: overflowQuantity,
                                itemID: overflowItem.itemID,
                                stockInID: stockIn._id,
                            });
                            stockIn.residue = 0;
                            yield stockIn.save();
                            overflowQuantity = overflowQuantity - stockIn.residue;
                        }
                    }
                }
            }
            break;
    }
});
connectToDatabase().then(() => {
    const worker = new bullmq_1.Worker("queue", workerHandler, workerOptions);
    worker.on("failed", (job, err) => {
        console.error(`[error]: ${job.id} has failed with ${err.message}`);
    });
    worker.on("completed", (job, _) => {
        console.log(`[info]: Job #${job.id} [${job.name}] has completed.`);
    });
    worker.on("error", (err) => __awaiter(void 0, void 0, void 0, function* () {
        yield mongo_error_model_1.mongoErrorModel.create({
            name: "worker",
            error: err,
            funnction: "worker",
            data: {},
        });
        console.error(`[error]: ${err.message}`);
    }));
    console.info("[info]: Worker started!");
});
//# sourceMappingURL=worker.js.map