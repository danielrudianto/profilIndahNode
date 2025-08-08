import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import SupplierController from "../../controller/supplier.controller";
import ErrorHelper from "../../helper/error.helper";
import { SupplierRepository } from "../../repositories/supplier.repository";
import { prisma } from "../../helper/database.helper";
import { GoodReceiptRepository } from "../../repositories/good-receipt.repository";

const router = Router();

const supplierController = new SupplierController(
  new SupplierRepository(prisma),
  new GoodReceiptRepository(prisma)
);

router.get("/autocomplete", supplierController.fetchAutocomplete);
router.get(
  "/:id",
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  supplierController.fetchByID
);
router.get("/", supplierController.fetch);

router.post(
  "/",
  body("name").not().isEmpty().withMessage(ErrorList["Name required"]),
  body("address").not().isEmpty().withMessage(ErrorList["Address required"]),
  ErrorHelper.intercept,
  supplierController.create
);
router.put(
  "/",
  body("id").not().isEmpty().withMessage(ErrorList["ID is required"]),
  body("name").not().isEmpty().withMessage(ErrorList["Name required"]),
  body("address").not().isEmpty().withMessage(ErrorList["Address required"]),
  ErrorHelper.intercept,
  supplierController.update
);

router.delete(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id").isInt().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  supplierController.delete
);

export default router;
