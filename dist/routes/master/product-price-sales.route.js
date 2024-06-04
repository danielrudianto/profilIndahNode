"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_price_sales_controller_1 = __importDefault(require("../../controller/product-price-sales.controller"));
const router = (0, express_1.Router)();
router.get("/bulk", product_price_sales_controller_1.default.fetchAll);
router.get("/v2/:id", product_price_sales_controller_1.default.fetchByIDV2);
router.get("/:id", product_price_sales_controller_1.default.fetchByID);
router.get("/", product_price_sales_controller_1.default.fetch);
router.post("/format", product_price_sales_controller_1.default.fetchFormat);
router.post("/bulk", product_price_sales_controller_1.default.createBulk);
router.put("/v2", product_price_sales_controller_1.default.updateByIDV2);
router.put("/", product_price_sales_controller_1.default.updateByID);
exports.default = router;
//# sourceMappingURL=product-price-sales.route.js.map