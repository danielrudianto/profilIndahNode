import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../constants/error_list";
import { ProductSalesPriceController } from "../../controllers/product-price-sales.controller";
import { prisma } from "../../utils/database.helper";
import ErrorHelper from "../../utils/error.helper";
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
  body("product_id")
    .notEmpty()
    .withMessage(ErrorList["Product ID is required"]),
  body("product_id")
    .isInt({ min: 0 })
    .withMessage(ErrorList["Product ID must be numeric"]),
  body("data.*.product_unit_id")
    .exists()
    .withMessage(ErrorList["Product unit ID is required"]),
  body("data.*.price").notEmpty().withMessage(ErrorList["Price is required"]),
  body("data.*.price")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Price must be numeric"]),
  body("data.*.discount").exists().withMessage(ErrorList["Discount required"]),
  body("data.*.discount")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Discount must be numeric"]),
  body("data").custom((dataArray) => {
    if (!Array.isArray(dataArray)) {
      throw new Error("Data must be an array");
    }
    for (const item of dataArray) {
      if (typeof item.price !== "number" || typeof item.discount !== "number") {
        throw new Error("Price and discount must be numbers");
      }
      if (item.discount > item.price) {
        throw new Error(
          `Discount (${item.discount}) must be less than price (${item.price}) for product_id ${item.product_id}`
        );
      }
    }
    return true; // validation passed
  }),
  ErrorHelper.intercept,
  productSalesPriceController.update
);

/*
  POST /format, POST /bulk, PUT /v2, dan PUT / dihapus. Keempat handler-nya
  hanya berisi kode yang dikomentari, jadi tidak pernah mengirim balasan dan
  permintaan menggantung sampai timeout.
*/

export default router;
