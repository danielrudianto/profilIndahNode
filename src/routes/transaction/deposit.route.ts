import { Router } from "express";
import DepositController from "../../controller/deposit.controller";

const router = Router();

router.get("/v2", DepositController.fetchV2);
router.get("/:id", DepositController.fetchByID);
router.get("/", DepositController.fetch);
router.post("/confirm", DepositController.confirmByID);
router.post("/archives", DepositController.fetchArchive);
router.delete("/:id", DepositController.deleteByID);
export default router;
