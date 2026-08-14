import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import UserController from "../controllers/user.controller";
import { administratorMiddleware } from "../utils/auth.helper";
import { UserRepository } from "../repositories/user.repository";
import { prisma } from "../utils/database.helper";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { validate } from "../utils/validate.helper";
import {
  createUserSchema,
  paramUserSchema,
  updateUserSchema,
  updateUserPasswordSchema,
} from "../schemas/user.schema";

const router = Router();

const userController = new UserController(
  new UserRepository(prisma),
  new SalesInvoiceRepository(prisma),
  new CustomerRepository(prisma)
);
const authController = new AuthController(new UserRepository(prisma));

// Routes
router.get("/profile", authController.fetchProfile);

router.get(
  "/:id",
  validate(paramUserSchema, "params"),
  userController.fetchByID
);

router.get("/", userController.fetch);

router.post(
  "/changePassword",
  validate(updateUserPasswordSchema),
  userController.updatePassword
);

router.post(
  "/",
  administratorMiddleware,
  validate(createUserSchema),
  userController.create
);

router.put(
  "/",
  administratorMiddleware,
  validate(updateUserSchema),
  userController.update
);

/*
  Urutan middleware disalin apa adanya: validasi parameter berjalan SEBELUM
  administratorMiddleware. Akibatnya id yang tidak sah dibalas 400 walaupun
  pemanggilnya bukan administrator, sedangkan id yang sah baru dibalas 403.
  Menukar urutannya akan mengubah status yang diterima klien, jadi dibiarkan.
*/
router.delete(
  "/:id",
  validate(paramUserSchema, "params"),
  administratorMiddleware,
  userController.toggleActive
);

export default router;
