"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_price_sales_controller_1 = __importDefault(require("../../controller/product-price-sales.controller"));
const router = (0, express_1.Router)();
router.get("/bulk", product_price_sales_controller_1.default.fetchAll);
router.get("/", product_price_sales_controller_1.default.fetch);
router.post("/format", product_price_sales_controller_1.default.fetchFormat);
router.post("/bulk", product_price_sales_controller_1.default.createBulk);
router.put("/", product_price_sales_controller_1.default.update);
exports.default = router;
