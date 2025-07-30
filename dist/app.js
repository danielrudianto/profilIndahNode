"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv")); // If you load .env here for testing this file directly
dotenv_1.default.config(); // If you load .env here
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const node_cron_1 = __importDefault(require("node-cron"));
const io_1 = require("./helper/io");
const auth_helper_1 = require("./helper/auth.helper");
const auth_route_1 = __importDefault(require("./routes/authentication/auth.route"));
/*
  Routes for master data
*/
const product_route_1 = __importDefault(require("./routes/master/product.route"));
const product_package_route_1 = __importDefault(require("./routes/master/product-package.route"));
const product_price_sales_route_1 = __importDefault(require("./routes/master/product-price-sales.route"));
const product_price_purchase_route_1 = __importDefault(require("./routes/master/product-price-purchase.route"));
const product_brand_route_1 = __importDefault(require("./routes/master/product-brand.route"));
const product_type_route_1 = __importDefault(require("./routes/master/product-type.route"));
const product_unit_route_1 = __importDefault(require("./routes/master/product-unit.route"));
const stock_route_1 = __importDefault(require("./routes/report/stock.route"));
const supplier_route_1 = __importDefault(require("./routes/master/supplier.route"));
const customer_route_1 = __importDefault(require("./routes/master/customer.route"));
const company_route_1 = __importDefault(require("./routes/master/company.route"));
const payment_method_route_1 = __importDefault(require("./routes/master/payment-method.route"));
const expense_type_route_1 = __importDefault(require("./routes/master/expense-type.route"));
/*
  Routes for transactions data
*/
const good_receipt_route_1 = __importDefault(require("./routes/transaction/good-receipt.route"));
const purchase_invoice_route_1 = __importDefault(require("./routes/transaction/purchase-invoice.route"));
const user_route_1 = __importDefault(require("./routes/master/user.route"));
const user_avatar_route_1 = __importDefault(require("./routes/master/user-avatar.route"));
const expense_route_1 = __importDefault(require("./routes/transaction/expense.route"));
const sales_invoice_route_1 = __importDefault(require("./routes/transaction/sales-invoice.route"));
const sales_deposit_route_1 = __importDefault(require("./routes/transaction/sales-deposit.route"));
const adjustment_case_route_1 = __importDefault(require("./routes/transaction/adjustment-case.route"));
const report_route_1 = __importDefault(require("./routes/report/report.route"));
const dashboard_route_1 = __importDefault(require("./routes/report/dashboard.route"));
const sales_return_route_1 = __importDefault(require("./routes/transaction/sales-return.route"));
const draft_bill_route_1 = __importDefault(require("./routes/transaction/draft-bill.route"));
const overpayment_route_1 = __importDefault(require("./routes/transaction/overpayment.route"));
const cashier_route_1 = __importDefault(require("./routes/distinct/cashier.route"));
const promotion_route_1 = __importDefault(require("./routes/master/promotion.route"));
const receivable_route_1 = __importDefault(require("./routes/transaction/receivable.route"));
const salesman_route_1 = __importDefault(require("./routes/master/salesman.route"));
/*
  Administrator Routes
*/
const administrator_route_1 = __importDefault(require("./routes/distinct/administrator.route"));
const development_routes_1 = __importDefault(require("./routes/development/development.routes"));
const warehouse_route_1 = __importDefault(require("./routes/distinct/warehouse.route"));
const os_route_1 = __importDefault(require("./routes/distinct/os.route"));
const changelog_route_1 = __importDefault(require("./routes/report/changelog.route"));
/*
  Importing other
*/
const mongoose_1 = __importDefault(require("mongoose"));
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const redis_helper_1 = require("./helper/redis.helper");
const database_helper_1 = require("./helper/database.helper");
const allowedOrigins = [
    "http://localhost:2100",
    "https://app.profilindah.id",
    "https://stock.profilindah.id",
    "https://v16.profilindah.id",
];
const options = {
    origin: allowedOrigins,
};
async function main() {
    await database_helper_1.prisma.$connect();
    console.info("[info]: Connected with database using Prisma");
    const url = "mongodb://127.0.0.1:27017/ProfilIndah";
    await mongoose_1.default.connect(url, {
        dbName: "ProfilIndah",
        autoCreate: true,
    });
    console.info("[info]: Connected with database");
    await redis_helper_1.redisClient.connect();
    console.info("[info]: Connected with redis");
    // Every day at midnight check for overflow
    node_cron_1.default.schedule("0 0 * * *", async () => {
        // Assigning
    });
    const app = (0, express_1.default)();
    app.use((0, compression_1.default)());
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)(options));
    app.use(express_1.default.urlencoded({ extended: true, limit: "100mb" }));
    app.use(express_1.default.json({ limit: "50mb" }));
    app.use("/auth", auth_route_1.default);
    app.use("/product", auth_helper_1.authMiddleware, product_route_1.default);
    app.use("/product-price-sales", auth_helper_1.authMiddleware, product_price_sales_route_1.default);
    app.use("/product-price-purchase", auth_helper_1.authMiddleware, product_price_purchase_route_1.default);
    app.use("/product-brand", auth_helper_1.authMiddleware, product_brand_route_1.default);
    app.use("/product-type", auth_helper_1.authMiddleware, product_type_route_1.default);
    app.use("/product-unit", auth_helper_1.authMiddleware, product_unit_route_1.default);
    app.use("/product-stock", auth_helper_1.authMiddleware, stock_route_1.default);
    app.use("/product-package", auth_helper_1.authMiddleware, product_package_route_1.default);
    app.use("/promotion", auth_helper_1.authMiddleware, promotion_route_1.default);
    app.use("/salesman", auth_helper_1.authMiddleware, salesman_route_1.default);
    app.use("/supplier", auth_helper_1.authMiddleware, supplier_route_1.default);
    app.use("/customer", auth_helper_1.authMiddleware, customer_route_1.default);
    app.use("/company", auth_helper_1.authMiddleware, company_route_1.default);
    app.use("/payment-method", auth_helper_1.authMiddleware, payment_method_route_1.default);
    app.use("/expense-type", auth_helper_1.authMiddleware, expense_type_route_1.default);
    app.use("/adjustment-case", auth_helper_1.authMiddleware, adjustment_case_route_1.default);
    app.use("/sales-return", auth_helper_1.authMiddleware, sales_return_route_1.default);
    app.use("/good-receipt", auth_helper_1.authMiddleware, good_receipt_route_1.default);
    app.use("/purchase-invoice", auth_helper_1.authMiddleware, purchase_invoice_route_1.default);
    app.use("/sales-invoice", auth_helper_1.authMiddleware, sales_invoice_route_1.default);
    app.use("/sales-deposit", auth_helper_1.authMiddleware, sales_deposit_route_1.default);
    app.use("/draft-bill", auth_helper_1.authMiddleware, draft_bill_route_1.default);
    app.use("/overpayment", auth_helper_1.authMiddleware, overpayment_route_1.default);
    app.use("/cashier", auth_helper_1.authMiddleware, cashier_route_1.default);
    app.use("/user", auth_helper_1.authMiddleware, user_route_1.default);
    app.use("/user-avatar", auth_helper_1.authMiddleware, user_avatar_route_1.default);
    app.use("/expense", auth_helper_1.authMiddleware, expense_route_1.default);
    app.use("/report", report_route_1.default);
    app.use("/dashboard", auth_helper_1.authMiddleware, dashboard_route_1.default);
    app.use("/receivable", auth_helper_1.authMiddleware, receivable_route_1.default);
    app.use("/administrator", administrator_route_1.default);
    app.use("/warehouse", warehouse_route_1.default);
    app.use("/os", os_route_1.default);
    app.use("/changelog", changelog_route_1.default);
    app.use("/development", development_routes_1.default);
    const server = http_1.default.createServer(app);
    server.listen(5000, () => {
        console.log("[server]: Server is running on port 5000");
    });
    const io = (0, io_1.initIO)(server);
    io.on("connection", () => {
        console.log("New connection established");
    });
    (0, redis_helper_1.connectRedis)();
    console.log("Redis client is connected");
}
main();
//# sourceMappingURL=app.js.map