import { Router } from "express";
import SalesReturnController from "../controller/sales_return.controller";

const router = Router();

router.post("/search", SalesReturnController.fetchSearch);

export default router;