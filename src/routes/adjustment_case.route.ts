import { Router } from "express";
import AdjustmentCaseController from "../controller/adjustment_case.controller";

const router = Router();

router.get("/archives/:year/:month", AdjustmentCaseController.fetchArchives);
router.post("/", AdjustmentCaseController.post);

export default router;
