import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../assets/error_list";
import BillController from "../controller/bill.controller";
import { administratorMiddleware } from "../helper/auth.helper";

const router = Router();

router.post(
  "/printout/draft",
  body("items").isArray().withMessage(ErrorList["Parameter error"]),
  BillController.createPrintoutDraft
);
router.post("/printout", BillController.createPrintout);
router.post(
  "/",
  body("customer_id").exists().withMessage(ErrorList["Parameter error"]),
  body("payment_method_id").exists().withMessage(ErrorList["Parameter error"]),
  body("discount")
    .toInt()
    .isInt({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("delivery")
    .toInt()
    .isInt({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("service")
    .toInt()
    .isInt({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  BillController.create
);

router.get("/archives", BillController.fetchArchive);
router.get(
  "/archives/:year",
  param("year").exists().withMessage(ErrorList["Parameter error"]),
  BillController.fetchArchive
);
router.get(
  "/archives/:year/:month",
  param("year").exists().withMessage(ErrorList["Parameter error"]),
  param("month").exists().withMessage(ErrorList["Parameter error"]),
  BillController.fetchArchive
);

router.get(
  "/code/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  BillController.fetchCodeById
);
router.get("/search", BillController.searchArchive);
router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  BillController.fetchById
);

router.delete(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  administratorMiddleware,
  BillController.deleteById
);

export default router;
