import { Router } from "express";
import ReceivableController from "../../controller/receivable.controller";
import { param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get("/history/:id", ReceivableController.fetchPaymentsHistory);
router.get(
  "/customer/v2/:id",
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ReceivableController.fetchByCustomerIDV2
);
router.get(
  "/customer/:id",
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ReceivableController.fetchByCustomerID
);
router.get("/", ReceivableController.fetch);

router.post("/payment", ReceivableController.createPayment);
router.delete("/:id", ReceivableController.deletePayment);

export default router;
