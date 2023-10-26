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
exports.syncMode = void 0;
const moment_1 = __importDefault(require("moment"));
const app_1 = require("../app");
const fetch_interface_1 = require("../interface/fetch.interface");
const customer_model_1 = __importDefault(require("../model/customer.model"));
const item_model_1 = require("../model/item.model");
const product_package_model_1 = require("../model/product-package.model");
const mongo_overflow_model_1 = require("../mongo-model/mongo-overflow.model");
const mongo_product_model_1 = require("../mongo-model/mongo-product.model");
const mongo_stock_in_model_1 = require("../mongo-model/mongo-stock-in.model");
var syncMode;
(function (syncMode) {
    syncMode[syncMode["Product"] = 0] = "Product";
    syncMode[syncMode["Customer"] = 1] = "Customer";
    syncMode[syncMode["Package"] = 2] = "Package";
    syncMode[syncMode["ProductNoSQL"] = 3] = "ProductNoSQL";
})(syncMode = exports.syncMode || (exports.syncMode = {}));
class SearchHelper {
}
_a = SearchHelper;
/**
 * Sync product, customer, or package data to meilisearch
 * @param req
 * @param res
 * @returns
 */
SearchHelper.createIndex = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield app_1.meili.deleteIndexIfExists("item");
    yield app_1.meili.deleteIndexIfExists("customer");
    yield app_1.meili.deleteIndexIfExists("package");
    yield app_1.meili.createIndex("item");
    yield app_1.meili.createIndex("customer");
    yield app_1.meili.createIndex("package");
    yield app_1.meili.index("item").updateSettings({
        searchableAttributes: ["reference", "description", "brand", "type"],
        rankingRules: ["words", "typo", "proximity", "attribute", "exactness"],
        filterableAttributes: ["is_active", "itemBrandID", "itemTypeID"],
        distinctAttribute: "id",
        synonyms: {
            "rel fe": ["Rel full extension"],
            shelf: ["rak"],
            knob: ["handle", "knop"],
            double: ["doble", "dobel", "dubel", "dobel", "dubbel", "dubbel"],
            "double bracket": ["doble bracket", "dobel bracket", "dubel bracket"],
            bracket: ["breket"],
            profile: ["profil"],
            hinge: ["engsel"],
            hing: ["engsel"],
            lis: ["list"],
            "lubang angin": ["lubang udara", "lubang hawa"],
            tacosheet: ["sheet"],
            sss: ["stainless steel"],
            ss: ["stainless steel"],
            bb: ["ball bearing"],
            "ball bearing": ["bb"],
        },
        typoTolerance: {
            enabled: true,
        },
    });
    return res.status(200).send({
        message: "Create index success",
    });
});
/**
 * Sync product, customer, or package data to meilisearch
 * @param req
 * @param res
 */
