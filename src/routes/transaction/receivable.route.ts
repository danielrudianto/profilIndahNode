import { Router } from "express";
import ReceivableController from "../../controller/receivable.controller";
import { param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ErrorHelper from "../../helper/error.helper";
import { ReceivableRepository } from "../../repositories/receivable.repository";
import { redisClient } from "../../helper/redis.helper";
import { prisma } from "../../helper/database.helper";

const router = Router();

const receivableController = new ReceivableController(
  new ReceivableRepository(redisClient, prisma)
);

router.get("/", receivableController.fetch);

router.get("/history/:id", ReceivableController.fetchPaymentsHistory);

router.get(
  "/customer/:id",
  param("id").notEmpty().withMessage(ErrorList["Customer ID is required"]),
  param("id")
    .isInt({ min: 0 })
    .withMessage(ErrorList["CUstomer ID must be integer"]),
  ErrorHelper.intercept,
  receivableController.fetchByCustomerID
);
router.get("/", ReceivableController.fetch);

router.post("/payment", ReceivableController.createPayment);
router.delete("/:id", ReceivableController.deletePayment);

export default router;
