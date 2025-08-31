"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv")); // If you load .env here for testing this file directly
dotenv_1.default.config(); // If you load .env here
const redis_helper_1 = require("./helper/redis.helper");
const database_helper_1 = require("./helper/database.helper");
const meili_helper_1 = require("./helper/meili.helper");
const product_service_1 = require("./services/product.service");
const product_repository_1 = require("./repositories/product.repository");
const product_unit_repository_1 = require("./repositories/product-unit.repository");
const package_service_1 = require("./services/package.service");
const product_package_repository_1 = require("./repositories/product-package.repository");
const stock_in_service_1 = require("./services/stock-in.service");
const stock_in_repository_1 = require("./repositories/stock-in.repository");
const good_receipt_repository_1 = require("./repositories/good-receipt.repository");
const stock_out_service_1 = require("./services/stock-out.service");
const stock_out_repository_1 = require("./repositories/stock-out.repository");
const stock_card_service_1 = require("./services/stock-card.service");
const stock_card_repository_1 = require("./repositories/stock-card.repository");
const sales_invoice_service_1 = require("./services/sales-invoice.service");
const sales_invoice_repository_1 = require("./repositories/sales-invoice.repository");
const product_stock_repository_1 = require("./repositories/product-stock.repository");
const product_stock_service_1 = require("./services/product.stock.service");
const adjustment_case_repository_1 = require("./repositories/adjustment-case.repository");
const sales_return_repository_1 = require("./repositories/sales-return.repository");
async function connect() {
    await database_helper_1.prisma.$connect();
    console.info("[info]: Connected with database using Prisma");
    await redis_helper_1.redisClient.connect();
    console.info("[info]: Connected with redis");
}
async function setupDatabase() {
    try {
        await meili_helper_1.meili.getIndex("product");
        console.info("[info]: Product index already exists, skipping creation");
    }
    catch (error) {
        if (error.code === "index_not_found") {
            console.info("[info]: Product index not found, creating index...");
            const createProduct = await meili_helper_1.meili.createIndex("product", {
                primaryKey: "id",
            });
            console.info("[info]: Product index created successfully");
            await meili_helper_1.meili.waitForTask(createProduct.taskUid);
            const productSettingTask = await meili_helper_1.meili.index("product").updateSettings({
                filterableAttributes: [
                    "product_brand_id",
                    "product_type_id",
                    "is_active",
                    "is_delete",
                ],
                sortableAttributes: ["created_at", "reference", "description"],
            });
            await meili_helper_1.meili.waitForTask(productSettingTask.taskUid);
            console.info("Product database initialized");
        }
    }
    try {
        await meili_helper_1.meili.getIndex("package");
        console.info("[info]: Package index already exists, skipping creation");
    }
    catch (error) {
        if (error.code === "index_not_found") {
            const createProductPackage = await meili_helper_1.meili.createIndex("package", {
                primaryKey: "id",
            });
            await meili_helper_1.meili.waitForTask(createProductPackage.taskUid);
            const productPackageSettingTask = await meili_helper_1.meili
                .index("package")
                .updateSettings({
                filterableAttributes: ["is_delete"],
                sortableAttributes: ["name", "description"],
            });
            await meili_helper_1.meili.waitForTask(productPackageSettingTask.taskUid);
            console.info("Package database initialized");
        }
    }
}
async function syncProduct() {
    const productService = new product_service_1.ProductService(new product_repository_1.ProductRepository(database_helper_1.prisma), new product_unit_repository_1.ProductUnitRepository(database_helper_1.prisma));
    await meili_helper_1.meili.index("product").deleteAllDocuments();
    const products = await productService.fetchAll();
    console.info(`[info]: Fetched ${products.length} products from database`);
    // add all products to meili
    const chunkSize = 1000; // Define your chunk size
    for (let i = 0; i < products.length; i += chunkSize) {
        const chunk = products.slice(i, i + chunkSize);
        const productInsertTask = await meili_helper_1.meili.index("product").addDocuments(chunk);
        await meili_helper_1.meili.waitForTask(productInsertTask.taskUid);
        console.info(`[info]: Inserted chunk ${Math.floor(i / chunkSize) + 1}`);
    }
    console.info(`[info]: Product database successfully inserted`);
}
async function syncProductPackage() {
    const packageService = new package_service_1.ProductPackageService(new product_package_repository_1.ProductPackageRepository(database_helper_1.prisma));
    await meili_helper_1.meili.index("package").deleteAllDocuments();
    const productPackages = await packageService.fetchAll();
    console.info(`[info]: Fetched ${productPackages.length} product packages from database`);
    const productPackageInsertTask = await meili_helper_1.meili
        .index("package")
        .addDocuments([productPackages]);
    await meili_helper_1.meili.waitForTask(productPackageInsertTask.taskUid);
    console.info(`[info]: Product package database successfully inserted`);
}
async function syncSales() {
    const salesInvoiceService = new sales_invoice_service_1.SalesInvoiceService(new sales_invoice_repository_1.SalesInvoiceRepository(database_helper_1.prisma), new product_stock_repository_1.ProductStockRepository(database_helper_1.prisma), new stock_card_repository_1.StockCardRepository(database_helper_1.prisma), new stock_out_repository_1.StockOutRepository(database_helper_1.prisma));
    await salesInvoiceService.syncSales();
    console.info(`[info]: Sales successfully synced`);
}
async function updateProductStock() {
    console.info(`Commencing product stock update`);
    const productStockService = new product_stock_service_1.ProductStockService(new product_stock_repository_1.ProductStockRepository(database_helper_1.prisma), new good_receipt_repository_1.GoodReceiptRepository(database_helper_1.prisma), new adjustment_case_repository_1.AdjustmentCaseRepository(database_helper_1.prisma), new sales_invoice_repository_1.SalesInvoiceRepository(database_helper_1.prisma), new sales_return_repository_1.SalesReturnRepository(database_helper_1.prisma), new product_repository_1.ProductRepository(database_helper_1.prisma));
    console.info(`Product stock service initialized`);
    await productStockService.updateProductStock();
}
async function insertStockInOut() {
    const stockInService = new stock_in_service_1.StockInService(new stock_in_repository_1.StockInRepository(database_helper_1.prisma));
    const stockOutService = new stock_out_service_1.StockOutService(new stock_out_repository_1.StockOutRepository(database_helper_1.prisma), new stock_in_repository_1.StockInRepository(database_helper_1.prisma));
    console.info(`[info]: Start inserting stock in data`);
    await stockInService.delete();
    await stockInService.insertFromDocuments();
    console.info(`[info]: Stock in successfully inserted`);
    console.info(`[info]: Start inserting stock out data`);
    await stockOutService.delete();
    await stockOutService.insertFromDocuments();
    console.info(`[info]: Stock out successfully inserted`);
}
async function insertStockOut() {
    const stockOutService = new stock_out_service_1.StockOutService(new stock_out_repository_1.StockOutRepository(database_helper_1.prisma), new stock_in_repository_1.StockInRepository(database_helper_1.prisma));
    console.info(`[info]: Start inserting stock out data`);
    await stockOutService.delete();
    await stockOutService.insertFromDocuments();
    console.info(`[info]: Stock out successfully inserted`);
}
async function calculateStockOut() {
    const stockOutService = new stock_out_service_1.StockOutService(new stock_out_repository_1.StockOutRepository(database_helper_1.prisma), new stock_in_repository_1.StockInRepository(database_helper_1.prisma));
    try {
        await stockOutService.calculateStockOut();
    }
    catch (error) {
        console.error(`[error]: Error on calculating HPP ${error}`);
    }
}
async function insertStockCard() {
    const stockCardService = new stock_card_service_1.StockCardService(new stock_card_repository_1.StockCardRepository(database_helper_1.prisma));
    await stockCardService.startup();
}
async function orderStockCard() {
    const stockCardService = new stock_card_service_1.StockCardService(new stock_card_repository_1.StockCardRepository(database_helper_1.prisma));
    await stockCardService.reorder();
}
async function createIndexes() {
    await meili_helper_1.meili.createIndex("product", {
        primaryKey: "id",
    });
    await meili_helper_1.meili.createIndex("package", {
        primaryKey: "id",
    });
}
async function runFunction(funcName) {
    await connect();
    switch (funcName) {
        case "setupDatabase":
            await setupDatabase();
            process.exit(0);
        case "syncProduct":
            await syncProduct();
            process.exit(0);
        case "syncProductPackage":
            await syncProductPackage();
            process.exit(0);
        case "updateProductStock":
            await updateProductStock();
            process.exit(0);
        case "insertStockInOut":
            await insertStockInOut();
            process.exit(0);
        case "insertStockOut":
            await insertStockOut();
            process.exit(0);
        case "calculateStockOut":
            await calculateStockOut();
            process.exit(0);
        case "insertStockCard":
            await insertStockCard();
            process.exit(0);
        case "orderStockCard":
            await orderStockCard();
            process.exit(0);
        case "syncSales":
            await syncSales();
            process.exit(0);
        default:
            console.error("[error]: Function not found");
            process.exit(0);
    }
}
const args = process.argv.slice(2);
if (args.length > 0) {
    runFunction(args[0]);
}
else {
    console.error("[error]: No function specified");
}
//# sourceMappingURL=startup.js.map