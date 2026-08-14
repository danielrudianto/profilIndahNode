import { Router } from "express";
import { body } from "express-validator";
import ErrorList from "../constants/error_list";
import ErrorHelper from "../utils/error.helper";
import UserAvatarController from "../controllers/user-avatar.controller";
import { UserAvatarRepository } from "../repositories/user-avatar.repository";
import { prisma } from "../utils/database.helper";

const router = Router();

const userAvatarController = new UserAvatarController(
  new UserAvatarRepository(prisma)
);

const validateAvatarFields = [
  body("accessories")
    .isInt({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("top").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  body("clothes").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  body("color").isHexColor().withMessage(ErrorList["Parameter error"]),
  body("eyes").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  body("eyebrows").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  body("mouth").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  body("circle").isBoolean().withMessage(ErrorList["Parameter error"]),
];

router.post(
  "/",
  [...validateAvatarFields, ErrorHelper.intercept],
  userAvatarController.updateAvatar
);

export default router;
