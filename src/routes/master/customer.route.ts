import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import CustomerController from "../../controller/customer.controller";
import ErrorHelper from "../../helper/error.helper";
import { CustomerRepository } from "../../repositories/customer.repository";
import { prisma } from "../../helper/database.helper";

const router = Router();

const customerController = new CustomerController(
  new CustomerRepository(prisma)
);

// Reusable validators
const idParam = [
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
];

const customerBody = [
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("pic").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("phone_number").exists().withMessage(ErrorList["Parameter error"]),
  body("address").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("npwp").exists().withMessage(ErrorList["Parameter error"]),
  body("npwp").optional().isString().withMessage(ErrorList["Parameter error"]),
];

router.post(
  "/",
  ...customerBody,
  ErrorHelper.intercept,
  customerController.create
);

router.put(
  "/",
  body("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ...customerBody,
  ErrorHelper.intercept,
  customerController.update
);

router.delete(
  "/:id",
  ...idParam,
  ErrorHelper.intercept,
  customerController.delete
);

router.get("/autocomplete", customerController.fetchAutocomplete);

router.get(
  "/:id",
  ...idParam,
  ErrorHelper.intercept,
  customerController.fetchByID
);

router.get("/", customerController.fetch);

export default router;
