import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import PromotionController from "../../controller/promotion.controller";
import { prisma } from "../../helper/database.helper";
import ErrorHelper from "../../helper/error.helper";
import { ProductRepository } from "../../repositories/product.repository";
import { PromotionRepository } from "../../repositories/promotion.repository";

const router = Router();

const promotionController = new PromotionController(
  new PromotionRepository(prisma),
  new ProductRepository(prisma)
);

router.post(
  "/",
  body("name").notEmpty().withMessage(ErrorList["Promotion name required"]),
  body("description")
    .notEmpty()
    .withMessage(ErrorList["Promotion description required"]),
  body("start_date")
    .notEmpty()
    .withMessage(ErrorList["Promotion start date required"]),
  body("end_date")
    .exists()
    .withMessage(ErrorList["Promotion end date required"]),
  body("target").notEmpty().withMessage(ErrorList["Promotion target required"]),
  body("target")
    .isNumeric()
    .withMessage(ErrorList["Promotion target must be numeric"]),
  body("supplier_id")
    .notEmpty()
    .withMessage(ErrorList["Supplier ID is required"]),
  body("supplier_id")
    .isNumeric()
    .withMessage(ErrorList["Supplier ID must be numeric"]),
  body("promotion_brand")
    .notEmpty()
    .withMessage(ErrorList["Promotion brand is required"]),
  body("promotion_brand")
    .isArray()
    .withMessage(ErrorList["Promotion brand must be an array"]),
  ErrorHelper.intercept,
  promotionController.create
);

router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id").isNumeric().withMessage(ErrorList["ID must be numeric"]),
  ErrorHelper.intercept,
  promotionController.fetchByID
);

router.get("/", promotionController.fetch);
router.get(
  "/result/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["ID must be integer"]),
  ErrorHelper.intercept,
  promotionController.fetchResult
);

// router.post("/download", PromotionController.downloadResultByID);

router.put(
  "/",
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  body("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["ID must be numeric"]),
  body("name").notEmpty().withMessage(ErrorList["Promotion name required"]),
  body("description")
    .notEmpty()
    .withMessage(ErrorList["Promotion description required"]),
  body("start_date")
    .notEmpty()
    .withMessage(ErrorList["Promotion start date required"]),
  body("end_date")
    .exists()
    .withMessage(ErrorList["Promotion end date required"]),
  body("target").notEmpty().withMessage(ErrorList["Promotion target required"]),
  body("target")
    .isNumeric()
    .withMessage(ErrorList["Promotion target must be numeric"]),
  body("supplier_id")
    .notEmpty()
    .withMessage(ErrorList["Supplier ID is required"]),
  body("supplier_id")
    .isNumeric()
    .withMessage(ErrorList["Supplier ID must be numeric"]),
  body("promotion_brand")
    .notEmpty()
    .withMessage(ErrorList["Promotion brand is required"]),
  body("promotion_brand")
    .isArray()
    .withMessage(ErrorList["Promotion brand must be an array"]),
  ErrorHelper.intercept,
  promotionController.update
);

export default router;
