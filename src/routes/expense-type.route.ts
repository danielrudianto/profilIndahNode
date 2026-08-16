import { Router } from "express";
import { prisma } from "../utils/database.helper";
import ExpenseTypeController from "../controllers/expense-type.controller";
import { ExpenseTypeRepository } from "../repositories/expense-type.repository";
import { validate } from "../utils/validate.helper";
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
  INDUKNYA baku — ditanam seeder (npm run start:seed-expense-type) dan
  controller menolak menyunting atau menghapusnya. Jalur tulis di bawah ini
  hanya menyentuh ANAK, dan terbuka untuk semua pengguna terautentikasi
  lewat authMiddleware di titik mount.
*/
router.post(
  "/",
  validate(createExpenseTypeSchema),
  expenseTypeController.create
);

router.delete(
  "/:id",
  validate(paramExpenseTypeSchema, "params"),
  expenseTypeController.delete
);

router.put(
  "/",
  validate(updateExpenseTypeSchema),
  expenseTypeController.update
);

export default router;
