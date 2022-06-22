import { Router } from "express";
import { body } from "express-validator";
import ExpenseController from "../controller/expense.controller";

const router = Router();

router.get("/parentAutocomplete", ExpenseController.parentAutocomplete);
router.get("/itemAutocomplete", ExpenseController.itemAutocomplete);

router.get("/type/getById/:id", ExpenseController.fetchTypeById);
router.get("/type/getByParentId", ExpenseController.fetchType);
router.get("/type/getByParentId/:parentId", ExpenseController.fetchType);

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

router.put("/type", ExpenseController.updateType);
router.delete("/type/:id", ExpenseController.deleteType);

router.get("/:year/:month", ExpenseController.fetch);
router.post("/", ExpenseController.create);

export default router;
