import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import AuthController from "../../controller/auth.controller";
import UserController from "../../controller/user.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get("/profile", AuthController.fetchProfile);
router.get(
  "/:id",
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  UserController.fetchById
);
router.get("/", UserController.fetch);

router.post("/changePassword", UserController.changePassword);
router.post(
  "/",
  administratorMiddleware,
  body("role").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("username").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("nik").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  UserController.create
);

router.put(
  "/",
  administratorMiddleware,
  body("id").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  body("role").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("username").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("nik").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  UserController.update
);

router.delete(
  "/:id",
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  UserController.toggleActive
);

export default router;
