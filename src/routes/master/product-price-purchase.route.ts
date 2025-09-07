import { Router } from "express";
import { ProductPurchasePriceController } from "../../controller/product-price-purchase.controller";
import { prisma } from "../../helper/database.helper";
import { ProductRepository } from "../../repositories/product.repository";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

const productPurchasePriceController = new ProductPurchasePriceController(
  new ProductRepository(prisma)
);

// router.get("/v2/:id", ItemPurchasePriceController.fetchByIDV2);
// router.get("/", ItemPurchasePriceController.fetch);

// router.put("/v2", ItemPurchasePriceController.updateV2);

// router.post("/format", ItemPurchasePriceController.fetchFormat);
// router.post("/bulk", ItemPurchasePriceController.createBulk);
// router.post("/", ItemPurchasePriceController.create);
router.get("/", productPurchasePriceController.fetch);
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
  productPurchasePriceController.updateByProductID
);

export default router;
