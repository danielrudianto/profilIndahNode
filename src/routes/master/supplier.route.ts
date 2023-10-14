import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import SupplierController from "../../controller/supplier.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get("/autocomplete", SupplierController.fetchAutocomplete);
router.get(
  "/:id",
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SupplierController.fetchByID
);
router.get("/", SupplierController.fetch);

router.post(
  "/",
  body("name").not().isEmpty().withMessage(ErrorList["Name required"]),
  body("address").not().isEmpty().withMessage(ErrorList["Address required"]),
  ErrorHelper.intercept,
  SupplierController.create
);
router.put(
  "/",
  body("id").not().isEmpty().withMessage(ErrorList["ID is required"]),
  body("name").not().isEmpty().withMessage(ErrorList["Name required"]),
  body("address").not().isEmpty().withMessage(ErrorList["Address required"]),
  ErrorHelper.intercept,
  SupplierController.updateByID
);

router.delete(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id").isInt().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SupplierController.deleteByID
);

export default router;
