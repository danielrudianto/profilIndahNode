import { Router } from "express";
import { param } from "express-validator";
import PurchaseDocumentController from "../controller/purchase_document.controller";
import { administratorMiddleware } from "../helper/auth.helper";

const router = Router();

router.get("/unconfirmed", PurchaseDocumentController.fetchUnconfirmed);
router.get("/search", PurchaseDocumentController.searchArchive);
router.get("/archives", PurchaseDocumentController.fetchArchive);
router.get("/archives/:year", PurchaseDocumentController.fetchArchive);
router.get("/archives/:year/:month", PurchaseDocumentController.fetchArchive);

router.get("/:id", PurchaseDocumentController.fetchById);

router.post("/confirm", PurchaseDocumentController.confirm);
router.post(
  "/confirmUnchanged",
  administratorMiddleware,
  PurchaseDocumentController.confirmUnchanged
);
router.post("/", PurchaseDocumentController.create);
router.put("/", PurchaseDocumentController.update);

router.delete(
  "/:id",
  param("id").notEmpty().withMessage("Mohon isikan ID dokumen pembelian."),
  PurchaseDocumentController.delete
);

export default router;
