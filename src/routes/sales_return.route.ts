import { Router } from "express";
import SalesReturnController from "../controller/sales_return.controller";

const router = Router();

router.post("/search", SalesReturnController.fetchSearch);
router.post("/", SalesReturnController.create);

router.get("/archives", SalesReturnController.fetchArchive);
router.get("/archives/:year", SalesReturnController.fetchArchive);
router.get("/archives/:year/:month", SalesReturnController.fetchArchive);

export default router;