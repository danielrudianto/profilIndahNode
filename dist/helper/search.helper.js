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
const app_1 = require("../app");
const fetch_interface_1 = require("../interface/fetch.interface");
const customer_model_1 = __importDefault(require("../model/customer.model"));
const item_model_1 = require("../model/item.model");
const product_package_model_1 = require("../model/product-package.model");
const mongo_overflow_model_1 = require("../mongo-model/mongo-overflow.model");
const mongo_product_model_1 = require("../mongo-model/mongo-product.model");
const mongo_stock_in_model_1 = require("../mongo-model/mongo-stock-in.model");
const mongo_stock_card_model_1 = require("../mongo-model/mongo-stock-card.model");
var syncMode;
(function (syncMode) {
    syncMode[syncMode["Product"] = 0] = "Product";
    syncMode[syncMode["Customer"] = 1] = "Customer";
    syncMode[syncMode["Package"] = 2] = "Package";
    syncMode[syncMode["ProductNoSQL"] = 3] = "ProductNoSQL";
    syncMode[syncMode["ProductMinimumStock"] = 4] = "ProductMinimumStock";
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
    yield app_1.meili.createIndex("item", {
        primaryKey: "id",
    });
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
            double: ["doble", "dobel", "dubel", "dobel", "dubbel"],
            "double bracket": ["doble bracket", "dobel bracket", "dubel bracket"],
            bracket: ["breket"],
            profile: ["profil", "profill"],
            hinge: ["engsel"],
            hing: ["engsel"],
            lis: ["list"],
            "lubang angin": ["lubang udara", "lubang hawa"],
            tacosheet: ["sheet", "sheeting", "shit"],
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
SearchHelper.getTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.status(200).send(yield app_1.meili.getTask(15));
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
                app_1.meili
                    .index("item")
                    .addDocuments([
                    ...items.map((x) => {
                        return {
                            id: x.id,
                            reference: x.reference,
                            description: x.description,
                            brand: x.item_brand.name,
                            type: x.item_type.name,
                            itemBrandID: x.item_brand_id,
                            itemTypeID: x.item_type_id,
                            is_active: x.is_active ? 1 : 0,
                        };
                    }),
                ])
                    .then((result) => {
                    return res.status(200).send({
                        message: "Sync product success",
                    });
                })
                    .catch((error) => {
                    console.error(`[error]: Error on indexing search data. ${error} `);
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
                            minimumStock: x.minimum_stock || 0,
                            calculatedMinimumStock: 0,
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
        case syncMode.ProductMinimumStock:
            item_model_1.ItemModel.fetchAll(new Date())
                .then((items) => __awaiter(void 0, void 0, void 0, function* () {
                for (let i = 0; i < items.length; i++) {
                    yield mongo_product_model_1.mongoProductModel.findOneAndUpdate({ itemID: items[i].id }, {
                        $set: {
                            minimumStock: items[0].minimum_stock || 0,
                            calculatedMinimumStock: 0,
                        },
                    });
                }
                console.log("[info]: Sync product NoSQL completed.");
                return res.status(200).send({
                    message: "Sync product NoSQL success",
                });
            }))
                .catch((error) => {
                console.error(`[error]: Error on sync product NoSQL. ${error}`);
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
    app_1.prisma
        .$queryRawUnsafe(`SELECT adjustment_case_code.company_id AS companyID, adjustment_case.id AS adjustmentCaseID, adjustment_case_code.id AS adjustmentCaseCodeID, 
        NULL AS goodReceiptID, NULL AS goodReceiptCodeID,
        adjustment_case_code.date, (adjustment_case.price / COALESCE(item_unit.conversion, 1)) AS price, adjustment_case.quantity * COALESCE(item_unit.conversion, 1) AS quantity, adjustment_case.quantity * COALESCE(item_unit.conversion, 1) AS residue, adjustment_case.item_id AS itemID, 
        adjustment_case_code.created_at,
        NULL AS supplier_id
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
        good_receipt_code.created_at,
        good_receipt_code.supplier_id AS supplier_id
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
            return Object.assign(Object.assign({}, x), { date: new Date(x.date), companyID: x.companyID, supplierID: x.supplier_id });
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
    const stockOuts = yield app_1.prisma.$queryRawUnsafe(`
        SELECT * FROM 
        (
          # Adjustment case
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
          # Bill
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
          AND bill.item_id IS NOT NULL
          UNION ALL
          # Bill with package
          SELECT 
          bill.id AS billID, bill_code.id as billCodeID,
          NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID,
          bill_code.date, (package_content.quantity * bill.quantity - COALESCE(sr.quantity, 0)) * COALESCE(item_unit.conversion, 1) AS quantity,
          package_content.item_id AS itemID,
          IF(total.value = 0, 0, IF(pv.value = 0, 0, ((package_content.price - package_content.discount) / pv.value) * (bill.price - bill.discount) * (total.value + bill_code.service + bill_code.delivery - bill_code.discount) / (total.value * COALESCE(item_unit.conversion, 1)))) AS value
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          JOIN package_code ON bill.package_code_id = package_code.id
          JOIN package_content ON package_code.id = package_content.package_code_id
          JOIN item ON package_content.item_id = item.id
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
          JOIN (
          SELECT SUM(package_content.quantity * (package_content.price - package_content.discount)) AS value, package_content.package_code_id
          FROM package_content
          GROUP BY package_code_id
          ) AS pv
          ON package_code.id = pv.package_code_id
          WHERE bill_code.is_delete = 0
        ) AS a
        ORDER BY a.date ASC
      `);
    for (let i = 0; i < stockOuts.length; i++) {
        // Create loading bar in console log
        const progress = Math.round((i / stockOuts.length) * 100);
        const loadingBar = new Array(Math.round(progress / 10)).fill("=");
        console.info(`Stock out sync progress: ${loadingBar.join("")} ${progress}% ${i}/${stockOuts.length}`);
        let quantity = Number(stockOuts[i].quantity);
        while (quantity > 0) {
            if (quantity == 0) {
                break;
            }
            else {
                const stockIn = yield mongo_stock_in_model_1.mongoStockInModel
                    .findOne({
                    itemID: stockOuts[i].itemID,
                    residue: { $gt: 0 },
                })
                    .sort({ date: 1 });
                if (stockIn == null) {
                    yield mongo_overflow_model_1.mongoOverflowModel.create({
                        itemID: stockOuts[i].itemID,
                        date: stockOuts[i].date,
                        quantity: quantity,
                        billCodeID: stockOuts[i].billCodeID,
                        billID: stockOuts[i].billID,
                        adjustmentCaseID: stockOuts[i].adjustmentCaseID,
                        adjustmentCaseCodeID: stockOuts[i].adjustmentCaseCodeID,
                        value: Number(stockOuts[i].value),
                    });
                    break;
                }
                else {
                    const stockInResidue = stockIn.residue;
                    if (stockInResidue >= quantity) {
                        try {
                            stockIn.residue = stockInResidue - quantity;
                            yield mongo_stock_in_model_1.mongoStockOutModel.create({
                                billCodeID: stockOuts[i].billCodeID,
                                billID: stockOuts[i].billID,
                                adjustmentCaseID: stockOuts[i].adjustmentCaseID,
                                adjustmentCaseCodeID: stockOuts[i].adjustmentCaseCodeID,
                                date: stockOuts[i].date,
                                quantity: Number(quantity),
                                value: Number(stockOuts[i].value),
                                stockInID: stockIn._id,
                                itemID: stockOuts[i].itemID,
                            });
                            quantity = 0;
                            yield stockIn.save();
                        }
                        catch (e) {
                            console.error(e.toString());
                            throw new Error(e);
                        }
                        break;
                    }
                    else {
                        try {
                            stockIn.residue = 0;
                            yield mongo_stock_in_model_1.mongoStockOutModel.create({
                                billCodeID: stockOuts[i].billCodeID,
                                billID: stockOuts[i].billID,
                                adjustmentCaseID: stockOuts[i].adjustmentCaseID,
                                adjustmentCaseCodeID: stockOuts[i].adjustmentCaseCodeID,
                                date: stockOuts[i].date,
                                quantity: stockInResidue,
                                value: Number(stockOuts[i].value),
                                stockInID: stockIn._id,
                                itemID: stockOuts[i].itemID,
                            });
                            quantity -= stockInResidue;
                            yield stockIn.save();
                        }
                        catch (e) {
                            console.error(e.toString());
                            throw new Error(e);
                        }
                    }
                }
            }
        }
    }
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
        # Good receipt
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
        # Adjustment case
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
        # Bill
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
        # Bill with package
        SELECT bill_code.created_at COLLATE utf8mb4_unicode_ci, bill_code.date COLLATE utf8mb4_unicode_ci, 
        bill_code.name COLLATE utf8mb4_unicode_ci AS document,
        COALESCE(customer.name, 'Retail customer') COLLATE utf8mb4_unicode_ci AS opponent,
        package_content.item_id AS itemID,
        package_content.quantity * bill.quantity * -1  AS displayQuantity,
        package_content.quantity * bill.quantity * COALESCE(item_unit.conversion, 1) * -1 AS quantity,
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
        JOIN package_code ON bill.package_code_id = package_code.id
        JOIN package_content ON package_content.package_code_id = package_code.id
        JOIN item ON package_content.item_id = item.id
        LEFT JOIN item_unit ON package_content.item_unit_id = item_unit.id
        WHERE bill_code.is_delete= 0
        UNION ALL
        # Sales return
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
        UNION ALL
        # Sales return with package
        SELECT sales_return_code.created_at COLLATE utf8mb4_unicode_ci AS createdAt, sales_return_code.date COLLATE utf8mb4_unicode_ci,
        sales_return_code.name COLLATE utf8mb4_unicode_ci AS document,
        COALESCE(customer.name, 'Retail customer') AS opponent,
        package_content.item_id AS itemID,
        package_content.quantity * sales_return.quantity AS quantity,
        package_content.quantity * sales_return.quantity * COALESCE(item_unit.conversion, 1) AS quantity,
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
        JOIN package_code ON bill.package_code_id = package_code.id
        JOIN package_content ON package_content.package_code_id = package_code.id
        JOIN item ON package_content.item_id = item.id
        LEFT JOIN item_unit ON package_content.item_unit_id = item_unit.id
        WHERE bill_code.is_delete= 0
        AND sales_return_code.is_delete = 0
        ) a
        ORDER BY a.itemID ASC, a.date DESC
      `);
    const stockCardItems = stockCards.map((x) => {
        return {
            createdAt: x.createdAt,
            date: x.date,
            document: x.document,
            opponent: x.opponent,
            displayQuantity: x.displayQuantity,
            quantity: x.quantity,
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
            itemID: x.itemID,
        };
    });
    yield mongo_stock_card_model_1.mongoStockCardModel.insertMany(stockCardItems);
    return res.status(200).send({
        message: "Stock card arranged successfully",
    });
});
/**
 * Sync product card
 */
SearchHelper.arrangeStockCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    mongo_product_model_1.mongoProductModel.find({}).then((products) => __awaiter(void 0, void 0, void 0, function* () {
        // Select from stock cards, group by itemID, sort by date
        for (let i = 0; i < products.length; i++) {
            const stockCards = yield mongo_stock_card_model_1.mongoStockCardModel
                .find({
                itemID: products[i].itemID,
            })
                .sort({ date: 1 });
            let currentStock = 0;
            for (let n = 0; n < stockCards.length; n++) {
                currentStock += stockCards[n].quantity;
                stockCards[n].currentStock = currentStock;
                yield stockCards[n].save();
                console.info("Arrange stock card for itemID: " +
                    products[i].itemID +
                    "(" +
                    (n + 1) +
                    "/" +
                    stockCards.length +
                    ")");
            }
            console.info("Stock card arranged for itemID: " +
                products[i].itemID +
                "(" +
                (i + 1) +
                "/" +
                products.length +
                ")");
            products[i].currentStock = currentStock;
            yield products[i].save();
        }
        return res.status(200).send({
            message: "Arrange stock card successfully",
        });
    }));
});
exports.default = SearchHelper;
//# sourceMappingURL=search.helper.js.map