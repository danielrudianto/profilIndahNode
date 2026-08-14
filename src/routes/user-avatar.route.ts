import { Router } from "express";
import UserAvatarController from "../controllers/user-avatar.controller";
import { UserAvatarRepository } from "../repositories/user-avatar.repository";
import { prisma } from "../utils/database.helper";
import { validate } from "../utils/validate.helper";
import { ubahAvatarSchema } from "../schemas/user-avatar.schema";

const router = Router();

const userAvatarController = new UserAvatarController(
  new UserAvatarRepository(prisma)
);

router.post("/", validate(ubahAvatarSchema), userAvatarController.updateAvatar);

export default router;
