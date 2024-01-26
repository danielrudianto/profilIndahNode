import { Router } from "express";
import DepositController from "../../controller/deposit.controller";

const router = Router();

router.get("/:id", DepositController.fetchByID);
router.get("/", DepositController.fetch);
router.post("/archives", DepositController.fetchArchive);

export default router;
