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

// router.get("/autocomplete", expenseTypeController.fetchAutocomplete);
// router.get("/children/:id", expenseTypeController.fetchChildren);
// router.get("/v2", expenseTypeController.fetchV2);
router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  expenseTypeController.fetchByID
);
router.get("/", ExpenseTypeController.fetch);

router.post(
  "/",
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  expenseTypeController.create
);

router.delete(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  expenseTypeController.delete
);

router.put(
  "/",
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  expenseTypeController.update
);

export default router;
