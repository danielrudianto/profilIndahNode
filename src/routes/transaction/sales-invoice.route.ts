import { Router } from "express";
import { body, param, query } from "express-validator";
import ErrorList from "../../assets/error_list";
import SalesInvoiceController from "../../controller/sales-invoice.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.post("/search", SalesInvoiceController.fetchSearch);
router.post(
  "/salesman/delete",
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesInvoiceController.deleteSalesman
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
  ErrorHelper.intercept,
  SalesInvoiceController.deleteByID
);

export default router;
