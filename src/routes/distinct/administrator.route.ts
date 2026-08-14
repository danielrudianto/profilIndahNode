import { Router } from "express";
import { authMiddleware } from "../../utils/auth.helper";

const router = Router();

// router.post("/login", AuthController.login);
// router.post("/refresh-token", authMiddleware, AuthController.refreshToken);
// router.post("/product", authMiddleware, ProductController.fetch);

// router.get("/sales", authMiddleware, ReportController.fetchSalesDashboard);
router.get(
  "/purchase",
  authMiddleware
  // PurchaseInvoiceController.fetchDashboard
);
// router.post("/expense", ExpenseController.fetchDashboard);
// router.get("/product/:id", authMiddleware, ProductController.fetchCompleteById);
// router.get("/customer", authMiddleware, CustomerController.fetch);

export default router;
