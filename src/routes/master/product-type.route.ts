import { Router } from "express";
import { param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ItemTypeController from "../../controller/product-type.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get("/autocomplete", ItemTypeController.fetchAutocomplete);
router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ItemTypeController.fetchByID
);
router.get("/", ItemTypeController.fetch);
router.post("/", ItemTypeController.create);
router.put("/", ItemTypeController.updateByID);

router.delete("/:id", ItemTypeController.deleteByID);

export default router;
