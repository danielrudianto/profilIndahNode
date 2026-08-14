import { Router } from "express";
import { SalesmanController } from "../controllers/sales.controller";
import { body } from "express-validator";
import ErrorList from "../constants/error_list";
import ErrorHelper from "../utils/error.helper";
import { redisClient } from "../utils/redis.helper";

const router = Router();

const salesmanController = new SalesmanController(redisClient);

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
router.get("/all", salesmanController.fetchAll);

export default router;
