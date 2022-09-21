import { Router } from "express";
import ItemPriceController from "../controller/item_price.controller";


const router = Router();

router.get("/getById/:id", ItemPriceController.fetchById);
router.get("/bulk", ItemPriceController.fetchAll);
router.get("/:reference", ItemPriceController.fetchByReference);
router.get("/", ItemPriceController.fetch);

router.post("/getXlsx", ItemPriceController.getXlsx);
router.post("/bulk", ItemPriceController.createBulk);
router.post("/", ItemPriceController.updatePrice);

export default router;
