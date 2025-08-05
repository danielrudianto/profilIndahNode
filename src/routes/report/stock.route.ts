import { Router } from "express";
import { body, param, query } from "express-validator";
import ErrorList from "../../assets/error_list";
import ProductStockController from "../../controller/product-stock.controller";
import { prisma } from "../../helper/database.helper";
import ErrorHelper from "../../helper/error.helper";
import { ProductStockRepository } from "../../repositories/product-stock.repository";
import { ProductRepository } from "../../repositories/product.repository";

const router = Router();

const productStockController = new ProductStockController(
  new ProductStockRepository(prisma),
  new ProductRepository(prisma)
);

router.get(
  "/:id",
  param("id").exists().isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  query("page").notEmpty().withMessage(ErrorList["Page is required"]),
  query("page")
    .isInt({
      min: 1,
    })
    .withMessage(ErrorList["Page must be numeric"]),
  query("pageSize").notEmpty().withMessage(ErrorList["Page size is required"]),
  query("pageSize")
    .isInt({
      min: 10,
    })
    .withMessage(ErrorList["Page size must be numeric"]),
  ErrorHelper.intercept,
  productStockController.fetchByID
);

router.get(
  "/",
  query("page").notEmpty().withMessage(ErrorList["Page is required"]),
  query("page")
    .isInt({
      min: 1,
    })
    .withMessage(ErrorList["Page must be numeric"]),
  query("pageSize").notEmpty().withMessage(ErrorList["Page size is required"]),
  query("pageSize")
    .isInt({
      min: 10,
    })
    .withMessage(ErrorList["Page size must be numeric"]),
  ErrorHelper.intercept,
  productStockController.fetch
);

router.post(
  "/problematic",
  body("brands").exists().withMessage(ErrorList["Brand is required"]),
  body("brands").isArray().withMessage(ErrorList["Brand must be an array"]),
  body("brands").custom((value) => {
    if (!value.every((item: any) => Number.isInteger(item))) {
      throw new Error(ErrorList["Brand must be an integer"]);
    }
    return true;
  }),
  body("types").exists().withMessage(ErrorList["Type is required"]),
  body("types").isArray().withMessage(ErrorList["Type must be an array"]),
  body("types").custom((value) => {
    if (!value.every((item: any) => Number.isInteger(item))) {
      throw new Error(ErrorList["Type must be an integer"]);
    }
    return true;
  }),
  ErrorHelper.intercept,
  productStockController.fetchProblematic
);

router.post(
  "/inadequate",
  body("brands").exists().withMessage(ErrorList["Brand is required"]),
  body("brands").isArray().withMessage(ErrorList["Brand must be an array"]),
  body("brands").custom((value) => {
    if (!value.every((item: any) => Number.isInteger(item))) {
      throw new Error(ErrorList["Brand must be an integer"]);
    }
    return true;
  }),
  body("types").exists().withMessage(ErrorList["Type is required"]),
  body("types").isArray().withMessage(ErrorList["Type must be an array"]),
  body("types").custom((value) => {
    if (!value.every((item: any) => Number.isInteger(item))) {
      throw new Error(ErrorList["Type must be an integer"]);
    }
    return true;
  }),
  ErrorHelper.intercept,
  productStockController.fetchInadequate
);

router.post(
  "/",
  body("mode").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductStockController.create
);

export default router;
