import { Router } from "express";
import { body, param } from "express-validator";
import ExpenseController from "../controller/expense.controller";
const router = Router();
router.get("/parentAutocomplete", ExpenseController.parentAutocomplete);
router.get("/itemAutocomplete", ExpenseController.itemAutocomplete);
router.get("/type/getById/:id", param("id").notEmpty().withMessage("Mohon isikan ID tipe pengeluaran."), ExpenseController.fetchTypeById);
router.get("/type/getByParentId", ExpenseController.fetchType);
router.get("/type/getByParentId/:parentId", ExpenseController.fetchType);
router.post("/type", body("name")
    .not()
    .isEmpty()
    .withMessage("Mohon isikan nama tipe pengeluaran."), body("description")
    .not()
    .isEmpty()
    .withMessage("Mohon isikan deskripsi tipe pengeluaran."), ExpenseController.createType);
router.put("/type", body("name").notEmpty().withMessage("Mohon isikan nama tipe pengeluaran."), body("description")
    .notEmpty()
    .withMessage("Mohon isikan deskripsi tipe pengeluaran."), body("id").notEmpty().withMessage("Mohon isikan ID tipe pengeluaran."), ExpenseController.updateType);
router.delete("/type/:id", param("id").notEmpty().withMessage("Mohon isikan ID tipe pengeluaran."), ExpenseController.deleteType);
router.get("/:id", param("id").notEmpty().withMessage("Mohon isikan ID pengeluaran."), ExpenseController.fetchById);
router.get("/:year/:month", param("year").notEmpty().withMessage("Mohon isikan tahun pengeluaran."), param("month").notEmpty().withMessage("Mohon isikan bulan pengeluaran."), ExpenseController.fetch);
router.post("/", body("date").notEmpty().withMessage("Mohon isikan tanggal pengeluaran."), body("description")
    .notEmpty()
    .withMessage("Mohon isikan deskripsi pengeluiaran."), body("value").notEmpty().withMessage("Mohon isikan nominal pengeluaran."), body("expense_type_id")
    .notEmpty()
    .withMessage("Mohon isikan tipe pengeluaran."), ExpenseController.create);
router.put("/", body("date").notEmpty().withMessage("Mohon isikan tanggal pengeluaran."), body("description")
    .notEmpty()
    .withMessage("Mohon isikan deskripsi pengeluiaran."), body("value").notEmpty().withMessage("Mohon isikan nominal pengeluaran."), body("expense_type_id")
    .notEmpty()
    .withMessage("Mohon isikan tipe pengeluaran."), body("id").notEmpty().withMessage("Mohon isikan ID pengeluaran."), ExpenseController.update);
router.delete("/:id", param("id").notEmpty().withMessage("Mohon isikan ID pengeluaran."), ExpenseController.deleteById);
export default router;
