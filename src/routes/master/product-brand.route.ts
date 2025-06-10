import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import { ProductBrandController } from "../../controller/product-brand.controller";
import ErrorHelper from "../../helper/error.helper";
import { prisma } from "../../helper/database.helper";
import { ProductBrandRepository } from "../../repositories/product-brand.repository";

const router = Router();
const productBrandController = new ProductBrandController(
  new ProductBrandRepository(prisma)
);

// Validation helpers
const validateId = [
  param("id").exists().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
];

const validateBodyForUpdate = [
  body("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
];

const validateBodyForCreate = [
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
];

// Routes
router.get("/autocomplete", productBrandController.fetchAutocomplete);

router.get(
  "/:id",
  [...validateId, ErrorHelper.intercept],
  productBrandController.fetchByID
);

router.get("/", productBrandController.fetch);

router.put(
  "/",
  [...validateBodyForUpdate, ErrorHelper.intercept],
  productBrandController.update
);

router.post(
  "/",
  [...validateBodyForCreate, ErrorHelper.intercept],
  productBrandController.create
);

router.delete(
  "/:id",
  [...validateId, ErrorHelper.intercept],
  productBrandController.delete
);

export default router;
