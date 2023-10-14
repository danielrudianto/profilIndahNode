import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import BrandController from "../../controller/product-brand.controller";
import ErrorHelper from "../../helper/error.helper";
const router = Router();

router.get("/autocomplete", BrandController.fetchAutocomplete);
router.get(
  "/:id",
  param("id").exists().withMessage(ErrorList["Parameter error"]),
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  BrandController.fetchByID
);
router.get("/", BrandController.fetch);
router.put(
  "/",
  body("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  BrandController.update
);
router.post(
  "/",
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  BrandController.create
);
router.delete(
  "/:id",
  param("id").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  BrandController.delete
);

export default router;
