import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ErrorHelper from "../../helper/error.helper";
import CompanyController from "../../controller/company.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import { CompanyRepository } from "../../repositories/company.repository";
import { prisma } from "../../app";

const router = Router();

const companyController = new CompanyController(new CompanyRepository(prisma));

router.post(
  "/",
  administratorMiddleware,
  body("name").exists().withMessage(ErrorList["Parameter error"]),
  body("address").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  companyController.create
);

router.get("/autocomplete", companyController.fetchAutocomplete);

router.get(
  "/:id",
  administratorMiddleware,
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  companyController.fetchByID
);

router.get("/", companyController.fetch);

router.delete(
  "/:id",
  param("id").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  companyController.delete
);

router.put(
  "/",
  body("name").exists().withMessage(ErrorList["Parameter error"]),
  body("address").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  companyController.update
);

export default router;
