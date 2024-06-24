import { Router } from "express";
import ItemTypeController from "../../controller/product-type.controller";

const router = Router();

router.get("/product-type", ItemTypeController.fetch);

export default router;
