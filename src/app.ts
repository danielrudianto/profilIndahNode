import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { MeiliSearch } from "meilisearch";
import cron from "node-cron";
import { createClient } from "redis";
import { initIO } from "./helper/io";

import { authMiddleware } from "./helper/auth.helper";
import authRoutes from "./routes/authentication/auth.route";
/*
  Routes for master data
*/
import productRoutes from "./routes/master/product.route";
import productPackageRoutes from "./routes/master/product-package.route";
import productSalesPriceRoutes from "./routes/master/product-price-sales.route";
import productPurchasePriceRoutes from "./routes/master/product-price-purchase.route";
import productBrandRoutes from "./routes/master/product-brand.route";
import productTypeRoutes from "./routes/master/product-type.route";
import productUnitRoutes from "./routes/master/product-unit.route";
import productStockRoutes from "./routes/report/stock.route";

import supplierRoutes from "./routes/master/supplier.route";
import customerRoutes from "./routes/master/customer.route";
import companyRoutes from "./routes/master/company.route";
import paymentMethodRoutes from "./routes/master/payment-method.route";
import expenseTypeRoutes from "./routes/master/expense-type.route";
/*
  Routes for transactions data
*/
import goodReceiptRoutes from "./routes/transaction/good-receipt.route";
import purchaseInvoiceRoutes from "./routes/transaction/purchase-invoice.route";
import userRoutes from "./routes/master/user.route";
import userAvatarRoutes from "./routes/master/user-avatar.route";
import expenseRoutes from "./routes/transaction/expense.route";
import salesInvoiceRoutes from "./routes/transaction/sales-invoice.route";
import adjustmentEventRoutes from "./routes/transaction/adjustment-case.route";
import reportRoutes from "./routes/report/report.route";
import salesReturnRoutes from "./routes/transaction/sales-return.route";
import DraftBillRoutes from "./routes/transaction/draft-bill.route";
import CashierRoutes from "./routes/distinct/cashier.route";
import PromotionRoutes from "./routes/master/promotion.route";
import DepositRoutes from "./routes/transaction/deposit.route";
import ReceivableRoutes from "./routes/transaction/receivable.route";

/*
  Administrator Routes
*/

import administratorRoutes from "./routes/distinct/administrator.route";
import developmentRoutes from "./routes/development/development.routes";
import warehouseRoutes from "./routes/distinct/warehouse.route";
import osRoutes from "./routes/distinct/os.route";
import changelogRoutes from "./routes/report/changelog.route";
import mongoose from "mongoose";
import { PrismaClient } from "@prisma/client";
import { queue } from "./helper/queue.helper";
import ReceivableController from "./controller/receivable.controller";
import compression from "compression";
import helmet from "helmet";

export const prisma = new PrismaClient({ log: ["query", "info"] });
export const redisClient = createClient({ url: "redis://127.0.0.1:6379" });

const allowedOrigins = [
  "http://localhost:2100",
  "https://app.profilindah.id",
  "https://stock.profilindah.id",
  "https://v16.profilindah.id",
];

const options: cors.CorsOptions = {
  origin: allowedOrigins,
};

async function main() {
  await prisma.$connect();
  console.info("[info]: Connected with database using Prisma");

  const url = "mongodb://127.0.0.1:27017/ProfilIndah";
  await mongoose.connect(url, {
    dbName: "ProfilIndah",
    autoCreate: true,
  });
  console.info("[info]: Connected with database");

  await redisClient.connect();
  console.info("[info]: Connected with redis");

  ReceivableController.checkReceivable();
  console.info("[info]: Checking receivable");

  // Every day at midnight check for overflow
  cron.schedule("0 0 * * *", async () => {
    console.log("[info]: Checking for overflow");
    await queue.add("check-all-overflow", {});
  });

  // Schedule for checking receivable
  cron.schedule("0 0 * * *", async () => {
    console.log("[info]: Checking receivable");
    ReceivableController.checkReceivable();
  });

  const app = express();
  app.use(compression());
  app.use(helmet());
  app.use(cors(options));

  app.use(express.urlencoded({ extended: true, limit: "100mb" }));
  app.use(express.json({ limit: "50mb" }));

  app.use("/auth", authRoutes);
  app.use("/product", authMiddleware, productRoutes);
  app.use("/product-price-sales", authMiddleware, productSalesPriceRoutes);
  app.use(
    "/product-price-purchase",
    authMiddleware,
    productPurchasePriceRoutes
  );
  app.use("/product-brand", authMiddleware, productBrandRoutes);
  app.use("/product-type", authMiddleware, productTypeRoutes);
  app.use("/product-unit", authMiddleware, productUnitRoutes);
  app.use("/product-stock", authMiddleware, productStockRoutes);
  app.use("/product-package", authMiddleware, productPackageRoutes);
  app.use("/promotion", authMiddleware, PromotionRoutes);
  app.use("/deposit", authMiddleware, DepositRoutes);

  app.use("/supplier", authMiddleware, supplierRoutes);
  app.use("/customer", authMiddleware, customerRoutes);
  app.use("/company", authMiddleware, companyRoutes);
  app.use("/payment-method", authMiddleware, paymentMethodRoutes);
  app.use("/expense-type", authMiddleware, expenseTypeRoutes);

  app.use("/adjustment-event", authMiddleware, adjustmentEventRoutes);
  app.use("/sales-return", authMiddleware, salesReturnRoutes);

  app.use("/good-receipt", authMiddleware, goodReceiptRoutes);
  app.use("/purchase-invoice", authMiddleware, purchaseInvoiceRoutes);
  app.use("/sales-invoice", authMiddleware, salesInvoiceRoutes);
  app.use("/draft-bill", authMiddleware, DraftBillRoutes);
  app.use("/cashier", authMiddleware, CashierRoutes);

  app.use("/user", authMiddleware, userRoutes);
  app.use("/user-avatar", authMiddleware, userAvatarRoutes);
  app.use("/expense", authMiddleware, expenseRoutes);
  app.use("/report", reportRoutes);
  app.use("/receivable", authMiddleware, ReceivableRoutes);

  app.use("/administrator", administratorRoutes);
  app.use("/warehouse", warehouseRoutes);
  app.use("/os", osRoutes);
  app.use("/changelog", changelogRoutes);
  app.use("/development", developmentRoutes);

  const server = http.createServer(app);
  server.listen(5000, () => {
    console.log("[server]: Server is running on port 5000");
  });

  const io = initIO(server);

  io.on("connection", () => {
    console.log("New connection established");
  });
}

main();
