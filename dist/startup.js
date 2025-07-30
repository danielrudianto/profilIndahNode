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
const stock_out_service_1 = require("./services/stock-out.service");
const stock_out_repository_1 = require("./repositories/stock-out.repository");
const stock_card_service_1 = require("./services/stock-card.service");
const stock_card_repository_1 = require("./repositories/stock-card.repository");
async function connect() {
    await database_helper_1.prisma.$connect();
    console.info("[info]: Connected with database using Prisma");
    await redis_helper_1.redisClient.connect();
    console.info("[info]: Connected with redis");
}
async function syncProduct() {
    const productService = new product_service_1.ProductService(new product_repository_1.ProductRepository(database_helper_1.prisma), new product_unit_repository_1.ProductUnitRepository(database_helper_1.prisma));
    await meili_helper_1.meili.index("product").delete();
    const createProduct = await meili_helper_1.meili.createIndex("product", {
        primaryKey: "id",
    });
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
    console.info(`[info]: Product database successfully initialized`);
    const products = await productService.fetchAll();
    console.info(`[info]: Fetched ${products.length} products from database`);
    // add all products to meili
    const productInsertTask = await meili_helper_1.meili.index("product").addDocuments(products);
    await meili_helper_1.meili.waitForTask(productInsertTask.taskUid);
    console.info(`[info]: Product database successfully inserted`);
}
async function syncProductPackage() {
    const packageService = new package_service_1.ProductPackageService(new product_package_repository_1.ProductPackageRepository(database_helper_1.prisma));
    await meili_helper_1.meili.index("package").delete();
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
    console.info(`[info]: Product package database successfully initialized`);
    const productPackages = await packageService.fetchAll();
    console.info(`[info]: Fetched ${productPackages.length} product packages from database`);
    const productPackageInsertTask = await meili_helper_1.meili
        .index("package")
        .addDocuments(productPackages);
    await meili_helper_1.meili.waitForTask(productPackageInsertTask.taskUid);
    console.info(`[info]: Product package database successfully inserted`);
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
    console.info(`[info]: Start calculating stock out`);
    await stockOutService.calculateStockOut();
}
async function insertStockCard() {
    const stockCardService = new stock_card_service_1.StockCardService(new stock_card_repository_1.StockCardRepository(database_helper_1.prisma));
    await stockCardService.startup();
}
async function runFunction(funcName) {
    await connect();
    switch (funcName) {
        case "syncProduct":
            await syncProduct();
            break;
        case "syncProductPackage":
            await syncProductPackage();
            break;
        case "insertStockInOut":
            await insertStockInOut();
            break;
        case "insertStockCard":
            await insertStockCard();
        default:
            console.error("[error]: Function not found");
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