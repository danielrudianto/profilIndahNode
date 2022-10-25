import { Router } from "express";
import BillController from "../controller/bill.controller";
import { administratorMiddleware } from "../helper/auth.helper";

const router = Router();

router.post("/printout/draft", BillController.createPrintoutDraft);
router.post("/printout", BillController.createPrintout);
router.post("/", BillController.create);
 
router.get("/archives", BillController.fetchArchive);
router.get("/archives/:year", BillController.fetchArchive);
router.get("/archives/:year/:month", BillController.fetchArchive);

router.get("/code/:id", BillController.fetchCodeById);
router.get("/:id", BillController.fetchById);

router.delete("/:id", administratorMiddleware, BillController.deleteById);

export default router;
