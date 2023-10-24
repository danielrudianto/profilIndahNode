"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_price_purchase_controller_1 = __importDefault(require("../../controller/product-price-purchase.controller"));
const router = (0, express_1.Router)();
router.get("/", product_price_purchase_controller_1.default.fetch);
router.put("/", product_price_purchase_controller_1.default.update);
router.post("/format", product_price_purchase_controller_1.default.fetchFormat);
router.post("/bulk", product_price_purchase_controller_1.default.createBulk);
// router.post("/", ItemPurchasePriceController.create);
exports.default = router;
//# sourceMappingURL=product-price-purchase.route.js.map