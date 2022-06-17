import { Router } from "express";
import GoodReceiptController from "../controller/good_receipt.controller";

const router = Router();

router.get("/:id", GoodReceiptController.getById);

export default router;