SearchHelper.syncMasterData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const mode = req.body.mode;
    switch (mode) {
        case syncMode.Product:
            // await meili.createIndex("item");
            yield app_1.meili.index("item").updateSettings({
                searchableAttributes: ["reference", "description", "brand", "type"],
                rankingRules: [
                    "words",
                    "typo",
                    "proximity",
                    "attribute",
                    "exactness",
                ],
                filterableAttributes: ["is_active", "itemBrandID", "itemTypeID"],
                distinctAttribute: "id",
                synonyms: {
                    "rel fe": ["Rel full extension"],
                    shelf: ["rak"],
                    knob: ["handle", "knop"],
                    double: ["doble", "dobel", "dubel", "dobel", "dubbel", "dubbel"],
                    "double bracket": [
                        "doble bracket",
                        "dobel bracket",
                        "dubel bracket",
                    ],
                    bracket: ["breket"],
                    profile: ["profil"],
                    hinge: ["engsel"],
                    hing: ["engsel"],
                    lis: ["list"],
                    "lubang angin": ["lubang udara", "lubang hawa"],
                    tacosheet: ["sheet"],
                    sss: ["stainless steel"],
                    ss: ["stainless steel"],
                    bb: ["ball bearing"],
                    "ball bearing": ["bb"],
                },
                typoTolerance: {
                    enabled: true,
                },
            });
            yield app_1.meili.index("item").deleteAllDocuments();
            item_model_1.ItemModel.fetchAll(new Date())
                .then((items) => __awaiter(void 0, void 0, void 0, function* () {
                for (let i = 0; i < items.length; i++) {
                    const result = yield app_1.meili.index("item").addDocuments([
                        {
                            id: items[i].id,
                            reference: items[i].reference,
                            description: items[i].description,
                            brand: items[i].item_brand.name,
                            type: items[i].item_type.name,
                            itemBrandID: items[i].item_brand_id,
                            itemTypeID: items[i].item_type_id,
                            is_active: items[i].is_active ? 1 : 0,
                        },
                    ]);
                    console.log(result);
                }
                return res.status(200).send({
                    message: "Sync product success",
                });
            }))
                .catch((error) => {
                console.log(`[error]: Error while indexing search data. ${error}`);
                return res.status(500).send(error);
            });
            break;
        case syncMode.Customer:
            yield app_1.meili.index("customer").deleteAllDocuments();
            customer_model_1.default.fetch("", 0, 0, fetch_interface_1.fetchMode.All)
                .then((customers) => __awaiter(void 0, void 0, void 0, function* () {
                yield app_1.meili.index("customer").addDocumentsInBatches(customers.map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        address: x.address,
                        phone: x.phone,
                        email: x.email,
                        pic: x.pic,
                    };
                }));
                console.log("[info]: Indexing search data completed.");
                return res.status(200).send({
                    message: "Sync customer success",
                });
            }))
                .catch((error) => {
                console.log(`[error]: Error while fetching customer data ${error}`);
                return res.status(500).send(error);
            });
            break;
        case syncMode.Package:
            yield app_1.meili.index("package").deleteAllDocuments();
            product_package_model_1.ProductPackageCodeModel.fetchAll()
                .then((packages) => __awaiter(void 0, void 0, void 0, function* () {
                yield app_1.meili.index("package").addDocumentsInBatches(packages.map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        description: x.description,
                        price: x.price,
                        product_content: x.package_content.map((y) => {
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
                    };
                }));
                console.log("[info]: Indexing search data completed.");
                return res.status(200).send({
                    message: "Sync package success",
                });
            }))
                .catch((error) => {
                console.log(`[error]: Error while fetching package data ${error}`);
                return res.status(500).send(error);
            });
            break;
        case syncMode.ProductNoSQL:
            mongo_product_model_1.mongoProductModel
                .deleteMany({})
                .then(() => {
                item_model_1.ItemModel.fetchAll(new Date())
                    .then((items) => __awaiter(void 0, void 0, void 0, function* () {
                    yield mongo_product_model_1.mongoProductModel.insertMany(items.map((x) => {
                        return {
                            reference: x.reference,
                            description: x.description,
                            itemID: x.id,
                            itemTypeID: x.item_type_id,
                            itemBrandID: x.item_brand_id,
                            currentStock: 0,
                            unit: x.unit,
                            stockCard: [],
                        };
                    }));
                    console.log("[info]: Sync product NoSQL completed.");
                    return res.status(200).send({
                        message: "Sync product NoSQL success",
                    });
                }))
                    .catch((error) => {
                    console.error(`[error]: Error on sync product NoSQL. ${error}`);
                    return res.status(500).send(error);
                });
            })
                .catch((error) => {
                console.error(`[error]: Error on deleting product NoSQL. ${error}`);
                return res.status(500).send(error);
            });
            break;
    }
});
/**
 * Reset stock in data
 * @param req
 * @param res
 */
