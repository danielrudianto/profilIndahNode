import { Router } from "express";
import { body, param, query } from "express-validator";
import ErrorList from "../../assets/error_list";
import ProductController from "../../controller/product.controller";
import ItemPriceController from "../../controller/product-price-sales.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";
import ItemPurchasePriceController from "../../controller/product-price-purchase.controller";

const router = Router();

router.post("/search", ProductController.search);
router.post(
  "/",
  body("reference").exists().withMessage(ErrorList["Parameter error"]),
  body("reference").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").exists().withMessage(ErrorList["Parameter error"]),
  body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("brand").exists().withMessage(ErrorList["Parameter error"]),
  body("type").exists().withMessage(ErrorList["Parameter error"]),
  body("minimum_stock")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("unit").exists().withMessage(ErrorList["Parameter error"]),
  body("unit").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductController.create
);

router.get("/autocomplete", ProductController.fetchAutocomplete);
router.get("/smartSearchStock", ProductController.fetchSmartSearchStock);
router.get(
  "/:id",
  param("id").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductController.fetchById
);

router.get("/", ProductController.fetch);
router.put(
  "/active",
  body("id").exists().isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductController.active
);
router.put(
  "/",
  body("id").exists().isNumeric().withMessage(ErrorList["Parameter error"]),
  body("reference").exists().withMessage(ErrorList["Parameter error"]),
  body("reference").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").exists().withMessage(ErrorList["Parameter error"]),
  body("description").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("brand").exists().withMessage(ErrorList["Parameter error"]),
  body("type").exists().withMessage(ErrorList["Parameter error"]),
  body("minimum_stock")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("unit").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductController.update
);

router.post(
  "/price-sales",
  body("item_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ItemPriceController.fetchByItemID
);

router.post(
  "/price-purchase",
  body("item_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ItemPurchasePriceController.fetchByItemID
);

router.delete(
  "/:id",
  administratorMiddleware,
  param("id").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductController.delete
);

export default router;
