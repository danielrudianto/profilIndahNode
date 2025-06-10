import { Router } from "express";
import { body, param } from "express-validator";
import { prisma } from "../../helper/database.helper";
import ErrorList from "../../assets/error_list";
import ExpenseController from "../../controller/expense.controller";
import ErrorHelper from "../../helper/error.helper";
import { ExpenseRepository } from "../../repositories/expense.repository";

const router = Router();
const expenseController = new ExpenseController(new ExpenseRepository(prisma));

const idParam = [
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
];

const yearMonthParams = [
  param("year").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("year").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("month").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("month").isNumeric().withMessage(ErrorList["Parameter error"]),
];

const expenseBody = [
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("value").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("value").isNumeric().withMessage(ErrorList["Parameter error"]),
  body("company_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("company_id").isNumeric().withMessage(ErrorList["Parameter error"]),
  body("expense_type_id").notEmpty().withMessage(ErrorList["Parameter error"]),
];

// Routes
router.get(
  "/:id",
  ...idParam,
  ErrorHelper.intercept,
  expenseController.fetchByID
);

router.get(
  "/:year/:month",
  ...yearMonthParams,
  ErrorHelper.intercept,
  expenseController.fetch
);

router.post(
  "/",
  ...expenseBody,
  ErrorHelper.intercept,
  expenseController.create
);

router.put(
  "/",
  ...expenseBody,
  body("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  expenseController.update
);

router.delete(
  "/:id",
  ...idParam,
  ErrorHelper.intercept,
  expenseController.delete
);

export default router;
