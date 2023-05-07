import { Router } from "express";
import { body } from "express-validator";
import ErrorList from "../../assets/error_list";
import SalesReturnController from "../../controller/sales-return.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.post(
  "/search",
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("items").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesReturnController.fetchSearch
);
router.post("/", SalesReturnController.create);

router.get("/code/:id", SalesReturnController.fetchCodeById);
router.get("/archives", SalesReturnController.fetchArchives);
router.get("/:id", SalesReturnController.fetchById);

router.delete(
  "/:id",
  administratorMiddleware,
  SalesReturnController.deleteById
);

export default router;
