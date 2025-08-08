import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import { OverpaymentController } from "../../controller/overpayment.controller";
import { prisma } from "../../helper/database.helper";
import ErrorHelper from "../../helper/error.helper";
import { OverpaymentRepository } from "../../repositories/overpayment.repository";

const router = Router();

const overpaymentContorller = new OverpaymentController(
  new OverpaymentRepository(prisma)
);

router.post(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  body("value").notEmpty().withMessage(ErrorList["Amount is required"]),
  body("value")
    .isFloat({
      min: 0.1,
    })
    .withMessage(ErrorList["Amount must be numeric"]),
  body("customer_id")
    .exists()
    .withMessage(ErrorList["Customer ID is required"]),
  body("payment_method_id")
    .exists()
    .withMessage(ErrorList["Payment method required"]),
  body("return_payment_date")
    .notEmpty()
    .withMessage(ErrorList["Return date is required"]),
  body("return_payment_method")
    .isIn(["Cash", "Bank transfer"])
    .withMessage(
      ErrorList["Return payment method must be either Cash or Transfer"]
    ),
  body("return_payment_name")
    .notEmpty()
    .withMessage(ErrorList["Return name is required"]),
  body("return_payment_bank")
    .exists()
    .withMessage(ErrorList["Return payment bank is required"]),
  body("return_payment_number")
    .exists()
    .withMessage(ErrorList["Return payment number is required"]),
  ErrorHelper.intercept,
  overpaymentContorller.create
);

router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["ID must be numeric"]),
  ErrorHelper.intercept,
  overpaymentContorller.fetchByID
);

router.get("/", overpaymentContorller.fetch);

export default router;
