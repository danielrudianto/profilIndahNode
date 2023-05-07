import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ExpenseTypeController from "../../controller/expense-type.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get("/autocomplete", ExpenseTypeController.fetchAutocomplete);

router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ExpenseTypeController.fetchByID
);

router.get("/", ExpenseTypeController.fetch);

router.post(
  "/",
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ExpenseTypeController.create
);

router.delete(
  "/:id",
  param("id").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ExpenseTypeController.delete
);

router.put(
  "/",
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ExpenseTypeController.update
);

export default router;
