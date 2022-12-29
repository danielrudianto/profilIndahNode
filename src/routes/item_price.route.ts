import { Router } from "express";
import { param } from "express-validator";
import ErrorList from "../assets/error_list";
import ItemPriceController from "../controller/item_price.controller";

const router = Router();

router.get(
  "/getById/:id",
  param("id").notEmpty().withMessage("Mohon isikan ID barang."),
  ItemPriceController.fetchById
);
router.get("/bulk", ItemPriceController.fetchAll);
router.get(
  "/:reference",
  param("reference").notEmpty().withMessage(ErrorList["Parameter error"]),
  ItemPriceController.fetchByReference
);
router.get("/", ItemPriceController.fetch);

router.post("/getXlsx", ItemPriceController.getXlsx);
router.post("/bulk", ItemPriceController.createBulk);
router.post("/", ItemPriceController.updatePrice);

export default router;
