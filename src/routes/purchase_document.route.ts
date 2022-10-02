import { Router } from "express";
import PurchaseDocumentController from "../controller/purchase_document.controller";

const router = Router();

router.get("/unconfirmed", PurchaseDocumentController.fetchUnconfirmed);
router.get("/:id", PurchaseDocumentController.fetchById);

router.post("/confirm", PurchaseDocumentController.confirm);
router.post("/", PurchaseDocumentController.create);
router.put("/", PurchaseDocumentController.update);

router.delete("/:id", PurchaseDocumentController.delete);

export default router;
