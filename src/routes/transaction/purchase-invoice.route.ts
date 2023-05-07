import { Router } from "express";
import { param } from "express-validator";
import ErrorList from "../../assets/error_list";
import PurchaseInvoiceController from "../../controller/purchase-invoice.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get("/unconfirmed", PurchaseInvoiceController.fetchUnconfirmed);
router.get("/archives", PurchaseInvoiceController.fetchArchive);
router.get("/:id", PurchaseInvoiceController.fetchById);

router.post("/search", PurchaseInvoiceController.searchArchive);
router.post("/", PurchaseInvoiceController.create);

router.put("/confirm", PurchaseInvoiceController.confirm);
router.put("/delete", PurchaseInvoiceController.delete);
router.put("/", PurchaseInvoiceController.update);

router.delete(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  PurchaseInvoiceController.delete
);

export default router;
