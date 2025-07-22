import { Router } from "express";
import { ProductPurchasePriceController } from "../../controller/product-price-purchase.controller";
import { prisma } from "../../helper/database.helper";
import { ProductRepository } from "../../repositories/product.repository";

const router = Router();

const productPurchasePriceController = new ProductPurchasePriceController(
  new ProductRepository(prisma)
);

// router.get("/v2/:id", ItemPurchasePriceController.fetchByIDV2);
// router.get("/", ItemPurchasePriceController.fetch);

// router.put("/v2", ItemPurchasePriceController.updateV2);

// router.post("/format", ItemPurchasePriceController.fetchFormat);
// router.post("/bulk", ItemPurchasePriceController.createBulk);
// router.post("/", ItemPurchasePriceController.create);
router.get("/", productPurchasePriceController.fetch);

export default router;
