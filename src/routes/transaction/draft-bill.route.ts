import { Router } from "express";
import DraftBillController from "../../controller/draft-bill.controller";

const router = Router();

router.post("/order", DraftBillController.order);
router.post("/", DraftBillController.create);

export default router;
