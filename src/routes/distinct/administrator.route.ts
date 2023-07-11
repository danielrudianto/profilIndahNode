import { Router } from "express";
import AuthController from "../../controller/auth.controller";
import CustomerController from "../../controller/customer.controller";
import ProductController from "../../controller/product.controller";
import { authMiddleware } from "../../helper/auth.helper";

const router = Router();

router.post("/login", AuthController.login);
router.post("/refresh-token", authMiddleware, AuthController.refreshToken);
router.post("/product", authMiddleware, ProductController.search);

router.get("/product/:id", authMiddleware, ProductController.fetchCompleteById);
router.get("/customer", authMiddleware, CustomerController.fetch);

export default router;
