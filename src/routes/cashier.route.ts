import { Router } from "express";
import UserController from "../controllers/user.controller";
import { UserRepository } from "../repositories/user.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { prisma } from "../utils/database.helper";

const router = Router();

const userController = new UserController(
  new UserRepository(prisma),
  new SalesInvoiceRepository(prisma),
  new CustomerRepository(prisma)
);

/*
  Tiga endpoint tagihan draft — GET /bill/:otc, POST /bill/delete, dan
  POST /bill/confirm — sudah dibuang bersama seluruh fitur draft bill karena
  tidak lagi dipakai. Yang tersisa di sini hanya statistik penggunanya.
*/
router.get("/", userController.fetchStatistics);

export default router;
