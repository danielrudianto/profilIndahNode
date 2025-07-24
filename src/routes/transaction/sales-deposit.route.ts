import { Router } from "express";
import { body } from "express-validator";
import ErrorList from "../../assets/error_list";
import { SalesDepositController } from "../../controller/sales-deposit.controller";
import { prisma } from "../../helper/database.helper";
import { redisClient } from "../../helper/redis.helper";
import { OverpaymentRepository } from "../../repositories/overpayment.repository";
import { ReceivableRepository } from "../../repositories/receivable.repository";
import { SalesDepositRepository } from "../../repositories/sales-deposit.repository";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";
import { StockCardRepository } from "../../repositories/stock-card.repository";
import { StockOutRepository } from "../../repositories/stock-out.repository";
import { StockRepository } from "../../repositories/stock.repository";

const router = Router();

const salesDepositController = new SalesDepositController(
  new SalesDepositRepository(prisma),
  new SalesInvoiceRepository(prisma),
  new StockCardRepository(prisma),
  new StockRepository(prisma),
  new StockOutRepository(prisma),
  new ReceivableRepository(redisClient, prisma),
  new OverpaymentRepository(prisma)
);

router.get("/archives", salesDepositController.fetchAnnualArchives);
router.post("/archives", salesDepositController.fetchArchives);

router.post("/confirm");
router.post("/delete");

router.post(
  "/",
  body("uuid").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("customer_id")
    .exists()
    .withMessage(ErrorList["Customer ID is required"]),
  body("discount").notEmpty().withMessage(ErrorList["Discount required"]),
  body("discount")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Discount must be numeric"]),
  body("delivery").notEmpty().withMessage(ErrorList["Discount required"]),
  body("delivery")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Discount must be numeric"]),
  body("service").notEmpty().withMessage(ErrorList["Discount required"]),
  body("service")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Discount must be numeric"]),
  body("is_paid")
    .isBoolean()
    .withMessage(ErrorList["Payment status is required"]),
  body("type")
    .isIn(["INTERNAL", "EXTERNAL"])
    .withMessage(ErrorList["Parameter error"]),
  salesDepositController.create
);
router.get("/", salesDepositController.fetch);
// router.get("/v2", DepositController.fetchV2);
// router.get("/:id", depositController.fetchByID);
// router.get("/", depositController.fetch);
// router.post("/", depositController.create);
// // router.post("/confirm", DepositController.confirmByID);
// router.post("/archives", DepositController.fetchArchive);
// router.delete("/:id", DepositController.deleteByID);

export default router;
