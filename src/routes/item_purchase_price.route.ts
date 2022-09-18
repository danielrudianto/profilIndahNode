import { Router } from "express";
import ItemPurchasePriceController from "../controller/item_purchase_price.controller";

const router = Router();

router.get("/bulk", ItemPurchasePriceController.fetchAll);
router.get("/fetchById/:id", ItemPurchasePriceController.fetchById);
router.get("/:reference", ItemPurchasePriceController.fetchByReference);
router.get("/", ItemPurchasePriceController.fetch);

router.post("/getXlsx", ItemPurchasePriceController.getXlsx);
router.post("/bulk", ItemPurchasePriceController.createBulk);
router.post("/", ItemPurchasePriceController.create);

export default router;