SearchHelper.syncProductIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Promise.all([
    // ]).then(([purchaseInvoiceResult, adjustmentCaseCodeResult]) => {
    //   mongoStockInModel.deleteMany({}).then(() => {
    //     purchaseInvoiceResult.forEach((purchaseInvoice) => {
    //       // Insert all stock in
    //       const goodReceiptCreatedAt =
    //         purchaseInvoice.good_receipt_code.created_at;
    //       const companyID = purchaseInvoice.good_receipt_code.company_id;
    //       const goodReceiptCodeID = purchaseInvoice.good_receipt_code.id;
    //       const goodReceiptDate = purchaseInvoice.good_receipt_code.date;
    //       const goodReceiptName = purchaseInvoice.good_receipt_code.name;
    //       const goodReceiptSupplier =
    //         purchaseInvoice.good_receipt_code.supplier;
    //       const discount = purchaseInvoice.discount;
    //       const goodReceiptPrice =
    //         purchaseInvoice.good_receipt_code.good_receipt.reduce((a, b) => {
    //           return (
    //             a +
    //             parseFloat(b.price.toString()) *
    //               parseFloat(b.quantity.toString())
    //           );
    //         }, 0);
    //       const goodReceiptNetPrice =
    //         goodReceiptPrice -
    //         (discount == null ? 0 : parseFloat(discount.toString()));
    //       purchaseInvoice.good_receipt_code.good_receipt.forEach(
    //         async (goodReceipt) => {
    //           const quantity = parseFloat(goodReceipt.quantity.toString());
    //           const conversion =
    //             goodReceipt.item_unit == null
    //               ? 1
    //               : parseFloat(goodReceipt.item_unit.conversion.toString());
    //           const unit =
    //             goodReceipt.item_unit == null
    //               ? goodReceipt.item.unit
    //               : goodReceipt.item_unit.unit;
    //           const finalUnitPrice =
    //             (parseFloat(goodReceipt.price.toString()) *
    //               goodReceiptNetPrice) /
    //             (goodReceiptPrice *
    //               (goodReceipt.item_unit == null
    //                 ? 1
    //                 : parseFloat(goodReceipt.item_unit.conversion.toString())));
    //           console.log(
    //             `[info]: Inserting stock in for ${goodReceipt.item.reference}`
    //           );
    //           await mongoProductModel.findOneAndUpdate(
    //             {
    //               itemID: goodReceipt.item.id,
    //             },
    //             {
    //               $inc: {
    //                 currentStock:
    //                   parseFloat(goodReceipt.quantity.toString()) *
    //                   (goodReceipt.item_unit == null
    //                     ? 1
    //                     : parseFloat(
    //                         goodReceipt.item_unit.conversion.toString()
    //                       )),
    //               },
    //               $push: {
    //                 stockCard: {
    //                   createdAt: goodReceiptCreatedAt,
    //                   date: goodReceiptDate,
    //                   document: goodReceiptName,
    //                   quantity: quantity * conversion,
    //                   displayQuantity: goodReceipt.quantity,
    //                   unit: unit,
    //                   billID: null,
    //                   billCodeID: null,
    //                   adjustmentCaseID: null,
    //                   adjustmentCaseCodeID: null,
    //                   goodReceiptCodeID: goodReceiptCodeID,
    //                   goodReceiptID: goodReceipt.id,
    //                   salesReturnID: null,
    //                   salesReturnCodeID: null,
    //                   opponent: goodReceiptSupplier.name,
    //                   supplierID: goodReceiptSupplier.id,
    //                   customerID: null,
    //                 },
    //               },
    //             }
    //           );
    //           await mongoStockInModel.create({
    //             companyID: companyID,
    //             adjustmentCaseID: null,
    //             adjustmentCaseCodeID: null,
    //             goodReceiptCodeID: goodReceiptCodeID,
    //             date: goodReceiptDate,
    //             price: finalUnitPrice,
    //             itemID: goodReceipt.item.id,
    //             residue:
    //               parseFloat(goodReceipt.quantity.toString()) *
    //               (goodReceipt.item_unit == null
    //                 ? 1
    //                 : parseFloat(goodReceipt.item_unit.conversion.toString())),
    //             quantity:
    //               parseFloat(goodReceipt.quantity.toString()) *
    //               (goodReceipt.item_unit == null
    //                 ? 1
    //                 : parseFloat(goodReceipt.item_unit.conversion.toString())),
    //           });
    //         }
    //       );
    //     });
    //     adjustmentCaseCodeResult.forEach((adjustmentCaseCode) => {
    //       const companyID = adjustmentCaseCode.company_id;
    //       const adjustmentCaseCodeID = adjustmentCaseCode.id;
    //       const adjustmentCaseCodeName = adjustmentCaseCode.name;
    //       const adjustmentCaseCodeDate = adjustmentCaseCode.date;
    //       const adjustmentCaseCreatedAt = adjustmentCaseCode.created_at;
    //       adjustmentCaseCode.adjustment_case.forEach(async (adjustmentCase) => {
    //         if (parseFloat(adjustmentCase.quantity.toString()) > 0) {
    //           const quantity = parseFloat(adjustmentCase.quantity.toString());
    //           const conversion =
    //             adjustmentCase.item_unit == null
    //               ? 1
    //               : parseFloat(adjustmentCase.item_unit.conversion.toString());
    //           const unit =
    //             adjustmentCase.item_unit == null
    //               ? adjustmentCase.item.unit
    //               : adjustmentCase.item_unit.unit;
    //           console.log(
    //             `[info]: Inserting stock in for ${adjustmentCase.item.reference}`
    //           );
    //           await mongoProductModel.findOneAndUpdate(
    //             {
    //               itemID: adjustmentCase.item.id,
    //             },
    //             {
    //               $inc: {
    //                 currentStock:
    //                   parseFloat(adjustmentCase.quantity.toString()) *
    //                   (adjustmentCase.item_unit == null
    //                     ? 1
    //                     : parseFloat(
    //                         adjustmentCase.item_unit.conversion.toString()
    //                       )),
    //               },
    //               $push: {
    //                 stockCard: {
    //                   createdAt: adjustmentCaseCreatedAt,
    //                   date: adjustmentCaseCodeDate,
    //                   opponent: "Internal",
    //                   document: adjustmentCaseCodeName,
    //                   quantity: quantity * conversion,
    //                   displayQuantity: quantity,
    //                   unit: unit,
    //                   billID: null,
    //                   billCodeID: null,
    //                   adjustmentCaseID: adjustmentCase.id,
    //                   adjustmentCaseCodeID: adjustmentCaseCodeID,
    //                   goodReceiptCodeID: null,
    //                   goodReceiptID: null,
    //                   salesReturnID: null,
    //                   salesReturnCodeID: null,
    //                 },
    //               },
    //             }
    //           );
    //           console.log(
    //             `[info]: Inserting stock in for ${adjustmentCase.item.reference}`
    //           );
    //           await mongoStockInModel.create({
    //             companyID: companyID,
    //             adjustmentCaseID: adjustmentCase.id,
    //             adjustmentCaseCodeID: adjustmentCaseCodeID,
    //             goodReceiptCodeID: null,
    //             goodReceiptDate: null,
    //             date: adjustmentCaseCodeDate,
    //             itemID: adjustmentCase.item.id,
    //             price: 0,
    //             residue:
    //               parseFloat(adjustmentCase.quantity.toString()) *
    //               (adjustmentCase.item_unit == null
    //                 ? 1
    //                 : parseFloat(
    //                     adjustmentCase.item_unit.conversion.toString()
    //                   )),
    //             quantity:
    //               parseFloat(adjustmentCase.quantity.toString()) *
    //               (adjustmentCase.item_unit == null
    //                 ? 1
    //                 : parseFloat(
    //                     adjustmentCase.item_unit.conversion.toString()
    //                   )),
    //           });
    //         }
    //       });
    //     });
    //     return res.status(200).send({
    //       message: "Stock in sync success",
    //     });
    //   });
    // });
    app_1.prisma
        .$queryRawUnsafe(`SELECT adjustment_case_code.company_id AS companyID, adjustment_case.id AS adjustmentCaseID, adjustment_case_code.id AS adjustmentCaseCodeID, 
        NULL AS goodReceiptID, NULL AS goodReceiptCodeID,
        adjustment_case_code.date, (adjustment_case.price / COALESCE(item_unit.conversion, 1)) AS price, adjustment_case.quantity * COALESCE(item_unit.conversion, 1) AS quantity, adjustment_case.quantity * COALESCE(item_unit.conversion, 1) AS residue, adjustment_case.item_id AS itemID, 
        adjustment_case_code.created_at
        FROM adjustment_case
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
        LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
        WHERE adjustment_case_code.is_delete = 0
        AND adjustment_case.quantity > 0
        UNION ALL 
        SELECT good_receipt_code.company_id AS companyID, NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID, 
        good_receipt.id AS goodReceiptID, good_receipt_code.id AS goodReceiptCodeID,
        good_receipt_code.date, IF(total.value = 0, 0, 
        (good_receipt.price - good_receipt.discount) * (total.value - purchase_invoice.discount) / (total.value * COALESCE(item_unit.conversion, 1))) AS price, 
        good_receipt.quantity * COALESCE(item_unit.conversion, 1) AS quantity, good_receipt.quantity * COALESCE(item_unit.conversion, 1) AS residue,
        good_receipt.item_id AS itemID,
        good_receipt_code.created_at
        FROM good_receipt
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
        LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
        JOIN (
          SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, good_receipt.good_receipt_code_id
            FROM good_receipt
            GROUP BY good_receipt_code_id
        ) AS total
        ON good_receipt_code.id = total.good_receipt_code_id
        WHERE purchase_invoice.is_delete = 0
        AND good_receipt_code.is_delete = 0`)
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        yield mongo_stock_in_model_1.mongoStockInModel.insertMany(result.map((x) => {
            return Object.assign(Object.assign({}, x), { date: new Date(x.date), createdAt: new Date(x.created_at), stockOut: [] });
        }));
        return res.status(200).send({
            message: "Stock in sync success",
        });
    }));
});
/**
 * Reset stock out data
 * @param req
 * @param res
 */
