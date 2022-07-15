import { Router } from "express";
import BrandController from "../controller/brand.controller";
const router = Router();

router.get("/autocomplete", BrandController.fetchAutocomplete);
router.get("/used", BrandController.fetchUsed);
router.get("/:id", BrandController.fetchById);
router.get("/", BrandController.fetch);
router.put("/", BrandController.update);
router.post("/", BrandController.create);
router.delete("/:id", BrandController.delete);

export default router;
