import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import SupplierController from "../../controller/supplier.controller";

const router = Router();

router.get("/autocomplete", SupplierController.getAutocomplete);
router.get("/:id", SupplierController.fetchById);
router.get("/", SupplierController.fetch);
router.post(
  "/",
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("address").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  SupplierController.create
);
router.put(
  "/",
  body("id").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("address").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  SupplierController.update
);

router.delete(
  "/:id",
  param("id").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  SupplierController.delete
);

export default router;
