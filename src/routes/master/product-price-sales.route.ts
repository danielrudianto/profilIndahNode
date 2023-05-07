import { Router } from "express";
import ItemPriceController from "../../controller/product-price-sales.controller";
import ItemPurchasePriceController from "../../controller/product-price-purchase.controller";

const router = Router();

router.get("/bulk", ItemPriceController.fetchAll);
router.get("/", ItemPriceController.fetch);

router.post("/format", ItemPriceController.fetchFormat);
router.post("/bulk", ItemPriceController.createBulk);

router.put("/", ItemPriceController.update);

export default router;
