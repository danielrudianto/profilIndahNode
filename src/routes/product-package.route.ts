import { Router } from "express";
import { body, param } from "express-validator";
import { prisma } from "../utils/database.helper";
import ErrorList from "../constants/error_list";
import ProductPackageController from "../controllers/product-package.controller";
import ErrorHelper from "../utils/error.helper";
import { ProductPackageRepository } from "../repositories/product-package.repository";

const router = Router();

const productPackageController = new ProductPackageController(
  new ProductPackageRepository(prisma)
);

router.post(
  "/",
  body("price").notEmpty().withMessage(ErrorList["Price is required"]),
  body("name").notEmpty().withMessage(ErrorList["Package name required"]),
  body("description")
    .notEmpty()
    .withMessage(ErrorList["Package description required"]),
  body("package_content")
    .notEmpty()
    .withMessage(ErrorList["Package items required"]),
  body("package_content.*.product_id")
    .notEmpty()
    .withMessage(ErrorList["Package item id required"]),
  body("package_content.*.quantity")
    .notEmpty()
    .withMessage(ErrorList["Package item quantity required"]),
  body("package_content.*.product_unit_id")
    .exists()
    .withMessage(ErrorList["Package item unit id required"]),
  body("package_content.*.price")
    .notEmpty()
    .withMessage(ErrorList["Package item price required"]),
  ErrorHelper.intercept,
  productPackageController.create
);

router.put(
  "/",
  body("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  body("price").notEmpty().withMessage(ErrorList["Price is required"]),
  body("name").notEmpty().withMessage(ErrorList["Package name required"]),
  body("description")
    .notEmpty()
    .withMessage(ErrorList["Package description required"]),
  ErrorHelper.intercept,
  productPackageController.update
);

router.put(
  "/price-sales",
  body("items").isArray().withMessage(ErrorList["Parameter error"]),
  body("items.*.package_code_id")
    .notEmpty()
    .withMessage(ErrorList["Package ID is required"]),
  body("items.*.price").notEmpty().withMessage(ErrorList["Price is required"]),
  body("items.*.price")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Price must be numeric"]),
  ErrorHelper.intercept,
  productPackageController.updateSalesPrice
);

router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  productPackageController.fetchByID
);

router.delete(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  productPackageController.delete
);

router.get("/", productPackageController.fetch);

export default router;
