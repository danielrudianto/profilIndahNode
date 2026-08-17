import { Router } from "express";
import { prisma } from "../utils/database.helper";
import ExpenseController from "../controllers/expense.controller";
import { ExpenseRepository } from "../repositories/expense.repository";
import { CompanyRepository } from "../repositories/company.repository";
import { ExpenseTypeRepository } from "../repositories/expense-type.repository";
import { validate } from "../utils/validate.helper";
import { administratorMiddleware } from "../utils/auth.helper";
import {
  createExpenseSchema,
  queryExpenseMutationSchema,
  queryExpenseSchema,
  paramExpenseSchema,
  updateExpenseSchema,
} from "../schemas/expense.schema";

const router = Router();
const expenseController = new ExpenseController(
  new ExpenseRepository(prisma),
  new CompanyRepository(prisma),
  new ExpenseTypeRepository(prisma)
);

// Routes
router.get(
  "/",
  validate(queryExpenseSchema, "query"),
  expenseController.fetchReport
);

router.get(
  "/mutation",
  validate(queryExpenseMutationSchema, "query"),
  expenseController.fetch
);

router.get(
  "/:id",
  validate(paramExpenseSchema, "params"),
  expenseController.fetchByID
);

router.post("/", validate(createExpenseSchema), expenseController.create);

// Ubah dan hapus catatan uang khusus administrator dan pemilik.
router.put(
  "/",
  administratorMiddleware,
  validate(updateExpenseSchema),
  expenseController.update
);

router.delete(
  "/:id",
  administratorMiddleware,
  validate(paramExpenseSchema, "params"),
  expenseController.delete
);

export default router;
