import { Router } from 'express';
import ItemPurchasePriceController from '../controller/item_purchase_price.controller';

const router = Router();

router.get("/bulk", ItemPurchasePriceController.fetchAll);
router.get("/:reference", ItemPurchasePriceController.fetchByReference);
router.get("/", ItemPurchasePriceController.fetch);
router.post("/bulk", ItemPurchasePriceController.createBulk);
router.post("/", ItemPurchasePriceController.create);

export default router;