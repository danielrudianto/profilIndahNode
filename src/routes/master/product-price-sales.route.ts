import { Router } from "express";
import { ProductSalesPriceController } from "../../controller/product-price-sales.controller";

// SAPI
const router = Router();

router.get("/bulk", ProductSalesPriceController.fetchAll);
router.get("/v2/:id", ProductSalesPriceController.fetchByIDV2);
router.get("/:id", ProductSalesPriceController.fetchByID);
router.get("/", ProductSalesPriceController.fetch);

router.post("/format", ProductSalesPriceController.fetchFormat);
router.post("/bulk", ProductSalesPriceController.createBulk);

router.put("/v2", ProductSalesPriceController.updateByIDV2);
router.put("/", ProductSalesPriceController.updateByID);

export default router;
