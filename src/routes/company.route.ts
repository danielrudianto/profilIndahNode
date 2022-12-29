import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../assets/error_list";
import CompanyController from "../controller/company.controller";

const router = Router();

router.post(
  "/",
  body("code_name")
    .isLength({ min: 3, max: 3 })
    .withMessage(ErrorList["Parameter error"]),
  body("name").exists().withMessage(ErrorList["Parameter error"]),
  body("address").exists().withMessage(ErrorList["Parameter error"]),
  CompanyController.create
);

router.get("/autocomplete", CompanyController.getAutocomplete);
router.get("/available", CompanyController.fetchAvailable);
router.get(
  "/:id",
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  CompanyController.fetchById
);
router.get("/", CompanyController.fetch);

router.delete("/:companyId", CompanyController.delete);
router.put("/", CompanyController.update);

export default router;
