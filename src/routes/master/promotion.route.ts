import { Router } from "express";
import PromotionController from "../../controller/promotion.controller";

const router = Router();

router.get("/result/:id", PromotionController.fetchResultByID);
router.get("/active", PromotionController.fetchActive);
router.get("/:id", PromotionController.fetchByID);
router.get("/", PromotionController.fetch);

router.post("/download", PromotionController.downloadResultByID);
router.post("/", PromotionController.create);
router.put("/", PromotionController.update);

export default router;
