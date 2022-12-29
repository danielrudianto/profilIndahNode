import { Router } from "express";
import { param } from "express-validator";
import ErrorList from "../assets/error_list";
import AuthController from "../controller/auth.controller";
import UserController from "../controller/user.controller";

const router = Router();

router.get("/roles", AuthController.fetchRoles);
router.get("/profile", AuthController.fetchProfile);
router.get(
  "/fetchById/:id",
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  UserController.fetchById
);
router.get("/", UserController.fetch);

router.post("/changePassword", UserController.changePassword);
router.post("/", UserController.create);

router.put("/", UserController.update);

router.delete(
  "/:id",
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  UserController.toggleActive
);

export default router;
