import { Router } from "express";
import ItemPriceController from "../../controller/product-price-sales.controller";

const router = Router();

router.get("/bulk", ItemPriceController.fetchAll);
router.get("/:id", ItemPriceController.fetchByID);
router.get("/", ItemPriceController.fetch);

router.post("/format", ItemPriceController.fetchFormat);
router.post("/bulk", ItemPriceController.createBulk);

router.put("/", ItemPriceController.updateByID);

export default router;
