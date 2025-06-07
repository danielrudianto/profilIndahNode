import { Router } from "express";
import { body, param, query } from "express-validator";
import ErrorList from "../../assets/error_list";
import CustomerController from "../../controller/customer.controller";
import ErrorHelper from "../../helper/error.helper";
import { CustomerRepository } from "../../repositories/customer.repository";
import { prisma } from "../../app";

const router = Router();

const customerController = new CustomerController(
  new CustomerRepository(prisma)
);

router.post(
  "/",
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("pic").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  customerController.create
);

router.put(
  "/",
  body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("pic").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  customerController.update
);

router.delete(
  "/:id",
  param("id").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  customerController.delete
);

router.get("/autocomplete", customerController.fetchAutocomplete);

router.get(
  "/:id",
  param("id").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  customerController.fetchByID
);

router.get("/", customerController.fetch);

export default router;
