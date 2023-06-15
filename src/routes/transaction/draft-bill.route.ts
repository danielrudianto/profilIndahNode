import { Router } from "express";
import { body } from "express-validator";
import DraftBillController from "../../controller/draft-bill.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.post("/order", DraftBillController.order);
router.post(
  "/",
  body("customer_id").exists().withMessage("Please fill in customer ID"),
  body("note").exists().withMessage("Please fill in note"),
  body("items").exists().withMessage("Please fill in items"),
  body("service").exists().withMessage("Please fill in the service value"),
  body("delivery").exists().withMessage("Please fill in the delivery value"),
  ErrorHelper.intercept,
  DraftBillController.create
);

export default router;
