import { Router } from "express";
import PurchaseDocumentController from "../controller/purchase_document.controller";
import { administratorMiddleware } from "../helper/auth.helper";

const router = Router();

router.get("/unconfirmed", PurchaseDocumentController.fetchUnconfirmed);
router.get("/:id", PurchaseDocumentController.fetchById);

router.post("/confirm", PurchaseDocumentController.confirm);
router.post("/confirmUnchanged", administratorMiddleware, PurchaseDocumentController.confirmUnchanged);
router.post("/", PurchaseDocumentController.create);
router.put("/", PurchaseDocumentController.update);

router.delete("/:id", PurchaseDocumentController.delete);

export default router;
