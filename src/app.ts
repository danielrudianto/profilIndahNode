import dotenv from "dotenv"; // If you load .env here for testing this file directly
dotenv.config(); // If you load .env here

import express from "express";
import cors from "cors";
import http from "http";
import cron from "node-cron";
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
import salesDepositRoutes from "./routes/transaction/sales-deposit.route";
import adjustmentEventRoutes from "./routes/transaction/adjustment-case.route";
import reportRoutes from "./routes/report/report.route";
import dashboardRoutes from "./routes/report/dashboard.route";
import salesReturnRoutes from "./routes/transaction/sales-return.route";
import DraftBillRoutes from "./routes/transaction/draft-bill.route";
import OverpaymentRoutes from "./routes/transaction/overpayment.route";
import CashierRoutes from "./routes/distinct/cashier.route";
import PromotionRoutes from "./routes/master/promotion.route";
import ReceivableRoutes from "./routes/transaction/receivable.route";
import SalesmanRoutes from "./routes/master/salesman.route";

/*
  Administrator Routes
*/
import administratorRoutes from "./routes/distinct/administrator.route";
import warehouseRoutes from "./routes/distinct/warehouse.route";
import osRoutes from "./routes/distinct/os.route";
import changelogRoutes from "./routes/report/changelog.route";

/*
  Importing other
*/
import compression from "compression";
import helmet from "helmet";

import { connectRedis, redisClient } from "./helper/redis.helper";
import { prisma } from "./helper/database.helper";
import { StockOutService } from "./services/stock-out.service";
import { StockOutRepository } from "./repositories/stock-out.repository";
import { StockInRepository } from "./repositories/stock-in.repository";

const allowedOrigins = [
  "https://stock.profilindah.id",
  "https://v16.profilindah.id",
  "https://v19.profilindah.id",
  "https://warehouse.profilindah.id",
  "http://localhost:2100",
];

const options: cors.CorsOptions = {
  origin: allowedOrigins,
};

async function main() {
  await prisma.$connect();
  console.info("[info]: Connected with database using Prisma");

  await redisClient.connect();
  console.info("[info]: Connected with redis");

  const stockOutService = new StockOutService(
    new StockOutRepository(prisma),
    new StockInRepository(prisma)
  );

  // await stockOutService.calculateStockOut();

  cron.schedule("0 0 * * *", async () => {
    // Assigning stock out to stock in
    await stockOutService.calculateStockOut();
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
  app.use("/salesman", authMiddleware, SalesmanRoutes);

  app.use("/supplier", authMiddleware, supplierRoutes);
  app.use("/customer", authMiddleware, customerRoutes);
  app.use("/company", authMiddleware, companyRoutes);
  app.use("/payment-method", authMiddleware, paymentMethodRoutes);
  app.use("/expense-type", authMiddleware, expenseTypeRoutes);

  app.use("/adjustment-case", authMiddleware, adjustmentEventRoutes);
  app.use("/sales-return", authMiddleware, salesReturnRoutes);

  app.use("/good-receipt", authMiddleware, goodReceiptRoutes);
  app.use("/purchase-invoice", authMiddleware, purchaseInvoiceRoutes);
  app.use("/sales-invoice", authMiddleware, salesInvoiceRoutes);
  app.use("/sales-deposit", authMiddleware, salesDepositRoutes);
  app.use("/draft-bill", authMiddleware, DraftBillRoutes);
  app.use("/overpayment", authMiddleware, OverpaymentRoutes);
  app.use("/cashier", authMiddleware, CashierRoutes);

  app.use("/user", authMiddleware, userRoutes);
  app.use("/user-avatar", authMiddleware, userAvatarRoutes);
  app.use("/expense", authMiddleware, expenseRoutes);
  app.use("/report", reportRoutes);
  app.use("/dashboard", authMiddleware, dashboardRoutes);
  app.use("/receivable", authMiddleware, ReceivableRoutes);

  app.use("/administrator", administratorRoutes);
  app.use("/warehouse", warehouseRoutes);
  app.use("/os", osRoutes);
  app.use("/changelog", changelogRoutes);

  const server = http.createServer(app);
  server.listen(5000, () => {
    console.info("[server]: Server is running on port 5000");
  });

  const io = initIO(server);

  io.on("connection", () => {
    console.info("New connection established");
  });

  connectRedis();
  console.info("Redis client is connected");
}

main();
