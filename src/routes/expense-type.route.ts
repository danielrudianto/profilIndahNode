import { Router } from "express";
import { prisma } from "../utils/database.helper";
import ExpenseTypeController from "../controllers/expense-type.controller";
import { ExpenseTypeRepository } from "../repositories/expense-type.repository";
import { validate } from "../utils/validate.helper";
import { superadministratorMiddleware } from "../utils/auth.helper";
import {
  createExpenseTypeSchema,
  paramExpenseTypeSchema,
  updateExpenseTypeSchema,
} from "../schemas/expense-type.schema";

const router = Router();

const expenseTypeController = new ExpenseTypeController(
  new ExpenseTypeRepository(prisma)
);

router.get("/autocomplete", expenseTypeController.fetchAutocomplete);
router.get(
  "/:id",
  validate(paramExpenseTypeSchema, "params"),
  expenseTypeController.fetchByID
);
router.get("/", expenseTypeController.fetch);

/*
  Tipe pengeluaran adalah DAFTAR BAKU: isinya dijaga lewat seeder
  (npm run start:seed-expense-type), dan jalur tulisnya hanya pintu darurat
  bagi super administrator — bukan bagian alur kerja harian. Frontend tidak
  lagi punya formulir tambah/ubah untuknya.
*/
router.post(
  "/",
  superadministratorMiddleware,
  validate(createExpenseTypeSchema),
  expenseTypeController.create
);

router.delete(
  "/:id",
  superadministratorMiddleware,
  validate(paramExpenseTypeSchema, "params"),
  expenseTypeController.delete
);

router.put(
  "/",
  superadministratorMiddleware,
  validate(updateExpenseTypeSchema),
  expenseTypeController.update
);

export default router;
