import { Router } from "express";
import { body, param, query } from "express-validator";
import { prisma, redisClient } from "../../app";
import ErrorList from "../../assets/error_list";
import SalesInvoiceController from "../../controller/sales-invoice.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";
import { ReceivableRepository } from "../../repositories/receivable.repository";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";

const router = Router();

const salesInvoiceController = new SalesInvoiceController(
  new SalesInvoiceRepository(prisma),
  new ReceivableRepository(redisClient)
);

router.post(
  "/search",
  body("customers").isArray().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  salesInvoiceController.search
);

router.post(
  "/",
  body("uuid").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("customer_id").exists().withMessage(ErrorList["Parameter error"]),
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
  ErrorHelper.intercept,
  SalesInvoiceController.createSalesman,
  SalesInvoiceController.create
);

router.post("/archives/v2", SalesInvoiceController.fetchArchiveV2);

router.post(
  "/archives",
  body("year")
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() }) // Validates as integer, reasonable range
    .toInt()
    .withMessage(ErrorList["Parameter error"]),
  body("month")
    .optional()
    .isInt({ min: 1, max: 12 }) // Ensures month is between 1-12
    .toInt()
    .withMessage(ErrorList["Parameter error"]),
  body().custom((body) => {
    if (body.month !== undefined && body.year === undefined) {
      throw new Error(ErrorList["Parameter error"]);
    }
    return true;
  }),
  salesInvoiceController.fetchArchive
);
router.post("/archives", SalesInvoiceController.fetchArchive);

router.get("/salesman", SalesInvoiceController.fetchSalesmen);
router.get(
  "/salesman/pagination",
  SalesInvoiceController.fetchSalesmenPagination
);

router.get("/payment/:id", SalesInvoiceController.fetchPaymentsByID);

router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesInvoiceController.fetchByID
);

router.delete(
  "/payment/:id",
  administratorMiddleware,
  SalesInvoiceController.deletePaymentByID
);

router.delete(
  "/:id",
  administratorMiddleware,
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept
  // SalesInvoiceController.deleteByID
);

export default router;
