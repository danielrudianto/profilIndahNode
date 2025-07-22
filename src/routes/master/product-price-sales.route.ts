import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import { ProductSalesPriceController } from "../../controller/product-price-sales.controller";
import { prisma } from "../../helper/database.helper";
import ErrorHelper from "../../helper/error.helper";
import { ProductRepository } from "../../repositories/product.repository";

const router = Router();

const productSalesPriceController = new ProductSalesPriceController(
  new ProductRepository(prisma)
);

router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
  ErrorHelper.intercept,
  productSalesPriceController.fetchByID
);
router.get("/", productSalesPriceController.fetch);
router.put(
  "/",
  body("product_id").notEmpty().withMessage(ErrorList["ID is required"]),
  body("product_id")
    .isInt({ min: 1 })
    .withMessage(ErrorList["ID must be numeric"]),
  body("sales_price").notEmpty().withMessage(ErrorList["Price required"]),
  body("sales_discount").notEmpty().withMessage(ErrorList["Discount required"]),
  body("sales_price")
    .isNumeric()
    .withMessage(ErrorList["Price must be numeric"]),
  body("sales_discount")
    .isNumeric()
    .withMessage(ErrorList["Discount must be numeric"]),
  body("product_unit")
    .isArray()
    .withMessage(ErrorList["Product unit must be an array"]),
  body("product_unit.*.sales_price")
    .notEmpty()
    .withMessage(ErrorList["Price required"]),
  body("product_unit.*.sales_discount")
    .notEmpty()
    .withMessage(ErrorList["Discount required"]),
  body("product_unit.*.sales_price")
    .isNumeric()
    .withMessage(ErrorList["Price must be numeric"]),
  body("product_unit.*.sales_discount")
    .isNumeric()
    .withMessage(ErrorList["Discount must be numeric"]),
  body("product_unit.*.product_unit_id")
    .notEmpty()
    .withMessage("Product unit ID is required"),
  ErrorHelper.intercept,
  productSalesPriceController.update
);

router.post("/format", ProductSalesPriceController.fetchFormat);
router.post("/bulk", ProductSalesPriceController.createBulk);

router.put("/v2", ProductSalesPriceController.updateByIDV2);
router.put("/", ProductSalesPriceController.updateByID);

export default router;
