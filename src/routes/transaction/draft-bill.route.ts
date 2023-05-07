import { Router } from "express";
import DraftBillController from "../../controller/draft-bill.controller";

const router = Router();
router.post("/", DraftBillController.create);
router.get("/:queueNumber", DraftBillController.fetchByQueueNumber);

export default router;
