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
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  UserController.fetchByID
);
router.get("/", UserController.fetch);

router.post(
  "/changePassword",
  body("password").notEmpty().withMessage(ErrorList["Password required"]),
  ErrorHelper.intercept,
  UserController.updatePassword
);
router.post(
  "/",
  administratorMiddleware,
  body("role")
    .notEmpty()
    .isNumeric()
    .withMessage(ErrorList["User role required"]),
  body("name").notEmpty().withMessage(ErrorList["Name required"]),
  body("username").notEmpty().withMessage(ErrorList["Username is required"]),
  body("nik").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  UserController.create
);

router.put(
  "/",
  administratorMiddleware,
  body("id").notEmpty().isNumeric().withMessage(ErrorList["ID is required"]),
  body("role")
    .notEmpty()
    .isNumeric()
    .withMessage(ErrorList["User role required"]),
  body("name").notEmpty().withMessage(ErrorList["Name required"]),
  body("username").notEmpty().withMessage(ErrorList["Username is required"]),
  body("nik").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  UserController.update
);

router.delete(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  UserController.toggleActive
);

export default router;
