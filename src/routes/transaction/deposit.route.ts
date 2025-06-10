import { Router } from "express";
import { prisma } from "../../helper/database.helper";
import DepositController from "../../controller/deposit.controller";
import { DepositRepository } from "../../repositories/deposit.repository";

const router = Router();

const depositController = new DepositController(new DepositRepository(prisma));

router.get("/v2", DepositController.fetchV2);
router.get("/:id", depositController.fetchByID);
router.get("/", depositController.fetch);
// router.post("/confirm", DepositController.confirmByID);
router.post("/archives", DepositController.fetchArchive);
router.delete("/:id", DepositController.deleteByID);

export default router;
