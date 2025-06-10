import { Router } from "express";
import { body, param } from "express-validator";
import { prisma } from "../../helper/database.helper";
import ErrorList from "../../assets/error_list";
import ProductPackageController from "../../controller/product-package.controller";
import ErrorHelper from "../../helper/error.helper";
import { ProductPackageRepository } from "../../repositories/product-package.repository";

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
  body("package_content.*.item_id")
    .notEmpty()
    .withMessage(ErrorList["Package item id required"]),
  body("package_content.*.quantity")
    .notEmpty()
    .withMessage(ErrorList["Package item quantity required"]),
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
