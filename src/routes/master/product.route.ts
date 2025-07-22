import { Router } from "express";
import { body, param, query } from "express-validator";
import ErrorList from "../../assets/error_list";
import ProductController from "../../controller/product.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";
import { ProductRepository } from "../../repositories/product.repository";
import { prisma } from "../../helper/database.helper";
import { ProductUnitRepository } from "../../repositories/product-unit.repository";

const router = Router();

const productController = new ProductController(
  new ProductRepository(prisma),
  new ProductUnitRepository(prisma)
);

router.post(
  "/",
  body("reference").exists().withMessage(ErrorList["Parameter error"]),
  body("reference").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").exists().withMessage(ErrorList["Parameter error"]),
  body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("product_type_id").exists().withMessage(ErrorList["Parameter error"]),
  body("product_brand_id").exists().withMessage(ErrorList["Parameter error"]),
  body("minimum_stock")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("unit").exists().withMessage(ErrorList["Parameter error"]),
  body("sales_price")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("purchase_price")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("sales_discount")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("purchase_discount")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  productController.create
);

router.get("/autocomplete", productController.fetchAutocomplete);
router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id").isNumeric().withMessage(ErrorList["ID must be numeric"]),
  ErrorHelper.intercept,
  productController.fetchByID
);

router.get("/", productController.fetch);
router.put(
  "/active",
  body("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  productController.toggleActive
);
router.put(
  "/",
  body("id").exists().isNumeric().withMessage(ErrorList["ID is required"]),
  body("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
  body("reference")
    .exists()
    .withMessage(ErrorList["Product reference is required"]),
  body("reference")
    .notEmpty()
    .withMessage(ErrorList["Product reference is required"]),
  body("description")
    .exists()
    .withMessage(ErrorList["Product description is required"]),
  body("description")
    .notEmpty()
    .withMessage(ErrorList["Product description is required"]),
  body("product_brand_id")
    .exists()
    .withMessage(ErrorList["Product brand is required"]),
  body("product_type_id")
    .exists()
    .withMessage(ErrorList["Product type is required"]),
  body("minimum_stock")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Product minimum stock is required"]),
  body("unit").exists().withMessage(ErrorList["Product unit is required"]),
  ErrorHelper.intercept,
  productController.update
);

router.put(
  "/price-purchase",
  body("items").isArray().withMessage(ErrorList["Parameter error"]),
  body("items.*.product_id")
    .notEmpty()
    .withMessage(ErrorList["Item ID required"]),
  body("items.*.product_id")
    .isNumeric()
    .withMessage(ErrorList["Item ID must be numeric"]),
  body("items.*.price").notEmpty().withMessage(ErrorList["Price required"]),
  body("items.*.price")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Price must be numeric"]),
  body("items.*.discount")
    .notEmpty()
    .withMessage(ErrorList["Discount required"]),
  body("items.*.discount")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Discount must be numeric"]),
  ErrorHelper.intercept,
  productController.updatePurchasePrice
);

router.put(
  "/price-sales",
  body("items").isArray().withMessage(ErrorList["Parameter error"]),
  body("items.*.product_id")
    .notEmpty()
    .withMessage(ErrorList["Item ID required"]),
  body("items.*.product_id")
    .isNumeric()
    .withMessage(ErrorList["Item ID must be numeric"]),
  body("items.*.price").notEmpty().withMessage(ErrorList["Price required"]),
  body("items.*.price")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Price must be numeric"]),
  body("items.*.discount")
    .notEmpty()
    .withMessage(ErrorList["Discount required"]),
  body("items.*.discount")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Discount must be numeric"]),
  ErrorHelper.intercept,
  productController.updateSalesPrice
);

// router.post(
//   "/price-purchase",
//   body("item_id").notEmpty().withMessage(ErrorList["Parameter error"]),
//   ItemPurchasePriceController.fetchByID
// );

-router.delete(
  "/:id",
  administratorMiddleware,
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept
  // productController.delete
);

export default router;
