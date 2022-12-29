import { Router } from "express";
import { param } from "express-validator";
import AdjustmentCaseController from "../controller/adjustment_case.controller";
const router = Router();
router.get("/archives/:year/:month", param("year")
    .isInt({ min: 2000 })
    .withMessage("Mohon isikan tahun arsip yang sesuai."), param("month")
    .isInt({ min: 0, max: 11 })
    .withMessage("Mohon isikan bulan arsip yang sesuai."), AdjustmentCaseController.fetchArchives);
router.get("/archives/:year", param("year")
    .isInt({ min: 2000 })
    .withMessage("Mohon isikan tahun arsip yang sesuai."), AdjustmentCaseController.fetchArchives);
router.get("/archives", AdjustmentCaseController.fetchArchives);
router.get("/code/:id", param("id").notEmpty().withMessage("Mohon isikan ID penyesuaian stock."), AdjustmentCaseController.fetchCodeById);
router.get("/:id", AdjustmentCaseController.fetchById);
router.post("/", AdjustmentCaseController.post);
export default router;
