import { Router } from "express";
import UserController from "../controllers/user.controller";
import { body, param } from "express-validator";
import ErrorList from "../constants/error_list";
import ErrorHelper from "../utils/error.helper";
import DraftBillController from "../controllers/draft-bill.controller";
import { DraftBillRepository } from "../repositories/draft-bill.repository";
import { UserRepository } from "../repositories/user.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { prisma } from "../utils/database.helper";

const router = Router();

const draftBillController = new DraftBillController(
  new DraftBillRepository(prisma)
);

const userController = new UserController(
  new UserRepository(prisma),
  new SalesInvoiceRepository(prisma),
  new CustomerRepository(prisma)
);

// router.get("/payment-method", PaymentMethodController.fetchAll);

router.get("/", userController.fetchStatistics);

router.get(
  "/bill/:otc",
  param("otc").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  draftBillController.fetchByOTC
);

router.post(
  "/bill/delete",
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  body("id").isInt().withMessage(ErrorList["ID is required"]),
  ErrorHelper.intercept,
  draftBillController.deleteByID
);

router.post(
  "/bill/confirm",
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  body("id").isInt().withMessage(ErrorList["ID is required"]),
  ErrorHelper.intercept,
  draftBillController.confirmByID
);

export default router;
