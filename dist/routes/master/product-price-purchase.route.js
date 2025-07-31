"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_price_purchase_controller_1 = require("../../controller/product-price-purchase.controller");
const database_helper_1 = require("../../helper/database.helper");
const product_repository_1 = require("../../repositories/product.repository");
const router = (0, express_1.Router)();
const productPurchasePriceController = new product_price_purchase_controller_1.ProductPurchasePriceController(new product_repository_1.ProductRepository(database_helper_1.prisma));
// router.get("/v2/:id", ItemPurchasePriceController.fetchByIDV2);
// router.get("/", ItemPurchasePriceController.fetch);
// router.put("/v2", ItemPurchasePriceController.updateV2);
// router.post("/format", ItemPurchasePriceController.fetchFormat);
// router.post("/bulk", ItemPurchasePriceController.createBulk);
// router.post("/", ItemPurchasePriceController.create);
router.get("/", productPurchasePriceController.fetch);
exports.default = router;
//# sourceMappingURL=product-price-purchase.route.js.map