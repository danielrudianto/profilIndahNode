import { Router } from "express";
import AdjustmentCaseController from "../controller/adjustment_case.controller";

const router = Router();

router.get("/archives/:year/:month", AdjustmentCaseController.fetchArchives);
router.get("/archives/:year", AdjustmentCaseController.fetchArchives);
router.get("/archives", AdjustmentCaseController.fetchArchives);

router.get("/:id", AdjustmentCaseController.fetchById);
router.post("/", AdjustmentCaseController.post);

export default router;
