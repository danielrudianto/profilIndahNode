import { Router } from "express";
import { param } from "express-validator";
import ItemPurchasePriceController from "../controller/item_purchase_price.controller";

const router = Router();

router.get(
  "/fetchById/:id",
  param("id").notEmpty().withMessage("Mohon isikan ID barang."),
  ItemPurchasePriceController.fetchById
);
router.get("/:reference", ItemPurchasePriceController.fetchByReference);
router.get("/", ItemPurchasePriceController.fetch);

router.post("/getXlsx", ItemPurchasePriceController.getXlsx);
router.post("/bulk", ItemPurchasePriceController.createBulk);
router.post("/", ItemPurchasePriceController.create);

export default router;
