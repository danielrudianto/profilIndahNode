import { Router } from "express";
import { prisma } from "../../utils/database.helper";
import ExpenseTypeController from "../../controllers/expense-type.controller";
import { ExpenseTypeRepository } from "../../repositories/expense-type.repository";
import { validate } from "../../utils/validate.helper";
import {
  buatTipePengeluaranSchema,
  paramTipePengeluaranSchema,
  ubahTipePengeluaranSchema,
} from "../../schemas/master-lain.schema";

const router = Router();

const expenseTypeController = new ExpenseTypeController(
  new ExpenseTypeRepository(prisma)
);

router.get("/autocomplete", expenseTypeController.fetchAutocomplete);
router.get(
  "/:id",
  validate(paramTipePengeluaranSchema, "params"),
  expenseTypeController.fetchByID
);
router.get("/", expenseTypeController.fetch);

router.post(
  "/",
  validate(buatTipePengeluaranSchema),
  expenseTypeController.create
);

router.delete(
  "/:id",
  validate(paramTipePengeluaranSchema, "params"),
  expenseTypeController.delete
);

router.put(
  "/",
  validate(ubahTipePengeluaranSchema),
  expenseTypeController.update
);

export default router;
