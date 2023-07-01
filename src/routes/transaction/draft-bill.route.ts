import { Router } from "express";
import { body } from "express-validator";
import DraftBillController from "../../controller/draft-bill.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.post("/confirm", DraftBillController.confirm);
router.post("/delete", DraftBillController.delete);
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

router.get("/archives", DraftBillController.fetchArchives);
router.get("/:id", DraftBillController.fetchByID);
router.get("/", DraftBillController.fetchUnconfirmed);

export default router;
