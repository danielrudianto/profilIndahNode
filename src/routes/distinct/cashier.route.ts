import { Router } from "express";
import UserController from "../../controller/user.controller";
import SalesInvoiceController from "../../controller/sales-invoice.controller";
import { body } from "express-validator";
import ErrorList from "../../assets/error_list";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get("/", UserController.fetchStats);

export default router;
