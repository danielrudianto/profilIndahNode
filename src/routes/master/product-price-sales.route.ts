import { Router } from "express";
import ItemPriceController from "../../controller/product-price-sales.controller";

const router = Router();

router.get("/bulk", ItemPriceController.fetchAll);
router.get("/v2/:id", ItemPriceController.fetchByIDV2);
router.get("/:id", ItemPriceController.fetchByID);
router.get("/", ItemPriceController.fetch);

router.post("/format", ItemPriceController.fetchFormat);
router.post("/bulk", ItemPriceController.createBulk);

router.put("/v2", ItemPriceController.updateByIDV2);
router.put("/", ItemPriceController.updateByID);

export default router;
