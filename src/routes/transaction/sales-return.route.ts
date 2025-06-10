import { Router } from "express";
import { body, param } from "express-validator";
import { prisma } from "../../helper/database.helper";
import ErrorList from "../../assets/error_list";
import SalesReturnController from "../../controller/sales-return.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";
import { SalesReturnRepository } from "../../repositories/sales-return.repository";

const router = Router();

const salesReturnController = new SalesReturnController(
  new SalesReturnRepository(prisma),
  new SalesInvoiceRepository(prisma)
);

router.post(
  "/search",
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesReturnController.fetchSearch
);
router.post("/archives/v2", SalesReturnController.fetchArchivesV2);
router.post("/archives", SalesReturnController.fetchArchives);
router.post(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  body("payment_method_id")
    .notEmpty()
    .withMessage(ErrorList["Payment method required"]),
  body("sales_return")
    .isArray()
    .withMessage(ErrorList["Sales return items required"]),
  ErrorHelper.intercept,
  salesReturnController.create
);

router.get(
  "/code/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesReturnController.fetchCodeByID
);
router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesReturnController.fetchByID
);

router.delete(
  "/:id",
  administratorMiddleware,
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesReturnController.deleteByID
);

export default router;
