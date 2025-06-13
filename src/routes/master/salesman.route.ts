import { Router } from "express";
import { SalesmanController } from "../../controller/sales.controller";
import { body } from "express-validator";
import ErrorList from "../../assets/error_list";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

const salesmanController = new SalesmanController(redis);

router.post(
  "/",
  body("name").notEmpty().withMessage(ErrorList["Salesman name required"]),
  ErrorHelper.intercept,
  salesmanController.createSalesman
);

router.post(
  "/delete",
  body("name").notEmpty().withMessage(ErrorList["Salesman name required"]),
  ErrorHelper.intercept,
  salesmanController.deleteSalesman
);

router.get("/", salesmanController.fetch);

export default router;
