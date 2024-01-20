import { Router } from "express";
import ReceivableController from "../../controller/receivable.controller";

const router = Router();

router.get("/history/:id", ReceivableController.fetchPaymentsHistory);
router.get("/customer/:id", ReceivableController.fetchByCustomerID);
router.get("/", ReceivableController.fetch);

router.post("/payment", ReceivableController.createPayment);
router.delete("/:id", ReceivableController.deletePayment);

export default router;
