import { Router } from "express";
import AuthController from "../../controller/auth.controller";
import CustomerController from "../../controller/customer.controller";
import ExpenseController from "../../controller/expense.controller";
import ProductController from "../../controller/product.controller";
import PurchaseInvoiceController from "../../controller/purchase-invoice.controller";
import SalesInvoiceController from "../../controller/sales-invoice.controller";
import { authMiddleware } from "../../helper/auth.helper";

const router = Router();

router.post("/login", AuthController.login);
router.post("/refresh-token", authMiddleware, AuthController.refreshToken);
router.post("/product", authMiddleware, ProductController.fetch);

router.get("/sales", authMiddleware, SalesInvoiceController.fetchDashboard);
router.get(
  "/purchase",
  authMiddleware,
  PurchaseInvoiceController.fetchDashboard
);
router.post("/expense", ExpenseController.fetchDashboard);
router.get("/product/:id", authMiddleware, ProductController.fetchCompleteById);
router.get("/customer", authMiddleware, CustomerController.fetch);

export default router;
