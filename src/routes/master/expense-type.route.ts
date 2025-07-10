import { Router } from "express";
import { body, param } from "express-validator";
import { prisma } from "../../helper/database.helper";
import ErrorList from "../../assets/error_list";
import ExpenseTypeController from "../../controller/expense-type.controller";
import ErrorHelper from "../../helper/error.helper";
import { ExpenseTypeRepository } from "../../repositories/expense-type.repository";

const router = Router();

const expenseTypeController = new ExpenseTypeController(
  new ExpenseTypeRepository(prisma)
);

router.get("/autocomplete", expenseTypeController.fetchAutocomplete);
router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["ID is required"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be integer"]),
  ErrorHelper.intercept,
  expenseTypeController.fetchByID
);
router.get("/", expenseTypeController.fetch);

router.post(
  "/",
  body("name")
    .not()
    .isEmpty()
    .withMessage(ErrorList["Expense type name is required"]),
  body("description")
    .not()
    .isEmpty()
    .withMessage(ErrorList["Expense type description is required"]),
  ErrorHelper.intercept,
  expenseTypeController.create
);

router.delete(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["ID is required"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be integer"]),
  ErrorHelper.intercept,
  expenseTypeController.delete
);

router.put(
  "/",
  body("name")
    .not()
    .isEmpty()
    .withMessage(ErrorList["Expense type name is required"]),
  body("description")
    .not()
    .isEmpty()
    .withMessage(ErrorList["Expense type description is required"]),
  body("id").isNumeric().withMessage(ErrorList["ID is required"]),
  body("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be integer"]),
  ErrorHelper.intercept,
  expenseTypeController.update
);

export default router;
