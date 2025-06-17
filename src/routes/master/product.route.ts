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
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  productController.fetchByID
);

// router.get("/complete/:id", productController.fetchCompleteSalesById);
router.get("/", productController.fetch);
router.put(
  "/active",
  body("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept
  // productController.activateByID
);
router.put(
  "/",
  body("id").exists().isNumeric().withMessage(ErrorList["Parameter error"]),
  body("reference").exists().withMessage(ErrorList["Parameter error"]),
  body("reference").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").exists().withMessage(ErrorList["Parameter error"]),
  body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("product_brand_id").exists().withMessage(ErrorList["Parameter error"]),
  body("product_type_id").exists().withMessage(ErrorList["Parameter error"]),
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
  ErrorHelper.intercept
  // productController.update
);

router.post(
  "/price-sales",
  body("item_id").notEmpty().withMessage(ErrorList["Parameter error"])
  // ItemPriceController.fetchByItemID
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
