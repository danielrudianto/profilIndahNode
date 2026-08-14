import { Router } from "express";
import { prisma } from "../../utils/database.helper";
import ExpenseController from "../../controllers/expense.controller";
import { ExpenseRepository } from "../../repositories/expense.repository";
import { CompanyRepository } from "../../repositories/company.repository";
import { ExpenseTypeRepository } from "../../repositories/expense-type.repository";
import { validate } from "../../utils/validate.helper";
import {
  buatPengeluaranSchema,
  kueriMutasiPengeluaranSchema,
  kueriPengeluaranSchema,
  paramPengeluaranSchema,
  ubahPengeluaranSchema,
} from "../../schemas/produk-pengeluaran.schema";

const router = Router();
const expenseController = new ExpenseController(
  new ExpenseRepository(prisma),
  new CompanyRepository(prisma),
  new ExpenseTypeRepository(prisma)
);

// Routes
router.get(
  "/",
  validate(kueriPengeluaranSchema, "query"),
  expenseController.fetchReport
);

router.get(
  "/mutation",
  validate(kueriMutasiPengeluaranSchema, "query"),
  expenseController.fetch
);

router.get(
  "/:id",
  validate(paramPengeluaranSchema, "params"),
  expenseController.fetchByID
);

router.post("/", validate(buatPengeluaranSchema), expenseController.create);

router.put("/", validate(ubahPengeluaranSchema), expenseController.update);

router.delete(
  "/:id",
  validate(paramPengeluaranSchema, "params"),
  expenseController.delete
);

export default router;
