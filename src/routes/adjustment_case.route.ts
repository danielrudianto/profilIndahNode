import { Router } from "express";
import { body, param } from "express-validator";
import AdjustmentCaseController from "../controller/adjustment_case.controller";

const router = Router();

router.get(
  "/archives/:year/:month",
  param("year")
    .isInt({ min: 2000 })
    .withMessage("Mohon isikan tahun arsip yang sesuai."),
  param("month")
    .isInt({ min: 0, max: 11 })
    .withMessage("Mohon isikan bulan arsip yang sesuai."),
  AdjustmentCaseController.fetchArchives
);

router.get(
  "/archives/:year",
  param("year")
    .isInt({ min: 2000 })
    .withMessage("Mohon isikan tahun arsip yang sesuai."),
  AdjustmentCaseController.fetchArchives
);

router.get("/archives", AdjustmentCaseController.fetchArchives);

router.get(
  "/code/:id",
  param("id").notEmpty().withMessage("Mohon isikan ID penyesuaian stock."),
  AdjustmentCaseController.fetchCodeById
);

router.get(
  "/:id",
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage("Mohon isikan ID penyesuaian stock."),
  AdjustmentCaseController.fetchById
);

router.post(
  "/",
  body("date").notEmpty().withMessage("Mohon isikan tanggal dokumen."),
  body("company_id")
    .isInt({ min: 1 })
    .withMessage("Mohon isikan ID perusahaan."),
  body("type")
    .isInt({ min: 0 })
    .withMessage("Mohon isikan tipe penyesuaian stock yang sesuai."),
  AdjustmentCaseController.post
);

export default router;