SearchHelper.syncProductOutCalculation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const overflows = [];
    const stockIns = yield mongo_stock_in_model_1.mongoStockInModel.find({});
    const stockOuts = yield app_1.prisma.$queryRawUnsafe(`
        SELECT * FROM 
        (
          SELECT 
          NULL AS billID, NULL as billCodeID,
          adjustment_case.id AS adjustmentCaseID, adjustment_case_code.id AS adjustmentCaseCodeID,
          adjustment_case_code.date, adjustment_case.quantity * COALESCE(item_unit.conversion, 1) * -1 AS quantity,
          adjustment_case.item_id AS itemID,
          0 AS value
          FROM adjustment_case
          JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
          LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
          WHERE adjustment_case_code.is_delete = 0
          AND adjustment_case.quantity < 0
          UNION ALL
          SELECT 
          bill.id AS billID, bill_code.id as billCodeID,
          NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID,
          bill_code.date, (bill.quantity - COALESCE(sr.quantity, 0)) * COALESCE(item_unit.conversion, 1) AS quantity,
          bill.item_id AS itemID,
          IF(total.value = 0, 0, (bill.price - bill.discount) * (total.value + bill_code.service + bill_code.delivery - bill_code.discount) / (total.value * COALESCE(item_unit.conversion, 1))) AS value
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
              FROM sales_return
              JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
              WHERE sales_return_code.is_delete = 0
              GROUP BY sales_return.bill_id
          ) AS sr
          ON sr.bill_id = bill.id
          JOIN (
            SELECT SUM((bill.price - bill.discount) * (bill.quantity - COALESCE(sra.quantity, 0))) AS value, bill.bill_code_id
              FROM bill
            LEFT JOIN (
              SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
              FROM sales_return
              JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
              WHERE sales_return_code.is_delete = 0
              GROUP BY sales_return.bill_id
            )  AS sra
            ON bill.id = sra.bill_id
              GROUP BY bill.bill_code_id
          ) AS total
          ON bill_code.id = total.bill_code_id
          WHERE bill_code.is_delete = 0
        ) AS a
        ORDER BY a.date ASC
      `);
    for (let i = 0; i < stockOuts.length; i++) {
        // Create loading bar in console log
        const progress = Math.round((i / stockOuts.length) * 100);
        const loadingBar = new Array(Math.round(progress / 10)).fill("=");
        console.log(`Stock out sync progress: ${loadingBar.join("")} ${progress}% ${i}/${stockOuts.length}`);
        let quantity = parseFloat(stockOuts[i].quantity.toString());
        while (quantity > 0) {
            if (quantity == 0) {
                break;
            }
            const stockInIndex = stockIns
                .sort((a, b) => {
                return a.date.getTime() - b.date.getTime();
            })
                .findIndex((x) => {
                return x.itemID == stockOuts[i].itemID && x.residue > 0;
            });
            if (stockInIndex != -1) {
                const stockIn = stockIns[stockInIndex];
                const stockInResidue = stockIn.residue;
                if (stockInResidue >= quantity) {
                    stockIn.residue = stockInResidue - quantity;
                    stockIn.stockOut.push(Object.assign(Object.assign({}, stockOuts[i]), { quantity: quantity }));
                    quantity = 0;
                    break;
                }
                else {
                    stockIn.residue = 0;
                    stockIn.stockOut.push(Object.assign(Object.assign({}, stockOuts[i]), { quantity: stockInResidue }));
                    quantity -= stockInResidue;
                }
            }
            else {
                overflows.push(Object.assign(Object.assign({}, stockOuts[i]), { quantity: quantity }));
                quantity = 0;
                break;
            }
        }
    }
    yield mongo_stock_in_model_1.mongoStockInModel.deleteMany({});
    yield mongo_stock_in_model_1.mongoStockInModel.insertMany(stockIns);
    yield mongo_overflow_model_1.mongoOverflowModel.insertMany(overflows);
    return res.status(200).send({
        message: "Stock out sync success",
    });
});
/**
 * Sync product out and edit stock card
 * @param req
 * @param res
 */
