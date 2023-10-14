import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ExpenseController from "../../controller/expense.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ExpenseController.fetchByID
);

router.get(
  "/:year/:month",
  param("year").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("month").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ExpenseController.fetch
);

router.post(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("value").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("expense_type_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ExpenseController.create
);

router.put(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("value").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("expense_type_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ExpenseController.updateByID
);

router.delete(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ExpenseController.deleteByID
);

export default router;
