import { NextFunction, Request, Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import PurchaseInvoiceController from "../../controller/purchase-invoice.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get("/unconfirmed", PurchaseInvoiceController.fetchUnconfirmed);
router.get("/archives", PurchaseInvoiceController.fetchArchive);
router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  PurchaseInvoiceController.fetchByID
);

router.post("/search", PurchaseInvoiceController.searchArchive);
router.post(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  body("name").notEmpty().withMessage(ErrorList["Name required"]),
  body("company_id").isNumeric().withMessage(ErrorList["Company ID required"]),
  body("supplier_id")
    .isNumeric()
    .withMessage(ErrorList["Supplier ID required"]),
  ErrorHelper.intercept,
  PurchaseInvoiceController.create
);

router.put(
  "/confirm",
  (req: Request, _, next: NextFunction) => {
    req.body.is_confirm = true;
    req.body.is_delete = false;
    next();
  },
  PurchaseInvoiceController.updateStatus
);

router.put(
  "/delete",
  (req: Request, _, next: NextFunction) => {
    req.body.is_confirm = false;
    req.body.is_delete = true;
    next();
  },
  PurchaseInvoiceController.updateStatus
);
router.put("/", PurchaseInvoiceController.update);

export default router;