SearchHelper.syncProductOut = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const products = yield mongo_product_model_1.mongoProductModel.find({});
    const stockCards = yield app_1.prisma.$queryRawUnsafe(`
      SELECT * FROM (
        SELECT good_receipt_code.created_at COLLATE utf8mb4_unicode_ci AS createdAt, good_receipt_code.date COLLATE utf8mb4_unicode_ci AS date,
        good_receipt_code.name COLLATE utf8mb4_unicode_ci AS document,
        supplier.name COLLATE utf8mb4_unicode_ci AS opponent,
        good_receipt.item_id AS itemID,
        good_receipt.quantity AS displayQuantity,
        good_receipt.quantity * COALESCE(item_unit.conversion, 1) AS quantity,
        COALESCE(item_unit.unit, item.unit) COLLATE utf8mb4_unicode_ci AS unit,
        NULL AS billID, NULL AS billCodeID,
        NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID,
        good_receipt.id AS goodReceiptID, good_receipt_code.id AS goodReceiptCodeID,
        NULL AS sales_return_id, NULL AS salesReturnCodeID,
        NULL AS customerID,
        good_receipt_code.supplier_id AS supplierID,
        0 AS currentStock
        FROM good_receipt
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        JOIN supplier ON good_receipt_code.supplier_id = supplier.id
        JOIN item ON good_receipt.item_id = item.id
        LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
        WHERE good_receipt_code.is_delete= 0
        UNION ALL 
        SELECT adjustment_case_code.created_at COLLATE utf8mb4_unicode_ci, adjustment_case_code.date COLLATE utf8mb4_unicode_ci, 
        adjustment_case_code.name COLLATE utf8mb4_unicode_ci AS document,
        "Internal" COLLATE utf8mb4_unicode_ci AS opponent,
        adjustment_case.item_id AS itemID,
        adjustment_case.quantity  AS	displayQuantity,
        adjustment_case.quantity * COALESCE(item_unit.conversion, 1) AS quantity,
        COALESCE(item_unit.unit, item.unit) COLLATE utf8mb4_unicode_ci AS unit,
        NULL AS billID, NULL AS billCodeID,
        adjustment_case.id AS adjustmentCaseID, adjustment_case_code.id AS adjustmentCaseCodeID,
        NULL AS goodReceiptID, NULL AS goodReceiptCodeID,
        NULL AS sales_return_id, NULL AS salesReturnCodeID,
        NULL AS customerID,
        NULL AS supplierID,
        0 AS currentStock
        FROM adjustment_case
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
        JOIN item ON adjustment_case.item_id = item.id
        LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
        WHERE adjustment_case_code.is_delete= 0
        UNION ALL 
        SELECT bill_code.created_at COLLATE utf8mb4_unicode_ci, bill_code.date COLLATE utf8mb4_unicode_ci, 
        bill_code.name COLLATE utf8mb4_unicode_ci AS document,
        COALESCE(customer.name, 'Retail customer') COLLATE utf8mb4_unicode_ci AS opponent,
        bill.item_id AS itemID,
        bill.quantity * -1  AS displayQuantity,
        bill.quantity * COALESCE(item_unit.conversion, 1) * -1 AS quantity,
        COALESCE(item_unit.unit, item.unit) COLLATE utf8mb4_unicode_ci AS unit,
        bill.id AS billID, bill_code.id AS billCodeID,
        NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID,
        NULL AS goodReceiptID, NULL AS goodReceiptCodeID,
        NULL AS sales_return_id, NULL AS salesReturnCodeID,
        bill_code.customer_id AS customerID,
        NULL AS supplierID,
        0 AS currentStock
        FROM bill
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        LEFT JOIN customer ON bill_code.customer_id = customer.id
        JOIN item ON bill.item_id = item.id
        LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
        WHERE bill_code.is_delete= 0
        UNION ALL
        SELECT sales_return_code.created_at COLLATE utf8mb4_unicode_ci AS createdAt, sales_return_code.date COLLATE utf8mb4_unicode_ci,
        sales_return_code.name COLLATE utf8mb4_unicode_ci AS document,
        COALESCE(customer.name, 'Retail customer') AS opponent,
        bill.item_id AS itemID,
        sales_return.quantity AS quantity,
        sales_return.quantity * COALESCE(item_unit.conversion, 1) AS quantity,
        COALESCE(item_unit.unit, item.unit) COLLATE utf8mb4_unicode_ci AS unit,
        bill.id AS billID, bill_code.id AS billCodeID,
        NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID,
        NULL AS goodReceiptID, NULL AS goodReceiptCodeID,
        sales_return.id AS salesReturnID, sales_return_code.id AS salesReturnCodeID,
        bill_code.customer_id AS customerID,
        NULL AS supplierID,
        0 AS currentStock
        FROM sales_return
        JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
        JOIN bill ON bill.id = sales_return.bill_id
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        LEFT JOIN customer ON bill_code.customer_id = customer.id
        JOIN item ON bill.item_id = item.id
        LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
        WHERE bill_code.is_delete= 0
        AND sales_return_code.is_delete = 0
        ) a
        ORDER BY a.itemID ASC, a.date DESC
      `);
    for (let i = 0; i < products.length; i++) {
        yield mongo_product_model_1.mongoProductModel.findByIdAndUpdate(products[i]._id, {
            currentStock: stockCards
                .filter((x) => x.itemID == products[i].itemID)
                .reduce((a, b) => {
                return a + parseFloat(b.quantity.toString());
            }, 0),
            $push: {
                stockCard: {
                    $each: [
                        ...stockCards
                            .filter((x) => x.itemID == products[i].itemID)
                            .map((x) => {
                            return {
                                date: (0, moment_1.default)(x.date).format("YYYY-MM-DD"),
                                createdAt: new Date(x.createdAt),
                                document: x.document,
                                opponent: x.opponent,
                                displayQuantity: parseFloat(x.displayQuantity.toString()),
                                quantity: parseFloat(x.quantity.toString()),
                                unit: x.unit,
                                billID: x.billID,
                                billCodeID: x.billCodeID,
                                adjustmentCaseID: x.adjustmentCaseID,
                                adjustmentCaseCodeID: x.adjustmentCaseCodeID,
                                goodReceiptID: x.goodReceiptID,
                                goodReceiptCodeID: x.goodReceiptCodeID,
                                salesReturnID: x.salesReturnID,
                                salesReturnCodeID: x.salesReturnCodeID,
                                customerID: x.customerID,
                                supplierID: x.supplierID,
                                currentStock: 0,
                            };
                        }),
                    ],
                },
            },
        });
        console.log("updated product");
    }
    return res.status(200).send({
        message: "Stock card arranged successfully",
    });
});
/**
 * Sync product card
 */
SearchHelper.arrangeStockCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    mongo_product_model_1.mongoProductModel.find({}).then((products) => __awaiter(void 0, void 0, void 0, function* () {
        for (let i = 0; i < products.length; i++) {
            console.log("arranging stock card for product " + products[i].reference);
            products[i].stockCard.sort((a, b) => {
                return (new Date(a.date).getTime() - new Date(b.date).getTime() ||
                    b.quantity - a.quantity);
            });
            let currentStock = 0;
            for (let n = 0; n < products[i].stockCard.length; n++) {
                products[i].stockCard[n].currentStock =
                    currentStock + products[i].stockCard[n].quantity;
                currentStock += products[i].stockCard[n].quantity;
            }
            products[i].stockCard.reverse();
            yield products[i].save();
        }
        return res.status(200).send({
            message: "Arrange stock card successfully",
        });
    }));
});
exports.default = SearchHelper;
//# sourceMappingURL=search.helper.js.map