import { Router } from "express";
import ItemPurchasePriceController from "../../controller/product-price-purchase.controller";

const router = Router();

router.get("/", ItemPurchasePriceController.fetch);
router.put("/", ItemPurchasePriceController.update);

router.post("/format", ItemPurchasePriceController.fetchFormat);
// router.post("/bulk", ItemPurchasePriceController.createBulk);
// router.post("/", ItemPurchasePriceController.create);

export default router;
