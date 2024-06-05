import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ProductPackageController from "../../controller/product-package.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

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
  ProductPackageController.create
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
  ProductPackageController.updateByID
);

router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductPackageController.fetchByID
);

router.delete(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductPackageController.deleteByID
);

router.get("/", ProductPackageController.fetch);

export default router;
