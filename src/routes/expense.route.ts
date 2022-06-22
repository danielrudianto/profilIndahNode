import { Router } from "express";
import { body } from "express-validator";
import ExpenseController from "../controller/expense.controller";

const router = Router();

router.get("/parentAutocomplete", ExpenseController.parentAutocomplete);
router.get("/itemAutocomplete", ExpenseController.itemAutocomplete);
router.get("/type", ExpenseController.fetchType);
router.get("/type/:parentId", ExpenseController.fetchType);
router.post(
  "/type",
  body("name")
    .not()
    .isEmpty()
    .withMessage("Mohon isikan nama tipe pengeluaran."),
  body("description")
    .not()
    .isEmpty()
    .withMessage("Mohon isikan deskripsi tipe pengeluaran."),
  ExpenseController.createType
);
router.post("/", ExpenseController.create)

export default router;
