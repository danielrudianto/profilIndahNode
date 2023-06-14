import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { MeiliSearch } from "meilisearch";

import { authMiddleware } from "./helper/auth.helper";

import authRoutes from "./routes/authentication/auth.route";
/*
  Routes for master data
*/
import productRoutes from "./routes/master/product.route";
import productSalesPriceRoutes from "./routes/master/product-price-sales.route";
import productPurchasePriceRoutes from "./routes/master/product-price-purchase.route";
import productBrandRoutes from "./routes/master/product-brand.route";
import productTypeRoutes from "./routes/master/product-type.route";
import productUnitRoutes from "./routes/master/product-unit.route";
import productStockRoutes from "./routes/report/stock.route";

import supplierRoutes from "./routes/master/supplier.route";
import customerRoutes from "./routes/master/customer.route";
import companyRoutes from "./routes/master/company.route";
import paymentMethodRoutes from "./routes/master/payment_method.route";
import expenseTypeRoutes from "./routes/master/expense-type.route";
/*
  Routes for transactions data
*/
import goodReceiptRoutes from "./routes/transaction/good-receipt.route";
import purchaseInvoiceRoutes from "./routes/transaction/purchase-invoice.route";
import userRoutes from "./routes/master/user.route";
import expenseRoutes from "./routes/transaction/expense.route";
import salesInvoiceRoutes from "./routes/transaction/sales-invoice.route";
import adjustmentEventRoutes from "./routes/transaction/adjustment-event.route";
import reportRoutes from "./routes/report/report.route";
import salesReturnRoutes from "./routes/transaction/sales_return.route";
import DraftBillRoutes from "./routes/transaction/draft-bill.route";
import CashierRoutes from "./routes/distinct/cashier.route";

/* 
  Helpers
*/

import SearchHelper from "./helper/search.helper";
import ProductStockController from "./controller/product-stock.controller";
import DraftBillController from "./controller/draft-bill.controller";

/*
  Administrator Routes
*/

import administratorRoutes from "./routes/distinct/adminsitrator.route";

export const meili = new MeiliSearch({
  host: "http://localhost:7700",
  apiKey: "UTw9kRYvov_K4fd1mQnDFKpdcxXVevHPcVEPWWlTVSg",
});

const allowedOrigins = [
  "http://localhost:4200",
  "https://app.profilindah.id",
  "https://stock.profilindah.id",
];

const options: cors.CorsOptions = {
  origin: allowedOrigins,
};

const app = express();
app.use(cors(options));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/product", authMiddleware, productRoutes);
app.use("/product-price-sales", authMiddleware, productSalesPriceRoutes);
app.use("/product-price-purchase", authMiddleware, productPurchasePriceRoutes);
app.use("/product-brand", authMiddleware, productBrandRoutes);
app.use("/product-type", authMiddleware, productTypeRoutes);
app.use("/product-unit", authMiddleware, productUnitRoutes);
app.use("/product-stock", authMiddleware, productStockRoutes);

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
app.use("/expense", authMiddleware, expenseRoutes);
app.use("/report", reportRoutes);

app.use("/administrator", authMiddleware, administratorRoutes);

const server = http.createServer(app);
server.listen(5000, () => {
  SearchHelper.scheduleData();
  ProductStockController.scheduleData();
  DraftBillController.truncateData();

  console.log("[server]: Server is running on port 5000");
});

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: "*",
  },
});

io.on("connection", () => {});

export default app;
