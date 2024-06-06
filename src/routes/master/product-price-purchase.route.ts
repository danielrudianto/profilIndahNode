import { Router } from "express";
import ItemPurchasePriceController from "../../controller/product-price-purchase.controller";

const router = Router();

router.get("/v2/:id", ItemPurchasePriceController.fetchByIDV2);
router.get("/", ItemPurchasePriceController.fetch);

router.put("/v2", ItemPurchasePriceController.updateV2);
router.put("/", ItemPurchasePriceController.update);

router.post("/format", ItemPurchasePriceController.fetchFormat);
router.post("/bulk", ItemPurchasePriceController.createBulk);
// router.post("/", ItemPurchasePriceController.create);

export default router;
