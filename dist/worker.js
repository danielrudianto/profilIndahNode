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
const meili = new meilisearch_1.default({
    host: "http://localhost:7700",
    apiKey: "UTw9kRYvov_K4fd1mQnDFKpdcxXVevHPcVEPWWlTVSg",
});
const workerOptions = {
    connection: {
        host: "localhost",
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
        case "insert-product":
            console.log(job.data);
            const insertProductRreference = job.data.reference;
            const insertProductDescription = job.data.description;
            const insertProductID = job.data.id;
            const insertProductUnit = job.data.unit;
            const insertProductBrand = job.data.itemBrand;
            const insertProductType = job.data.itemType;
            const insertProductItemTypeID = job.data.itemTypeID;
            const insertProductItemBrandID = job.data.itemBrandID;
            yield mongo_product_model_1.mongoProductModel.create({
                reference: insertProductRreference,
                description: insertProductDescription,
                itemID: insertProductID,
                unit: insertProductUnit,
                currentStock: 0,
                itemTypeID: insertProductItemTypeID,
                itemBrandID: insertProductItemBrandID,
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
                yield mongo_product_model_1.mongoProductModel.create({
                    reference: updateProductRreference,
                    description: updateProductDescription,
                    itemID: updateProductID,
                    unit: updateProductUnit,
                    currentStock: 0,
                    itemTypeID: updateProductItemTypeID,
                    itemBrandID: updateProductItemBrandID,
                });
            }
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
            break;
        case "update-product-type":
            let updateProductTypeName = job.data.name;
            let updateProductTypeItemID = job.data.item;
            yield meili.index("product").updateDocuments(updateProductTypeItemID.map((x) => {
                return {
                    id: x.id,
                    type: updateProductTypeName,
                };
            }));
            break;
        case "create-product-package":
            const createProductPackageID = job.data.id;
            const createProductPackageName = job.data.name;
            const createProductPackageDescription = job.data.description;
            const createProductPackagePackageContent = job.data
                .package_content;
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
            break;
        case "update-product-package":
            const updateProductPackageID = job.data.id;
            const updateProductPackageName = job.data.name;
            const updateProductPackageDescription = job.data.description;
            yield meili.index("package").updateDocuments([
                {
                    id: updateProductPackageID,
                    name: updateProductPackageName,
                    description: updateProductPackageDescription,
                },
            ], {
                primaryKey: "id",
            });
        case "create-adjustment-case":
            const createAdjustmentCaseID = job.data.id;
            const createAdjustmentCaseCreatedAt = job.data.created_at;
            const createAdjustmentCaseName = job.data.name;
            const createAdjustmentCaseDate = job.data.date;
            const createAdjustmentEventItems = job.data.adjustment_case;
            const createAdjustmentEventCompanyID = job.data.company_id;
            for (let i = 0; i < createAdjustmentEventItems.length; i++) {
                const createAdjustmentEventItem = createAdjustmentEventItems[i];
                const createAdjustmentEventItemID = createAdjustmentEventItem.item.id;
                const createAdjustmentEventItemQuantity = parseFloat(createAdjustmentEventItem.quantity.toString());
                const createAdjustmentEventItemConversion = createAdjustmentEventItem.item_unit == null
                    ? 1
                    : createAdjustmentEventItem.item_unit.conversion;
                const createAdjustmentEventItemUnit = createAdjustmentEventItem.item_unit == null
                    ? createAdjustmentEventItem.item.unit
                    : createAdjustmentEventItem.item_unit.unit;
                const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                    itemID: createAdjustmentEventItemID,
                });
                if (updateProduct) {
                    updateProduct.currentStock =
                        updateProduct.currentStock +
                            createAdjustmentEventItemQuantity *
                                createAdjustmentEventItemConversion;
                    updateProduct.stockCard.unshift({
                        createdAt: createAdjustmentCaseCreatedAt,
                        date: createAdjustmentCaseDate,
                        document: createAdjustmentCaseName,
                        opponent: "Internal",
                        displayQuantity: createAdjustmentEventItemQuantity,
                        quantity: createAdjustmentEventItemQuantity *
                            createAdjustmentEventItemConversion,
                        unit: createAdjustmentEventItemUnit,
                        currentStock: 0,
                        billID: null,
                        billCodeID: null,
                        adjustmentCaseID: createAdjustmentEventItem.id,
                        adjustmentCaseCodeID: createAdjustmentCaseID,
                        goodReceiptID: null,
                        goodReceiptCodeID: null,
                        salesReturnID: null,
                        salesReturnCodeID: null,
                    });
                    yield updateProduct.save();
                    yield queue_helper_1.queue.add("rearrage-stock-card", updateProduct.itemID);
                }
                if (createAdjustmentEventItemQuantity > 0) {
                    // insert to stock card
                    yield mongo_stock_in_model_1.mongoStockInModel.create({
                        companyID: createAdjustmentEventCompanyID,
                        adjustmentCaseID: createAdjustmentEventItem.id,
                        adjustmentCaseCodeID: createAdjustmentCaseID,
                        goodReceiptCodeID: null,
                        goodReceiptID: null,
                        date: createAdjustmentCaseDate,
                        price: 0,
                        quantity: createAdjustmentEventItemQuantity *
                            createAdjustmentEventItemConversion,
                        residue: createAdjustmentEventItemQuantity *
                            createAdjustmentEventItemConversion,
                        itemID: createAdjustmentEventItemID,
                        stockOut: [],
                    });
                }
                else {
                    let quantity = createAdjustmentEventItemQuantity * -1;
                    while (quantity > 0) {
                        if (quantity == 0) {
                            break;
                        }
                        const stockIn = yield mongo_stock_in_model_1.mongoStockInModel
                            .findOne({
                            itemID: createAdjustmentEventItemID,
                            residue: { $gt: 0 },
                        })
                            .sort({ date: 1 });
                        if (stockIn) {
                            const stockInResidue = stockIn.residue;
                            if (stockInResidue > quantity) {
                                stockIn.residue = stockInResidue - quantity;
                                stockIn.stockOut.unshift({
                                    adjustmentCaseID: createAdjustmentEventItem.id,
                                    adjustmentCaseCodeID: createAdjustmentCaseID,
                                    billID: null,
                                    billCodeID: null,
                                    date: createAdjustmentCaseDate,
                                    displayQuantity: quantity,
                                    quantity: quantity * createAdjustmentEventItemConversion,
                                    unit: createAdjustmentEventItemUnit,
                                });
                                quantity = 0;
                                yield stockIn.save();
                            }
                            else {
                                stockIn.stockOut.unshift({
                                    adjustmentCaseID: createAdjustmentEventItem.id,
                                    adjustmentCaseCodeID: createAdjustmentCaseID,
                                    billID: null,
                                    billCodeID: null,
                                    date: createAdjustmentCaseDate,
                                    displayQuantity: stockInResidue,
                                    quantity: stockInResidue * createAdjustmentEventItemConversion,
                                    unit: createAdjustmentEventItemUnit,
                                });
                                quantity -= stockInResidue;
                                stockIn.residue = 0;
                                yield stockIn.save();
                            }
                        }
                        else {
                            yield mongo_overflow_model_1.mongoOverflowModel.create({
                                itemID: createAdjustmentEventItemID,
                                date: createAdjustmentCaseDate,
                                quantity: quantity * createAdjustmentEventItemConversion,
                                billID: null,
                                billCodeID: null,
                                adjustmentCaseID: createAdjustmentEventItem.id,
                                adjustmentCaseCodeID: createAdjustmentCaseID,
                                value: 0,
                            });
                            quantity = 0;
                        }
                    }
                }
            }
            break;
        case "delete-adjustment-case":
            const deleteAdjustmentCaseID = job.data.id;
            const deleteAdjustmentEventItems = job.data.adjustment_case;
            for (let i = 0; i < deleteAdjustmentEventItems.length; i++) {
                const id = deleteAdjustmentEventItems[i].id;
                const quantity = deleteAdjustmentEventItems[i].quantity;
                const itemID = deleteAdjustmentEventItems[i].item.id;
                const conversion = deleteAdjustmentEventItems[i].item_unit == null
                    ? 1
                    : deleteAdjustmentEventItems[i].item_unit.conversion;
                const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                    itemID: itemID,
                });
                if (updateProduct) {
                    updateProduct.currentStock =
                        updateProduct.currentStock - quantity * conversion;
                    const stockCardIndex = updateProduct.stockCard.findIndex((x) => {
                        return x.adjustmentCaseID == id;
                    });
                    if (stockCardIndex != -1) {
                        updateProduct.stockCard.splice(stockCardIndex, 1);
                    }
                    yield updateProduct.save();
                    yield queue_helper_1.queue.add("rearrage-stock-card", updateProduct.itemID);
                }
                if (quantity > 0) {
                    // Found event
                    // Remove from stock in
                    const stockIn = yield mongo_stock_in_model_1.mongoStockInModel.findOne({
                        itemID: itemID,
                        adjustmentCaseID: id,
                    });
                    if (stockIn) {
                        yield mongo_overflow_model_1.mongoOverflowModel.create(stockIn.stockOut.map((x) => {
                            return {
                                itemID: itemID,
                                date: x.date,
                                quantity: x.quantity,
                                billID: null,
                                billCodeID: null,
                                adjustmentCaseID: id,
                                adjustmentCaseCodeID: deleteAdjustmentCaseID,
                                value: x.value,
                            };
                        }));
                        yield mongo_stock_in_model_1.mongoStockInModel.findOneAndDelete({
                            itemID: itemID,
                            adjustmentCaseID: id,
                        });
                    }
                }
                else {
                    // Lost event
                    // If exist in overflow, remove from overflow
                    const overflow = yield mongo_overflow_model_1.mongoOverflowModel.findOne({
                        itemID: itemID,
                        adjustmentCaseID: id,
                    });
                    if (overflow) {
                        yield mongo_overflow_model_1.mongoOverflowModel.findOneAndDelete({
                            itemID: itemID,
                            adjustmentCaseID: id,
                        });
                    }
                    // If exist in stock out, remove from stock out
                    const stockIns = yield mongo_stock_in_model_1.mongoStockInModel.aggregate([
                        {
                            $match: {
                                itemID: itemID,
                                "stockOut.adjustmentCaseID": id,
                            },
                        },
                    ]);
                    for (let i = 0; i < stockIns.length; i++) {
                        const stockIn = stockIns[i];
                        const stockOutIndex = stockIn.stockOut.findIndex((x) => {
                            return x.adjustmentCaseID == id;
                        });
                        if (stockOutIndex != -1) {
                            stockIn.stockOut.splice(stockOutIndex, 1);
                            stockIn.residue = stockIn.residue + quantity * conversion;
                            yield stockIn.save();
                        }
                    }
                }
            }
            break;
        case "create-good-receipt":
            const createGoodReceiptID = job.data.id;
            const createGoodReceiptCreatedAt = job.data.created_at;
            const createGoodReceiptName = job.data.name;
            const createGoodReceiptDate = job.data.date;
            const createGoodReceiptItems = job.data.good_receipt;
            const createGoodReceiptCompanyID = job.data.company_id;
            const createGoodReceiptSupplier = job.data.supplier;
            for (let i = 0; i < createGoodReceiptItems.length; i++) {
                const createGoodReceiptItem = createGoodReceiptItems[i];
                console.log(createGoodReceiptItem);
                const createGoodReceiptItemID = createGoodReceiptItem.item.id;
                const createGoodReceiptItemQuantity = parseFloat(createGoodReceiptItem.quantity.toString());
                const createGoodReceiptItemPrice = parseFloat(createGoodReceiptItem.price.toString());
                const createGoodReceiptItemDiscount = parseFloat(createGoodReceiptItem.discount.toString());
                const CreateGoodReceiptItemConversion = createGoodReceiptItem.item_unit == null
                    ? 1
                    : createGoodReceiptItem.item_unit.conversion;
                const createGoodReceiptItemUnit = createGoodReceiptItem.item_unit == null
                    ? createGoodReceiptItem.item.unit
                    : createGoodReceiptItem.item_unit.unit;
                const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                    itemID: createGoodReceiptItemID,
                });
                if (updateProduct) {
                    updateProduct.currentStock +=
                        createGoodReceiptItemQuantity * CreateGoodReceiptItemConversion;
                    updateProduct.stockCard.unshift({
                        createdAt: createGoodReceiptCreatedAt,
                        date: createGoodReceiptDate,
                        document: createGoodReceiptName,
                        opponent: createGoodReceiptSupplier.name,
                        displayQuantity: createGoodReceiptItemQuantity,
                        quantity: createGoodReceiptItemQuantity * CreateGoodReceiptItemConversion,
                        unit: createGoodReceiptItemUnit,
                        billID: null,
                        billCodeID: null,
                        adjustmentCaseID: null,
                        adjustmentCaseCodeID: null,
                        goodReceiptID: createGoodReceiptItem.id,
                        goodReceiptCodeID: createGoodReceiptID,
                        salesReturnID: null,
                        salesReturnCodeID: null,
                    });
                    yield updateProduct.save();
                    yield queue_helper_1.queue.add("rearrage-stock-card", createGoodReceiptItemID);
                }
                yield mongo_stock_in_model_1.mongoStockInModel.create({
                    companyID: createGoodReceiptCompanyID,
                    adjustmentCaseID: null,
                    adjustmentCaseCodeID: null,
                    goodReceiptCodeID: createGoodReceiptID,
                    goodReceiptID: createGoodReceiptItem.id,
                    date: createGoodReceiptDate,
                    price: (createGoodReceiptItemPrice - createGoodReceiptItemDiscount) /
                        CreateGoodReceiptItemConversion,
                    quantity: createGoodReceiptItemQuantity * CreateGoodReceiptItemConversion,
                    residue: createGoodReceiptItemQuantity * CreateGoodReceiptItemConversion,
                    itemID: createGoodReceiptItemID,
                    stockOut: [],
                });
                yield queue_helper_1.queue.add("check-overflow", createGoodReceiptItemID);
            }
            break;
        case "create-purchase-invoice":
            const createPurchaseInvoiceID = job.data.id;
            const createPurchaseInvoiceCreatedAt = job.data.created_at;
            const createPurchaseInvoiceName = job.data.name;
            const createPurchaseInvoiceDate = job.data.date;
            const createPurchaseInvoiceItems = job.data.good_receipt;
            const createPurchaseInvoiceCompanyID = job.data.company_id;
            const createPurchaseInvoiceSupplier = job.data.supplier;
            const createPurchaseInvoiceDiscount = job.data.purchase_invoice.discount;
            const createPurchaseInvoiceTotalValue = createPurchaseInvoiceItems.reduce((a, b) => {
                return a + (b.price - b.discount) * b.quantity;
            }, 0);
            const createPurchaseInvoiceNetValue = createPurchaseInvoiceTotalValue - createPurchaseInvoiceDiscount;
            for (let i = 0; i < createPurchaseInvoiceItems.length; i++) {
                const createPurchaseInvoiceItem = createPurchaseInvoiceItems[i];
                const createPurchaseInvoiceItemID = createPurchaseInvoiceItem.item.id;
                const createPurchaseInvoiceItemQuantity = createPurchaseInvoiceItem.quantity;
                const createPurchaseInvoiceItemPrice = parseFloat(createPurchaseInvoiceItem.price.toString());
                const createPurchaseInvoiceItemDiscount = parseFloat(createPurchaseInvoiceItem.discount.toString());
                const createPurchaseInvoiceItemNetPrice = ((createPurchaseInvoiceItemPrice -
                    createPurchaseInvoiceItemDiscount) *
                    createPurchaseInvoiceNetValue) /
                    createPurchaseInvoiceTotalValue;
                const createPurchaseInvoiceItemConversion = createPurchaseInvoiceItem.item_unit == null
                    ? 1
                    : parseFloat(createPurchaseInvoiceItem.item_unit.conversion.toString());
                const createPurchaseInvoiceItemUnit = createPurchaseInvoiceItem.item_unit == null
                    ? createPurchaseInvoiceItem.item.unit
                    : createPurchaseInvoiceItem.item_unit.unit;
                const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                    itemID: createPurchaseInvoiceItemID,
                });
                if (updateProduct) {
                    updateProduct.currentStock =
                        updateProduct.currentStock +
                            createPurchaseInvoiceItemQuantity *
                                createPurchaseInvoiceItemConversion;
                    updateProduct.stockCard.unshift({
                        createdAt: createPurchaseInvoiceCreatedAt,
                        date: createPurchaseInvoiceDate,
                        document: createPurchaseInvoiceName,
                        opponent: createPurchaseInvoiceSupplier.name,
                        displayQuantity: createPurchaseInvoiceItemQuantity,
                        quantity: createPurchaseInvoiceItemQuantity *
                            createPurchaseInvoiceItemConversion,
                        unit: createPurchaseInvoiceItemUnit,
                        billID: null,
                        billCodeID: null,
                        adjustmentCaseID: null,
                        adjustmentCaseCodeID: null,
                        goodReceiptID: createPurchaseInvoiceItem.id,
                        goodReceiptCodeID: createPurchaseInvoiceID,
                        salesReturnID: null,
                        salesReturnCodeID: null,
                    });
                    yield updateProduct.save();
                    yield queue_helper_1.queue.add("rearrage-stock-card", updateProduct.itemID);
                }
                yield mongo_stock_in_model_1.mongoStockInModel.create({
                    companyID: createPurchaseInvoiceCompanyID,
                    adjustmentCaseID: null,
                    adjustmentCaseCodeID: null,
                    goodReceiptCodeID: createPurchaseInvoiceID,
                    goodReceiptID: createPurchaseInvoiceItem.id,
                    date: createPurchaseInvoiceDate,
                    price: createPurchaseInvoiceItemNetPrice /
                        createPurchaseInvoiceItemConversion,
                    quantity: createPurchaseInvoiceItemQuantity *
                        createPurchaseInvoiceItemConversion,
                    residue: createPurchaseInvoiceItemQuantity *
                        createPurchaseInvoiceItemConversion,
                    itemID: createPurchaseInvoiceItemID,
                    stockOut: [],
                });
                yield queue_helper_1.queue.add("check-overflow", createPurchaseInvoiceItemID);
            }
            break;
        case "confirm-purchase-invoice":
            const confirmPurchaseInvoiceGoodReceipts = job.data.good_receipt_code
                .good_receipt;
            const confirmPurchaseInvoiceDiscount = job.data.discount;
            let confirmPurchaseInvoiceTotal = confirmPurchaseInvoiceGoodReceipts.reduce((a, b) => {
                return a + (b.price - b.discount) * b.quantity;
            }, 0);
            const confirmPurchaseInvoiceNet = confirmPurchaseInvoiceTotal - confirmPurchaseInvoiceDiscount;
            console.log(confirmPurchaseInvoiceNet);
            // Distribute discount to each item
            for (let i = 0; i < confirmPurchaseInvoiceGoodReceipts.length; i++) {
                const confirmPurchaseInvoiceGoodReceipt = confirmPurchaseInvoiceGoodReceipts[i];
                const confirmPurchaseInvoiceGoodReceiptPrice = confirmPurchaseInvoiceGoodReceipt.price;
                const confirmPurchaseInvoiceGoodReceiptDiscount = confirmPurchaseInvoiceGoodReceipt.discount;
                const confirmPurchaseInvoiceGoodReceiptConversion = confirmPurchaseInvoiceGoodReceipt.item_unit == null
                    ? 1
                    : confirmPurchaseInvoiceGoodReceipt.item_unit.conversion;
                const confirmPurchaseInvoiceGoodReceiptNet = confirmPurchaseInvoiceTotal == 0
                    ? 0
                    : ((confirmPurchaseInvoiceGoodReceiptPrice -
                        confirmPurchaseInvoiceGoodReceiptDiscount) *
                        confirmPurchaseInvoiceNet) /
                        confirmPurchaseInvoiceTotal;
                const updateProduct = yield mongo_stock_in_model_1.mongoStockInModel.findOne({
                    goodReceiptID: confirmPurchaseInvoiceGoodReceipt.id,
                });
                if (updateProduct) {
                    updateProduct.price =
                        confirmPurchaseInvoiceGoodReceiptNet /
                            confirmPurchaseInvoiceGoodReceiptConversion;
                    yield updateProduct.save();
                }
            }
            break;
        case "delete-purchase-invoice":
            const deletePurchaseInvoiceItems = job.data.good_receipt;
            for (let i = 0; i < deletePurchaseInvoiceItems.length; i++) {
                const deletePurchaseInvoiceGoodReceiptID = deletePurchaseInvoiceItems[i].id;
                const deletePurchaseInvoiceItemID = deletePurchaseInvoiceItems[i].item.id;
                const deletePurchaseInvoiceItemQuantity = deletePurchaseInvoiceItems[i].quantity;
                const deletePurchaseInvoiceItemConversion = deletePurchaseInvoiceItems[i].item_unit == null
                    ? 1
                    : deletePurchaseInvoiceItems[i].item_unit.conversion;
                const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                    itemID: deletePurchaseInvoiceItemID,
                });
                if (updateProduct) {
                    updateProduct.currentStock =
                        updateProduct.currentStock -
                            deletePurchaseInvoiceItemQuantity *
                                deletePurchaseInvoiceItemConversion;
                    const stockCardIndex = updateProduct.stockCard.findIndex((x) => x.goodReceiptID == deletePurchaseInvoiceGoodReceiptID);
                    if (stockCardIndex != -1) {
                        updateProduct.stockCard.splice(stockCardIndex, 1);
                    }
                    yield updateProduct.save();
                    yield queue_helper_1.queue.add("rearrage-stock-card", deletePurchaseInvoiceItemID);
                }
                const stockIn = yield mongo_stock_in_model_1.mongoStockInModel.findOne({
                    goodReceiptID: deletePurchaseInvoiceGoodReceiptID,
                });
                if (stockIn) {
                    // Move the stock out to overflow
                    yield mongo_overflow_model_1.mongoOverflowModel.create(stockIn.stockOut.map((x) => {
                        return {
                            itemID: deletePurchaseInvoiceItemID,
                            date: x.date,
                            quantity: x.quantity,
                            billID: x.billID,
                            billCodeID: x.billCodeID,
                            adjustmentCaseID: x.adjustmentCaseID,
                            adjustmentCaseCodeID: x.adjustmentCaseCodeID,
                            value: x.value,
                        };
                    }));
                    yield queue_helper_1.queue.add("check-overflow", deletePurchaseInvoiceItemID);
                    // Remove the stock in
                    yield mongo_stock_in_model_1.mongoStockInModel.deleteOne({
                        goodReceiptID: deletePurchaseInvoiceGoodReceiptID,
                    });
                }
            }
            break;
        case "update-purchase-invoice":
            console.log(job.data);
            const updatePurchaseInvoiceID = job.data.good_receipt_code.id;
            const updatePurchaseInvoiceDiscount = job.data.discount;
            const updatePurchaseInvoiceGoodReceipts = job.data.good_receipt_code
                .good_receipt;
            let updatePurchaseInvoiceTotal = updatePurchaseInvoiceGoodReceipts.reduce((a, b) => {
                return a + (b.price - b.discount) * b.quantity;
            }, 0);
            const updatePurchaseInvoiceName = job.data.good_receipt_code.name;
            const updatePurchaseInvoiceCompanyID = job.data.good_receipt_code.company_id;
            const updatePurchaseInvoiceDate = job.data.good_receipt_code.date;
            const updatePurchaseInvoiceSupplier = job.data.good_receipt_code.supplier;
            const updatePurchaseInvoiceCreatedAt = job.data.good_receipt_code.created_at;
            const updatePurchaseInvoiceNet = updatePurchaseInvoiceTotal - updatePurchaseInvoiceDiscount;
            // Distribute discount to each item
            for (let i = 0; i < updatePurchaseInvoiceGoodReceipts.length; i++) {
                const updatePurchaseInvoiceGoodReceipt = updatePurchaseInvoiceGoodReceipts[i];
                const updatePurchaseInvoiceGoodReceiptPrice = parseFloat(updatePurchaseInvoiceGoodReceipt.price.toString());
                const updatePurchaseInvoiceGoodReceiptDiscount = parseFloat(updatePurchaseInvoiceGoodReceipt.discount.toString());
                const updatePurchaseInvoiceGoodReceiptUnit = updatePurchaseInvoiceGoodReceipt.item_unit == null
                    ? updatePurchaseInvoiceGoodReceipt.item.unit
                    : updatePurchaseInvoiceGoodReceipt.item_unit.unit;
                const updatePurchaseInvoiceGoodReceiptConversion = updatePurchaseInvoiceGoodReceipt.item_unit == null
                    ? 1
                    : updatePurchaseInvoiceGoodReceipt.item_unit.conversion;
                const updatePurchaseInvoiceGoodReceiptItemID = updatePurchaseInvoiceGoodReceipt.item.id;
                const updatePurchaseInvoiceGoodReceiptNet = updatePurchaseInvoiceTotal == 0
                    ? 0
                    : ((updatePurchaseInvoiceGoodReceiptPrice -
                        updatePurchaseInvoiceGoodReceiptDiscount) *
                        updatePurchaseInvoiceNet) /
                        updatePurchaseInvoiceTotal;
                const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                    itemID: updatePurchaseInvoiceGoodReceiptItemID,
                });
                if (updateProduct) {
                    updateProduct.currentStock +=
                        updatePurchaseInvoiceGoodReceipt.quantity *
                            updatePurchaseInvoiceGoodReceiptConversion;
                    updateProduct.stockCard.unshift({
                        createdAt: updatePurchaseInvoiceCreatedAt,
                        date: updatePurchaseInvoiceDate,
                        document: updatePurchaseInvoiceName,
                        opponent: updatePurchaseInvoiceSupplier.name,
                        displayQuantity: updatePurchaseInvoiceGoodReceipt.quantity,
                        quantity: updatePurchaseInvoiceGoodReceipt.quantity *
                            updatePurchaseInvoiceGoodReceiptConversion,
                        unit: updatePurchaseInvoiceGoodReceiptUnit,
                        billID: null,
                        billCodeID: null,
                        adjustmentCaseID: null,
                        adjustmentCaseCodeID: null,
                        goodReceiptID: updatePurchaseInvoiceGoodReceipt.id,
                        goodReceiptCodeID: updatePurchaseInvoiceID,
                        salesReturnID: null,
                        salesReturnCodeID: null,
                    });
                    yield updateProduct.save();
                    queue_helper_1.queue.add("rearrage-stock-card", updatePurchaseInvoiceGoodReceiptItemID);
                }
                yield mongo_stock_in_model_1.mongoStockInModel.create({
                    companyID: updatePurchaseInvoiceCompanyID,
                    adjustmentCaseID: null,
                    adjustmentCaseCodeID: null,
                    goodReceiptCodeID: updatePurchaseInvoiceID,
                    goodReceiptID: updatePurchaseInvoiceGoodReceipt.id,
                    date: updatePurchaseInvoiceDate,
                    price: updatePurchaseInvoiceGoodReceiptNet,
                    quantity: updatePurchaseInvoiceGoodReceipt.quantity *
                        updatePurchaseInvoiceGoodReceiptConversion,
                    residue: updatePurchaseInvoiceGoodReceipt.quantity *
                        updatePurchaseInvoiceGoodReceiptConversion,
                    itemID: updatePurchaseInvoiceGoodReceiptItemID,
                    stockOut: [],
                });
                yield queue_helper_1.queue.add("check-overflow", updatePurchaseInvoiceGoodReceiptItemID);
            }
            break;
        case "create-sales-return":
            const createSalesReturnDate = new Date(job.data.date);
            const createSalesReturnID = job.data.id;
            const createSalesReturnName = job.data.name;
            const createSalesReturnCreatedAt = job.data.created_at;
            const createSalesReturnItems = job.data.sales_return;
            for (let i = 0; i < createSalesReturnItems.length; i++) {
                const createSalesReturnItemID = createSalesReturnItems[i].id;
                const createSalesReturnBill = createSalesReturnItems[i].bill;
                const createSalesReturnBillID = createSalesReturnBill.id;
                const createSalesReturnCustomer = createSalesReturnBill.bill_code.customer == null
                    ? "Retail customer"
                    : createSalesReturnBill.bill_code.customer.name;
                const createSalesReturnItemQuantity = parseFloat(createSalesReturnItems[i].quantity.toString());
                if (createSalesReturnBill.package_code != null) {
                    for (let n = 0; n < createSalesReturnBill.package_code.package_content.length; n++) {
                        const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                            itemID: createSalesReturnBill.package_code.package_content[n].item.id,
                        });
                        const createSalesReturnItem = createSalesReturnBill.package_code.package_content[n];
                        let createSalesReturnItemQuantityEdit = createSalesReturnItemQuantity *
                            (createSalesReturnItem.item_unit == null
                                ? 1
                                : createSalesReturnItem.item_unit.conversion);
                        if (!updateProduct) {
                            throw Error("Product not found");
                        }
                        updateProduct.stockCard.unshift({
                            createdAt: createSalesReturnCreatedAt,
                            date: createSalesReturnDate,
                            document: createSalesReturnName,
                            opponent: createSalesReturnCustomer,
                            displayQuantity: createSalesReturnItemQuantity * createSalesReturnItem.quantity,
                            quantity: createSalesReturnItemQuantityEdit,
                            unit: createSalesReturnItem.item_unit == null
                                ? createSalesReturnItem.item.unit
                                : createSalesReturnItem.item_unit.unit,
                            currentStock: 0,
                            billID: createSalesReturnBill.id,
                            billCodeID: createSalesReturnBill.bill_code.id,
                            adjustmentCaseID: null,
                            adjustmentCaseCodeID: null,
                            goodReceiptID: null,
                            goodReceiptCodeID: null,
                            salesReturnID: createSalesReturnItemID,
                            salesReturnCodeID: createSalesReturnID,
                        });
                        updateProduct.currentStock += createSalesReturnItemQuantityEdit;
                        yield updateProduct.save();
                        yield queue_helper_1.queue.add("rearange-stock-card", updateProduct.itemID);
                        while (createSalesReturnItemQuantityEdit > 0) {
                            if (createSalesReturnItemQuantityEdit == 0) {
                                break;
                            }
                            const stockIns = yield mongo_stock_in_model_1.mongoStockInModel
                                .findOne({
                                stockOut: {
                                    $elemMatch: {
                                        itemID: createSalesReturnItem.item.id,
                                        billID: createSalesReturnBillID,
                                        quantity: {
                                            $gt: 0,
                                        },
                                    },
                                },
                            })
                                .sort({
                                date: -1,
                            });
                            if (!stockIns) {
                                throw Error("Stock in not found");
                            }
                            const stockOutIndex = stockIns.stockOut.findIndex((stockOut) => stockOut.billID == createSalesReturnBillID);
                            if (stockOutIndex == -1) {
                                throw Error("Stock out not found");
                            }
                            if (createSalesReturnItemQuantityEdit >
                                stockIns.stockOut[stockOutIndex].quantity) {
                                stockIns.stockOut[stockOutIndex].quantity = 0;
                                stockIns.residue += createSalesReturnItemQuantityEdit;
                                createSalesReturnItemQuantityEdit -=
                                    stockIns.stockOut[stockOutIndex].quantity;
                                yield stockIns.save();
                            }
                            else {
                                stockIns.stockOut[stockOutIndex].quantity -=
                                    createSalesReturnItemQuantityEdit;
                                stockIns.residue += createSalesReturnItemQuantityEdit;
                                createSalesReturnItemQuantityEdit = 0;
                                yield stockIns.save();
                            }
                        }
                    }
                }
                else {
                    const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                        itemID: createSalesReturnBill.item.id,
                    });
                    if (!updateProduct) {
                        throw Error("Product not found");
                    }
                    updateProduct.stockCard.unshift({
                        createdAt: createSalesReturnCreatedAt,
                        date: createSalesReturnDate,
                        document: createSalesReturnName,
                        opponent: createSalesReturnCustomer,
                        displayQuantity: createSalesReturnItemQuantity,
                        quantity: createSalesReturnItemQuantity *
                            (createSalesReturnBill.item_unit == null
                                ? 1
                                : createSalesReturnBill.item_unit.conversion),
                        unit: createSalesReturnBill.item_unit == null
                            ? createSalesReturnBill.item.unit
                            : createSalesReturnBill.item_unit.unit,
                        currentStock: 0,
                        billID: createSalesReturnBill.id,
                        billCodeID: createSalesReturnBill.bill_code.id,
                        adjustmentCaseID: null,
                        adjustmentCaseCodeID: null,
                        goodReceiptID: null,
                        goodReceiptCodeID: null,
                        salesReturnID: createSalesReturnItemID,
                        salesReturnCodeID: createSalesReturnID,
                    });
                    updateProduct.currentStock +=
                        createSalesReturnItemQuantity *
                            (createSalesReturnBill.item_unit == null
                                ? 1
                                : createSalesReturnBill.item_unit.conversion);
                    yield updateProduct.save();
                    let createSalesReturnItemQuantityEdit = createSalesReturnItemQuantity;
                    while (createSalesReturnItemQuantityEdit > 0) {
                        console.log(`Current quantity: ${createSalesReturnItemQuantityEdit}`);
                        if (createSalesReturnItemQuantityEdit == 0) {
                            break;
                        }
                        // First, fetch the overflow stock in
                        const overflow = yield mongo_overflow_model_1.mongoOverflowModel.findOne({
                            itemID: createSalesReturnBill.item.id,
                            billID: createSalesReturnBillID,
                        });
                        if (overflow) {
                            if (overflow.quantity > createSalesReturnItemQuantityEdit) {
                                overflow.quantity -= createSalesReturnItemQuantityEdit;
                                createSalesReturnItemQuantityEdit = 0;
                                yield overflow.save();
                            }
                            else {
                                createSalesReturnItemQuantityEdit -= overflow.quantity;
                                // Delete the overflow
                                yield mongo_overflow_model_1.mongoOverflowModel.deleteOne({
                                    itemID: createSalesReturnBill.item.id,
                                    billID: createSalesReturnBillID,
                                });
                            }
                        }
                        else {
                            const stockIns = yield mongo_stock_in_model_1.mongoStockInModel
                                .findOne({
                                stockOut: {
                                    $elemMatch: {
                                        billID: createSalesReturnBillID,
                                        quantity: {
                                            $gt: 0,
                                        },
                                    },
                                },
                            })
                                .sort({
                                date: -1,
                            });
                            if (!stockIns) {
                                throw Error("Stock in not found");
                            }
                            console.log(`[info]: Stock in found.`);
                            const stockOutIndex = stockIns.stockOut.findIndex((stockOut) => stockOut.billID == createSalesReturnBillID);
                            if (stockOutIndex == -1) {
                                throw Error("Stock out not found");
                            }
                            console.log(`[info]: Stock out found.`);
                            if (createSalesReturnItemQuantityEdit >
                                stockIns.stockOut[stockOutIndex].quantity) {
                                stockIns.stockOut[stockOutIndex].quantity = 0;
                                stockIns.residue += createSalesReturnItemQuantityEdit;
                                createSalesReturnItemQuantityEdit -=
                                    stockIns.stockOut[stockOutIndex].quantity;
                                yield stockIns.save();
                            }
                            else {
                                stockIns.stockOut[stockOutIndex].quantity -=
                                    createSalesReturnItemQuantityEdit;
                                stockIns.residue += createSalesReturnItemQuantityEdit;
                                createSalesReturnItemQuantityEdit = 0;
                                yield stockIns.save();
                                break;
                            }
                        }
                    }
                }
            }
            break;
        case "delete-sales-return":
            const deleteSalesReturnItems = job.data.sales_return;
            for (let i = 0; i < deleteSalesReturnItems.length; i++) {
                // We need to delete every stock card that has sales return id
                const deleteSalesReturnItemID = deleteSalesReturnItems[i].id;
                const deleteSalesReturnItem = deleteSalesReturnItems[i];
                const deleteSalesReturnItemQuantity = parseFloat(deleteSalesReturnItem.quantity.toString());
                if (deleteSalesReturnItem.bill.package_code != null) {
                    for (let n = 0; n < deleteSalesReturnItem.bill.package_code.package_content.length; n++) {
                        const deleteSalesReturnItemItemID = deleteSalesReturnItem.bill.package_code.package_content[n].item
                            .id;
                        const deleteSalesReturnItemItemQuantity = parseFloat(deleteSalesReturnItem.bill.package_code.package_content[n].quantity.toString()) *
                            (deleteSalesReturnItem.bill.package_content[n].item_unit == null
                                ? 1
                                : parseFloat(deleteSalesReturnItem.bill.package_content[n].item_unit.conversion.toString())) *
                            deleteSalesReturnItemQuantity;
                        yield mongo_product_model_1.mongoProductModel.findOneAndUpdate({
                            itemID: deleteSalesReturnItemItemID,
                        }, {
                            $pull: {
                                stockCard: {
                                    salesReturnID: deleteSalesReturnItemID,
                                },
                            },
                            $inc: {
                                currentStock: deleteSalesReturnItemItemQuantity * -1,
                            },
                        });
                        yield queue_helper_1.queue.add("rearange-stock-card", deleteSalesReturnItemID);
                        const stockIn = yield mongo_stock_in_model_1.mongoStockInModel.findOne({
                            itemID: deleteSalesReturnItemItemID,
                            stockOut: {
                                $elemMatch: {
                                    billID: deleteSalesReturnItem.bill.id,
                                },
                            },
                        });
                        if (!stockIn) {
                            throw Error("Stock in not found");
                        }
                        const stockOutIndex = stockIn.stockOut.findIndex((stockOut) => stockOut.billID == deleteSalesReturnItem.bill.id);
                        if (stockOutIndex == -1) {
                            throw Error("Stock out not found");
                        }
                        yield mongo_overflow_model_1.mongoOverflowModel.create({
                            itemID: deleteSalesReturnItemItemID,
                            quantity: deleteSalesReturnItemItemQuantity,
                            date: new Date(),
                            billID: deleteSalesReturnItem.bill.id,
                            billCodeID: deleteSalesReturnItem.bill.bill_code.id,
                            adjustmentCaseID: null,
                            adjustmentCaseCodeID: null,
                            value: stockIn.stockOut[stockOutIndex].value,
                        });
                        yield queue_helper_1.queue.add("check-overflow", deleteSalesReturnItemItemID);
                    }
                }
                else {
                    console.log(deleteSalesReturnItem);
                    yield mongo_product_model_1.mongoProductModel.findOneAndUpdate({
                        itemID: deleteSalesReturnItem.bill.item.id,
                    }, {
                        $pull: {
                            stockCard: {
                                salesReturnID: deleteSalesReturnItemID,
                            },
                        },
                        $inc: {
                            currentStock: deleteSalesReturnItemQuantity * -1,
                        },
                    });
                    yield queue_helper_1.queue.add("rearange-stock-card", deleteSalesReturnItem.bill.item.id);
                    const stockIn = yield mongo_stock_in_model_1.mongoStockInModel.findOne({
                        itemID: deleteSalesReturnItem.bill.item.id,
                        stockOut: {
                            $elemMatch: {
                                billID: deleteSalesReturnItem.bill.id,
                            },
                        },
                    });
                    if (!stockIn) {
                        throw Error("Stock in not found");
                    }
                    const stockOutIndex = stockIn.stockOut.findIndex((stockOut) => stockOut.billID == deleteSalesReturnItem.bill.id);
                    if (stockOutIndex == -1) {
                        throw Error("Stock out not found");
                    }
                    yield mongo_overflow_model_1.mongoOverflowModel.create({
                        itemID: deleteSalesReturnItem.bill.item.id,
                        quantity: deleteSalesReturnItemQuantity,
                        date: new Date(),
                        billID: deleteSalesReturnItem.bill.id,
                        billCodeID: deleteSalesReturnItem.bill.bill_code.id,
                        adjustmentCaseID: null,
                        adjustmentCaseCodeID: null,
                        value: stockIn.stockOut[stockOutIndex].value,
                    });
                    yield queue_helper_1.queue.add("check-overflow", deleteSalesReturnItem.bill.item.id);
                }
            }
            break;
        case "create-sales-invoice":
            const createSalesInvoiceID = job.data.id;
            const createSalesInvoiceCreatedAt = job.data.created_at;
            const createSalesInvoiceDate = new Date(job.data.date);
            const createSalesInvoiceName = job.data.name;
            const createSalesInvoiceItems = job.data.bill;
            const createSalesInvoiceCustomer = job.data.customer;
            const createSalesInvoiceDelivery = parseFloat(job.data.delivery.toString());
            const createSalesInvoiceService = parseFloat(job.data.service.toString());
            const createSalesInvoiceDiscount = parseFloat(job.data.discount.toString());
            let createSalesInvoiceTotal = createSalesInvoiceItems.reduce((a, b) => {
                return a + (b.price - b.discount) * b.quantity;
            }, 0);
            const createSalesInvoiceNetTotal = createSalesInvoiceTotal +
                createSalesInvoiceService -
                createSalesInvoiceDiscount +
                createSalesInvoiceDelivery;
            const createSalesInvoiceInsertItems = [];
            for (let i = 0; i < createSalesInvoiceItems.length; i++) {
                const createSalesInvoiceItem = createSalesInvoiceItems[i];
                if (createSalesInvoiceItem.package_code != null) {
                    const createSalesInvoicePackagePrice = createSalesInvoiceItem.price;
                    const createSalesInvoicePackageDiscount = createSalesInvoiceItem.discount;
                    const createSalesInvoicePackageQuantity = createSalesInvoiceItem.quantity;
                    const createSalesInvoicePackageFinalPrice = ((createSalesInvoicePackagePrice -
                        createSalesInvoicePackageDiscount) *
                        createSalesInvoiceTotal) /
                        createSalesInvoiceNetTotal;
                    const createSalesInvoicePackageContent = createSalesInvoiceItem
                        .package_code.package_content;
                    const createSalesInvoicePackageContentValue = createSalesInvoicePackageContent.reduce((a, b) => {
                        return a + b.quantity * (b.price - b.discount);
                    }, 0);
                    for (let n = 0; n < createSalesInvoicePackageContent.length; n++) {
                        const createSalesInvoicePackageContentItem = createSalesInvoicePackageContent[n];
                        const createSalesInvoiceItemID = createSalesInvoiceItem.id;
                        const createSalesInvoiceItemItemID = createSalesInvoicePackageContentItem.item_id;
                        const createSalesInvoiceItemQuantity = createSalesInvoicePackageContentItem.quantity;
                        const createSalesInvoiceItemPrice = createSalesInvoicePackageContentItem.price;
                        const createSalesInvoiceItemDiscount = createSalesInvoicePackageContentItem.discount;
                        const createSalesInvoiceItemUnit = createSalesInvoicePackageContentItem.item_unit == null
                            ? createSalesInvoicePackageContentItem.item.unit
                            : createSalesInvoicePackageContentItem.item_unit.unit;
                        const createSalesInvoiceItemConversion = createSalesInvoicePackageContentItem.item_unit == null
                            ? 1
                            : createSalesInvoiceItem.item_unit.conversion;
                        const finalUnitPrice = ((createSalesInvoiceItemPrice - createSalesInvoiceItemDiscount) *
                            createSalesInvoicePackageFinalPrice) /
                            (createSalesInvoicePackageContentValue *
                                createSalesInvoiceItemConversion);
                        const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                            itemID: createSalesInvoiceItemItemID,
                        });
                        if (updateProduct) {
                            updateProduct.currentStock =
                                updateProduct.currentStock -
                                    createSalesInvoiceItemQuantity *
                                        createSalesInvoiceItemConversion;
                            updateProduct.stockCard.unshift({
                                createdAt: createSalesInvoiceCreatedAt,
                                date: createSalesInvoiceDate,
                                document: createSalesInvoiceName,
                                opponent: createSalesInvoiceCustomer == null
                                    ? "Retail customer"
                                    : createSalesInvoiceCustomer.name,
                                displayQuantity: createSalesInvoiceItemQuantity * -1,
                                quantity: createSalesInvoiceItemQuantity *
                                    createSalesInvoiceItemConversion *
                                    createSalesInvoicePackageQuantity *
                                    -1,
                                unit: createSalesInvoiceItemUnit,
                                billID: createSalesInvoiceID,
                                billCodeID: createSalesInvoiceID,
                                adjustmentCaseID: null,
                                adjustmentCaseCodeID: null,
                                goodReceiptID: null,
                                goodReceiptCodeID: null,
                                salesReturnID: null,
                                salesReturnCodeID: null,
                            });
                            yield updateProduct.save();
                            createSalesInvoiceInsertItems.push({
                                quantity: createSalesInvoiceItemQuantity *
                                    createSalesInvoiceItemConversion *
                                    createSalesInvoicePackageQuantity,
                                date: createSalesInvoiceDate,
                                value: finalUnitPrice,
                                billID: createSalesInvoiceItemID,
                                billCodeID: createSalesInvoiceID,
                                adjustmentCaseID: null,
                                adjustmentCaseCodeID: null,
                                itemID: createSalesInvoiceItemItemID,
                            });
                            yield queue_helper_1.queue.add("rearrage-stock-card", createSalesInvoiceItemItemID);
                        }
                    }
                }
                else {
                    const createSalesInvoiceItemID = createSalesInvoiceItem.id;
                    const createSalesInvoiceItemItemID = createSalesInvoiceItem.item_id;
                    const createSalesInvoiceItemQuantity = createSalesInvoiceItem.quantity;
                    const createSalesInvoiceItemPrice = createSalesInvoiceItem.price;
                    const createSalesInvoiceItemDiscount = createSalesInvoiceItem.discount;
                    const createSalesInvoiceItemUnit = createSalesInvoiceItem.item_unit == null
                        ? createSalesInvoiceItem.item.unit
                        : createSalesInvoiceItem.item_unit.unit;
                    const createSalesInvoiceItemConversion = createSalesInvoiceItem.item_unit == null
                        ? 1
                        : createSalesInvoiceItem.item_unit.conversion;
                    const finalUnitPrice = ((createSalesInvoiceItemPrice - createSalesInvoiceItemDiscount) *
                        createSalesInvoiceNetTotal) /
                        (createSalesInvoiceTotal * createSalesInvoiceItemConversion);
                    const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                        itemID: createSalesInvoiceItemItemID,
                    });
                    if (updateProduct) {
                        updateProduct.currentStock =
                            updateProduct.currentStock -
                                createSalesInvoiceItemQuantity * createSalesInvoiceItemConversion;
                        updateProduct.stockCard.unshift({
                            createdAt: createSalesInvoiceCreatedAt,
                            date: createSalesInvoiceDate,
                            document: createSalesInvoiceName,
                            opponent: createSalesInvoiceCustomer == null
                                ? "Retail customer"
                                : createSalesInvoiceCustomer.name,
                            displayQuantity: createSalesInvoiceItemQuantity * -1,
                            quantity: createSalesInvoiceItemQuantity *
                                createSalesInvoiceItemConversion *
                                -1,
                            unit: createSalesInvoiceItemUnit,
                            billID: createSalesInvoiceItemID,
                            billCodeID: createSalesInvoiceID,
                            adjustmentCaseID: null,
                            adjustmentCaseCodeID: null,
                            goodReceiptID: null,
                            goodReceiptCodeID: null,
                            salesReturnID: null,
                            salesReturnCodeID: null,
                        });
                        yield updateProduct.save();
                        createSalesInvoiceInsertItems.push({
                            quantity: createSalesInvoiceItemQuantity *
                                createSalesInvoiceItemConversion,
                            date: createSalesInvoiceDate,
                            value: finalUnitPrice,
                            billID: createSalesInvoiceItemID,
                            billCodeID: createSalesInvoiceID,
                            adjustmentCaseID: null,
                            adjustmentCaseCodeID: null,
                            itemID: createSalesInvoiceItemItemID,
                        });
                        yield queue_helper_1.queue.add("rearrage-stock-card", createSalesInvoiceItemItemID);
                    }
                }
            }
            for (let i = 0; i < createSalesInvoiceInsertItems.length; i++) {
                const createSalesInvoiceInsertItem = createSalesInvoiceInsertItems[i];
                const createSalesInvoiceItemID = createSalesInvoiceInsertItem.itemID;
                let createSalesInvoiceItemQuantity = parseFloat(createSalesInvoiceInsertItem.quantity.toString());
                while (createSalesInvoiceItemQuantity > 0) {
                    if (createSalesInvoiceItemQuantity == 0) {
                        break;
                    }
                    // Find stock in from the oldest
                    const stockIn = yield mongo_stock_in_model_1.mongoStockInModel
                        .findOne({
                        itemID: createSalesInvoiceItemID,
                        residue: { $gt: 0 },
                    })
                        .sort({
                        date: 1,
                    });
                    if (stockIn) {
                        if (stockIn.residue > createSalesInvoiceItemQuantity) {
                            stockIn.residue =
                                stockIn.residue - createSalesInvoiceItemQuantity;
                            stockIn.stockOut.unshift(Object.assign(Object.assign({}, createSalesInvoiceInsertItem), { quantity: createSalesInvoiceItemQuantity }));
                            yield stockIn.save();
                            createSalesInvoiceItemQuantity = 0;
                        }
                        else {
                            stockIn.stockOut.unshift(Object.assign(Object.assign({}, createSalesInvoiceInsertItem), { quantity: stockIn.residue }));
                            createSalesInvoiceItemQuantity =
                                createSalesInvoiceItemQuantity - stockIn.residue;
                            stockIn.residue = 0;
                            yield stockIn.save();
                        }
                    }
                    else {
                        yield mongo_overflow_model_1.mongoOverflowModel.create({
                            itemID: createSalesInvoiceItemID,
                            quantity: createSalesInvoiceItemQuantity,
                            date: createSalesInvoiceInsertItem.date,
                            billID: createSalesInvoiceInsertItem.billID,
                            billCodeID: createSalesInvoiceInsertItem.billCodeID,
                            adjustmentCaseID: createSalesInvoiceInsertItem.adjustmentCaseID,
                            adjustmentCaseCodeID: createSalesInvoiceInsertItem.adjustmentCaseCodeID,
                            value: createSalesInvoiceInsertItem.value,
                        });
                        createSalesInvoiceItemQuantity = 0;
                        break;
                    }
                }
            }
            break;
        case "delete-sales-invoice":
            const deleteSalesInvoiceID = job.data.id;
            const deleteSalesInvoiceItems = job.data.bill;
            for (let i = 0; i < deleteSalesInvoiceItems.length; i++) {
                if (deleteSalesInvoiceItems[i].item_id != null) {
                    const quantity = deleteSalesInvoiceItems[i].quantity;
                    const conversion = deleteSalesInvoiceItems[i].item_unit == null
                        ? 1
                        : parseFloat(deleteSalesInvoiceItems[i].item_unit.conversion);
                    const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                        itemID: deleteSalesInvoiceItems[i].item_id,
                    });
                    if (updateProduct) {
                        updateProduct.currentStock += quantity * conversion;
                        // Remove from stock card
                        const stockCardIndex = updateProduct.stockCard.findIndex((item) => item.billID == deleteSalesInvoiceItems[i].id &&
                            item.billCodeID == deleteSalesInvoiceID &&
                            item.salesReturnCodeID == null &&
                            item.salesReturnID == null);
                        if (stockCardIndex != -1) {
                            updateProduct.stockCard.splice(stockCardIndex, 1);
                        }
                        yield updateProduct.save();
                    }
                    // Remove from stock out
                    const stockIn = yield mongo_stock_in_model_1.mongoStockInModel.find({
                        itemID: deleteSalesInvoiceItems[i].item_id,
                        stockOut: {
                            $elemMatch: {
                                billID: deleteSalesInvoiceItems[i].id,
                                billCodeID: deleteSalesInvoiceID,
                            },
                        },
                    });
                    if (stockIn.length > 0) {
                        for (let j = 0; j < stockIn.length; j++) {
                            const stockInItem = stockIn[j];
                            const stockOutIndex = stockInItem.stockOut.findIndex((item) => item.billID == deleteSalesInvoiceItems[i].id &&
                                item.billCodeID == deleteSalesInvoiceID);
                            if (stockOutIndex != -1) {
                                stockInItem.stockOut.splice(stockOutIndex, 1);
                                stockInItem.residue += quantity * conversion;
                                yield stockInItem.save();
                            }
                        }
                    }
                }
                else if (deleteSalesInvoiceItems[i].package_code_id != null) {
                    const quantity = parseFloat(deleteSalesInvoiceItems[i].quantity.toString());
                    const packageContent = deleteSalesInvoiceItems[i].package_code
                        .package_content;
                    for (let n = 0; n < packageContent.length; n++) {
                        const itemID = packageContent[n].item_id;
                        const packageContentQuantity = packageContent[n].quantity *
                            quantity *
                            (packageContent[n].item_unit == null
                                ? 1
                                : parseFloat(packageContent[n].item_unit.conversion));
                        const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                            itemID: itemID,
                        });
                        if (updateProduct) {
                            updateProduct.currentStock += packageContentQuantity;
                            // Remove from stock card
                            const stockCardIndex = updateProduct.stockCard.findIndex((item) => item.billID == deleteSalesInvoiceItems[i].id &&
                                item.billCodeID == deleteSalesInvoiceID &&
                                item.salesReturnCodeID == null &&
                                item.salesReturnID == null);
                            if (stockCardIndex != -1) {
                                updateProduct.stockCard.splice(stockCardIndex, 1);
                            }
                            yield updateProduct.save();
                        }
                        // Remove from stock out
                        const stockIn = yield mongo_stock_in_model_1.mongoStockInModel.find({
                            itemID: itemID,
                            stockOut: {
                                $elemMatch: {
                                    billID: deleteSalesInvoiceItems[i].id,
                                    billCodeID: deleteSalesInvoiceID,
                                },
                            },
                        });
                        if (stockIn.length > 0) {
                            for (let j = 0; j < stockIn.length; j++) {
                                const stockInItem = stockIn[j];
                                const stockOutIndex = stockInItem.stockOut.findIndex((item) => item.billID == deleteSalesInvoiceItems[i].id &&
                                    item.billCodeID == deleteSalesInvoiceID);
                                if (stockOutIndex != -1) {
                                    stockInItem.stockOut.splice(stockOutIndex, 1);
                                    stockInItem.residue += packageContentQuantity;
                                    yield stockInItem.save();
                                }
                            }
                        }
                    }
                }
            }
            break;
        case "rearrage-stock-card":
            // Check if queue has a similar job
            queue_helper_1.queue.getDelayed().then((jobs) => __awaiter(void 0, void 0, void 0, function* () {
                const jobIndex = jobs.findIndex((job) => job.name == "rearrage-stock-card" && job.data == job.data);
                if (jobIndex != -1) {
                    jobs[jobIndex].remove();
                }
                else {
                    const productID = job.data;
                    const product = yield mongo_product_model_1.mongoProductModel.findOne({
                        itemID: productID,
                    });
                    if (product) {
                        // Arrange stock card, from the newest to the oldest
                        // And then, calculate the current stock for each row
                        product.stockCard.sort((a, b) => {
                            return (new Date(a.date).getTime() - new Date(b.date).getTime() ||
                                b.quantity - a.quantity);
                        });
                        let currentStock = 0;
                        for (let i = 0; i < product.stockCard.length; i++) {
                            product.stockCard[i].currentStock =
                                currentStock + product.stockCard[i].quantity;
                            currentStock += product.stockCard[i].quantity;
                        }
                        product.stockCard.reverse();
                        yield product.save();
                    }
                }
            }));
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
                                stockIn.stockOut.unshift({
                                    date: overflowItem.date,
                                    quantity: overflowQuantity,
                                    billID: overflowItem.billID,
                                    billCodeID: overflowItem.billCodeID,
                                    adjustmentCaseID: overflowItem.adjustmentCaseID,
                                    adjustmentCaseCodeID: overflowItem.adjustmentCaseCodeID,
                                });
                                yield stockIn.save();
                                yield mongo_overflow_model_1.mongoOverflowModel.findByIdAndDelete(overflowItem._id);
                                overflowQuantity = 0;
                                break;
                            }
                            else {
                                overflowItem.quantity = overflowItem.quantity - stockIn.residue;
                                stockIn.stockOut.unshift({
                                    date: overflowItem.date,
                                    quantity: stockIn.residue,
                                    billID: overflowItem.billID,
                                    billCodeID: overflowItem.billCodeID,
                                    adjustmentCaseID: overflowItem.adjustmentCaseID,
                                    adjustmentCaseCodeID: overflowItem.adjustmentCaseCodeID,
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
    worker.on("error", (err) => {
        console.error(`[error]: ${err.message}`);
    });
    console.info("[info]: Worker started!");
});
//# sourceMappingURL=worker.js.map