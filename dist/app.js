"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.meili = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const meilisearch_1 = require("meilisearch");
const auth_helper_1 = require("./helper/auth.helper");
const auth_route_1 = __importDefault(require("./routes/authentication/auth.route"));
/*
  Routes for master data
*/
const product_route_1 = __importDefault(require("./routes/master/product.route"));
const product_price_sales_route_1 = __importDefault(require("./routes/master/product-price-sales.route"));
const product_price_purchase_route_1 = __importDefault(require("./routes/master/product-price-purchase.route"));
const product_brand_route_1 = __importDefault(require("./routes/master/product-brand.route"));
const product_type_route_1 = __importDefault(require("./routes/master/product-type.route"));
const product_unit_route_1 = __importDefault(require("./routes/master/product-unit.route"));
const stock_route_1 = __importDefault(require("./routes/report/stock.route"));
const supplier_route_1 = __importDefault(require("./routes/master/supplier.route"));
const customer_route_1 = __importDefault(require("./routes/master/customer.route"));
const company_route_1 = __importDefault(require("./routes/master/company.route"));
const payment_method_route_1 = __importDefault(require("./routes/master/payment_method.route"));
const expense_type_route_1 = __importDefault(require("./routes/master/expense-type.route"));
/*
  Routes for transactions data
*/
const good_receipt_route_1 = __importDefault(require("./routes/transaction/good-receipt.route"));
const purchase_invoice_route_1 = __importDefault(require("./routes/transaction/purchase-invoice.route"));
const user_route_1 = __importDefault(require("./routes/master/user.route"));
const expense_route_1 = __importDefault(require("./routes/transaction/expense.route"));
const sales_invoice_route_1 = __importDefault(require("./routes/transaction/sales-invoice.route"));
const adjustment_event_route_1 = __importDefault(require("./routes/transaction/adjustment-event.route"));
const report_route_1 = __importDefault(require("./routes/report/report.route"));
const sales_return_route_1 = __importDefault(require("./routes/transaction/sales_return.route"));
const draft_bill_route_1 = __importDefault(require("./routes/transaction/draft-bill.route"));
const cashier_route_1 = __importDefault(require("./routes/distinct/cashier.route"));
/*
  Helpers
*/
const search_helper_1 = __importDefault(require("./helper/search.helper"));
const product_stock_controller_1 = __importDefault(require("./controller/product-stock.controller"));
const draft_bill_controller_1 = __importDefault(require("./controller/draft-bill.controller"));
/*
  Administrator Routes
*/
const adminsitrator_route_1 = __importDefault(require("./routes/distinct/adminsitrator.route"));
exports.meili = new meilisearch_1.MeiliSearch({
    host: "http://localhost:7700",
    apiKey: "UTw9kRYvov_K4fd1mQnDFKpdcxXVevHPcVEPWWlTVSg",
});
const allowedOrigins = [
    "http://localhost:4200",
    "https://app.profilindah.id",
    "https://stock.profilindah.id",
];
const options = {
    origin: allowedOrigins,
};
const app = (0, express_1.default)();
app.use((0, cors_1.default)(options));
app.use(express_1.default.urlencoded({ extended: true, limit: "100mb" }));
app.use(express_1.default.json());
app.use("/auth", auth_route_1.default);
app.use("/product", auth_helper_1.authMiddleware, product_route_1.default);
app.use("/product-price-sales", auth_helper_1.authMiddleware, product_price_sales_route_1.default);
app.use("/product-price-purchase", auth_helper_1.authMiddleware, product_price_purchase_route_1.default);
app.use("/product-brand", auth_helper_1.authMiddleware, product_brand_route_1.default);
app.use("/product-type", auth_helper_1.authMiddleware, product_type_route_1.default);
app.use("/product-unit", auth_helper_1.authMiddleware, product_unit_route_1.default);
app.use("/product-stock", auth_helper_1.authMiddleware, stock_route_1.default);
app.use("/supplier", auth_helper_1.authMiddleware, supplier_route_1.default);
app.use("/customer", auth_helper_1.authMiddleware, customer_route_1.default);
app.use("/company", auth_helper_1.authMiddleware, company_route_1.default);
app.use("/payment-method", auth_helper_1.authMiddleware, payment_method_route_1.default);
app.use("/expense-type", auth_helper_1.authMiddleware, expense_type_route_1.default);
app.use("/adjustment-event", auth_helper_1.authMiddleware, adjustment_event_route_1.default);
app.use("/sales-return", auth_helper_1.authMiddleware, sales_return_route_1.default);
app.use("/good-receipt", auth_helper_1.authMiddleware, good_receipt_route_1.default);
app.use("/purchase-invoice", auth_helper_1.authMiddleware, purchase_invoice_route_1.default);
app.use("/sales-invoice", auth_helper_1.authMiddleware, sales_invoice_route_1.default);
app.use("/draft-bill", auth_helper_1.authMiddleware, draft_bill_route_1.default);
app.use("/cashier", auth_helper_1.authMiddleware, cashier_route_1.default);
app.use("/user", auth_helper_1.authMiddleware, user_route_1.default);
app.use("/expense", auth_helper_1.authMiddleware, expense_route_1.default);
app.use("/report", report_route_1.default);
app.use("/administrator", auth_helper_1.authMiddleware, adminsitrator_route_1.default);
const server = http_1.default.createServer(app);
server.listen(5000, () => {
    search_helper_1.default.scheduleData();
    product_stock_controller_1.default.scheduleData();
    draft_bill_controller_1.default.truncateData();
    console.log("[server]: Server is running on port 5000");
});
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: "*",
    },
});
exports.io.on("connection", () => { });
exports.default = app;
