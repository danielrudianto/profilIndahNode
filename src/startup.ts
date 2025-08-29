import dotenv from "dotenv"; // If you load .env here for testing this file directly
dotenv.config(); // If you load .env here

import { connectRedis, redisClient } from "./helper/redis.helper";
import { prisma } from "./helper/database.helper";
import { meili } from "./helper/meili.helper";
import { ProductService } from "./services/product.service";
import { ProductRepository } from "./repositories/product.repository";
import { ProductUnitRepository } from "./repositories/product-unit.repository";
import { ProductPackageService } from "./services/package.service";
import { ProductPackageRepository } from "./repositories/product-package.repository";
import { StockInService } from "./services/stock-in.service";
import { StockInRepository } from "./repositories/stock-in.repository";
import { GoodReceiptService } from "./services/good-receipt.service";
import { GoodReceiptRepository } from "./repositories/good-receipt.repository";
import { StockOutService } from "./services/stock-out.service";
import { StockOutRepository } from "./repositories/stock-out.repository";
import { StockCardService } from "./services/stock-card.service";
import { StockCardRepository } from "./repositories/stock-card.repository";
import { SalesInvoiceService } from "./services/sales-invoice.service";
import { SalesInvoiceRepository } from "./repositories/sales-invoice.repository";
import { ProductStockRepository } from "./repositories/product-stock.repository";
import { ProductStockService } from "./services/product.stock.service";
import { AdjustmentCaseRepository } from "./repositories/adjustment-case.repository";
import { SalesReturnRepository } from "./repositories/sales-return.repository";

async function connect() {
  await prisma.$connect();
  console.info("[info]: Connected with database using Prisma");

  await redisClient.connect();
  console.info("[info]: Connected with redis");
}

async function setupDatabase() {
  try {
    await meili.getIndex("product");
    console.info("[info]: Product index already exists, skipping creation");
  } catch (error: any) {
    if (error.code === "index_not_found") {
      console.info("[info]: Product index not found, creating index...");
      const createProduct = await meili.createIndex("product", {
        primaryKey: "id",
      });

      console.info("[info]: Product index created successfully");

      await meili.waitForTask(createProduct.taskUid);
      const productSettingTask = await meili.index("product").updateSettings({
        filterableAttributes: [
          "product_brand_id",
          "product_type_id",
          "is_active",
          "is_delete",
        ],
        sortableAttributes: ["created_at", "reference", "description"],
      });
      await meili.waitForTask(productSettingTask.taskUid);
      console.info("Product database initialized");
    }
  }

  try {
    await meili.getIndex("package");
    console.info("[info]: Package index already exists, skipping creation");
  } catch (error: any) {
    if (error.code === "index_not_found") {
      const createProductPackage = await meili.createIndex("package", {
        primaryKey: "id",
      });

      await meili.waitForTask(createProductPackage.taskUid);
      const productPackageSettingTask = await meili
        .index("package")
        .updateSettings({
          filterableAttributes: ["is_delete"],
          sortableAttributes: ["name", "description"],
        });
      await meili.waitForTask(productPackageSettingTask.taskUid);
      console.info("Package database initialized");
    }
  }
}

async function syncProduct() {
  const productService = new ProductService(
    new ProductRepository(prisma),
    new ProductUnitRepository(prisma)
  );

  await meili.index("product").deleteAllDocuments();

  const products = await productService.fetchAll();
  console.info(`[info]: Fetched ${products.length} products from database`);

  // add all products to meili
  const chunkSize = 1000; // Define your chunk size
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const productInsertTask = await meili.index("product").addDocuments(chunk);
    await meili.waitForTask(productInsertTask.taskUid);
    console.info(`[info]: Inserted chunk ${Math.floor(i / chunkSize) + 1}`);
  }

  console.info(`[info]: Product database successfully inserted`);
}

async function syncProductPackage() {
  const packageService = new ProductPackageService(
    new ProductPackageRepository(prisma)
  );

  await meili.index("package").deleteAllDocuments();

  const productPackages = await packageService.fetchAll();
  console.info(
    `[info]: Fetched ${productPackages.length} product packages from database`
  );

  const productPackageInsertTask = await meili
    .index("package")
    .addDocuments([productPackages]);
  await meili.waitForTask(productPackageInsertTask.taskUid);
  console.info(`[info]: Product package database successfully inserted`);
}

async function syncSales() {
  const salesInvoiceService = new SalesInvoiceService(
    new SalesInvoiceRepository(prisma),
    new ProductStockRepository(prisma),
    new StockCardRepository(prisma),
    new StockOutRepository(prisma)
  );

  await salesInvoiceService.syncSales();

  console.info(`[info]: Sales successfully synced`);
}

async function updateProductStock() {
  console.info(`Commencing product stock update`);
  const productStockService = new ProductStockService(
    new ProductStockRepository(prisma),
    new GoodReceiptRepository(prisma),
    new AdjustmentCaseRepository(prisma),
    new SalesInvoiceRepository(prisma),
    new SalesReturnRepository(prisma),
    new ProductRepository(prisma)
  );
  console.info(`Product stock service initialized`);

  await productStockService.updateProductStock();
}

async function insertStockInOut() {
  const stockInService = new StockInService(new StockInRepository(prisma));
  const stockOutService = new StockOutService(
    new StockOutRepository(prisma),
    new StockInRepository(prisma)
  );

  console.info(`[info]: Start inserting stock in data`);

  await stockInService.delete();
  await stockInService.insertFromDocuments();

  console.info(`[info]: Stock in successfully inserted`);

  console.info(`[info]: Start inserting stock out data`);

  await stockOutService.delete();
  await stockOutService.insertFromDocuments();

  console.info(`[info]: Stock out successfully inserted`);
}

async function calculateStockOut() {
  const stockOutService = new StockOutService(
    new StockOutRepository(prisma),
    new StockInRepository(prisma)
  );
  try {
    await stockOutService.calculateStockOut();
  } catch (error) {
    console.error(`[error]: Error on calculating HPP ${error}`);
  }
}

async function insertStockCard() {
  const stockCardService = new StockCardService(
    new StockCardRepository(prisma)
  );
  await stockCardService.startup();
}

async function createIndexes() {
  await meili.createIndex("product", {
    primaryKey: "id",
  });

  await meili.createIndex("package", {
    primaryKey: "id",
  });
}

async function runFunction(funcName: string) {
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
    case "calculateStockOut":
      await calculateStockOut();
      process.exit(0);
    case "insertStockCard":
      await insertStockCard();
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
} else {
  console.error("[error]: No function specified");
}
