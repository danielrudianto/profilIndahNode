import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ErrorHelper from "../../helper/error.helper";
import CompanyController from "../../controller/company.controller";
import { administratorMiddleware } from "../../helper/auth.helper";

const router = Router();

router.post(
  "/",
  administratorMiddleware,
  body("name").exists().withMessage(ErrorList["Parameter error"]),
  body("address").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  CompanyController.create
);

router.get("/autocomplete", CompanyController.fetchAutocomplete);
router.get(
  "/:id",
  administratorMiddleware,
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  CompanyController.fetchByID
);
router.get("/", CompanyController.fetch);

router.delete(
  "/:id",
  param("id").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  CompanyController.delete
);

router.put(
  "/",
  body("name").exists().withMessage(ErrorList["Parameter error"]),
  body("address").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  CompanyController.update
);

export default router;
