import { Router } from "express";
import PurchaseDocumentController from "../controller/purchase_document.controller";

const router = Router();

router.get("/:id", PurchaseDocumentController.fetchById);
router.post("/", PurchaseDocumentController.create);
router.put("/", PurchaseDocumentController.update);

export default router;
