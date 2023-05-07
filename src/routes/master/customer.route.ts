import { Router } from "express";
import { body, param, query } from "express-validator";
import ErrorList from "../../assets/error_list";
import CustomerController from "../../controller/customer.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.post(
  "/",
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("address").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("pic").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  CustomerController.create
);

router.put(
  "/",
  body("id").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("address").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("pic").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  CustomerController.update
);

router.delete(
  "/:id",
  param("id").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  CustomerController.delete
);

router.get("/autocomplete", CustomerController.fetchAutocomplete);

router.get(
  "/:id",
  param("id").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  CustomerController.fetchById
);

router.get("/", CustomerController.fetch);

export default router;
