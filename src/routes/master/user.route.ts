import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import AuthController from "../../controller/auth.controller";
import UserController from "../../controller/user.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";
import { UserRepository } from "../../repositories/user.repository";
import { prisma } from "../../app";

const router = Router();

const userController = new UserController(new UserRepository(prisma));

// Common validation middleware
const validateId = [
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
];

const validateUserFields = [
  body("role")
    .notEmpty()
    .isNumeric()
    .withMessage(ErrorList["User role required"]),
  body("name").notEmpty().withMessage(ErrorList["Name required"]),
  body("username").notEmpty().withMessage(ErrorList["Username is required"]),
  body("nik").notEmpty().withMessage(ErrorList["Parameter error"]),
];

// Routes
router.get("/profile", AuthController.fetchProfile);

router.get(
  "/:id",
  [...validateId, ErrorHelper.intercept],
  userController.fetchByID
);

router.get("/", userController.fetch);

router.post(
  "/changePassword",
  body("password").notEmpty().withMessage(ErrorList["Password required"]),
  ErrorHelper.intercept,
  userController.updatePassword
);
router.post(
  "/",
  administratorMiddleware,
  [...validateUserFields, ErrorHelper.intercept],
  userController.create
);

router.put(
  "/",
  administratorMiddleware,
  [
    body("id").notEmpty().isNumeric().withMessage(ErrorList["ID is required"]),
    ...validateUserFields,
    ErrorHelper.intercept,
  ],
  userController.update
);

router.delete(
  "/:id",
  [...validateId, ErrorHelper.intercept],
  userController.toggleActive
);

export default router;
