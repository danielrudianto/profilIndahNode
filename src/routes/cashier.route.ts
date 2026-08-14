import { Router } from "express";
import UserController from "../controllers/user.controller";
import DraftBillController from "../controllers/draft-bill.controller";
import { DraftBillRepository } from "../repositories/draft-bill.repository";
import { UserRepository } from "../repositories/user.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { prisma } from "../utils/database.helper";
import { validate } from "../utils/validate.helper";
import {
  getBillByOtcSchema,
  deleteBillSchema,
  confirmBillSchema,
} from "../schemas/cashier.schema";

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

/*
  Sumber "params" harus disebut secara eksplisit: bawaan validate() adalah
  req.body, dan kode OTC datang lewat jalur URL.
*/
router.get(
  "/bill/:otc",
  validate(getBillByOtcSchema, "params"),
  draftBillController.fetchByOTC
);

router.post(
  "/bill/delete",
  validate(deleteBillSchema),
  draftBillController.deleteByID
);

/*
  authMiddleware pada app.use("/cashier", ...) berjalan lebih dulu dan menulis
  userId ke req.body. validate() sengaja tidak mengganti isi req.body dengan
  hasil parse, jadi nilai itu tetap sampai ke controller.
*/
router.post(
  "/bill/confirm",
  validate(confirmBillSchema),
  draftBillController.confirmByID
);

export default router;
