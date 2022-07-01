"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_helper_1 = require("./helper/auth.helper");
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const item_route_1 = __importDefault(require("./routes/item.route"));
const item_price_route_1 = __importDefault(require("./routes/item_price.route"));
const item_purchase_price_route_1 = __importDefault(require("./routes/item_purchase_price.route"));
const brand_route_1 = __importDefault(require("./routes/brand.route"));
const supplier_route_1 = __importDefault(require("./routes/supplier.route"));
const customer_route_1 = __importDefault(require("./routes/customer.route"));
const company_route_1 = __importDefault(require("./routes/company.route"));
const good_receipt_route_1 = __importDefault(require("./routes/good_receipt.route"));
const purchase_document_route_1 = __importDefault(require("./routes/purchase_document.route"));
const user_route_1 = __importDefault(require("./routes/user.route"));
const expense_route_1 = __importDefault(require("./routes/expense.route"));
const socket_connection_helper_1 = require("./helper/socket.connection.helper");
const allowedOrigins = ["http://localhost:4200", "https://app.profilindah.id"];
const options = {
    origin: allowedOrigins,
};
const app = (0, express_1.default)();
app.use((0, cors_1.default)(options));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.use("/auth", auth_route_1.default);
app.use("/item", auth_helper_1.authMiddleware, item_route_1.default);
app.use("/brand", auth_helper_1.authMiddleware, brand_route_1.default);
app.use("/itemPrice", auth_helper_1.authMiddleware, item_price_route_1.default);
app.use("/itemPurchasePrice", auth_helper_1.authMiddleware, item_purchase_price_route_1.default);
app.use("/customer", auth_helper_1.authMiddleware, customer_route_1.default);
app.use("/supplier", auth_helper_1.authMiddleware, supplier_route_1.default);
app.use("/company", auth_helper_1.authMiddleware, company_route_1.default);
app.use("/goodReceipt", auth_helper_1.authMiddleware, good_receipt_route_1.default);
app.use("/purchaseDocument", auth_helper_1.authMiddleware, purchase_document_route_1.default);
app.use("/user", auth_helper_1.authMiddleware, user_route_1.default);
app.use("/expense", auth_helper_1.authMiddleware, expense_route_1.default);
app.listen(5000, () => {
    console.log("Application running on port 5000");
});
socket_connection_helper_1.server.listen(5274, () => {
    console.log("Socket is running on port 5000");
});
exports.default = app;
