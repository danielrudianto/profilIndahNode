import { Router } from "express";
import AuthController from "../../controller/auth.controller";
import CustomerController from "../../controller/customer.controller";
import ProductStockController from "../../controller/product-stock.controller";
import ProductController from "../../controller/product.controller";

const router = Router();

router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/product", ProductController.fetchSmartSearchStock);

router.get("/product/:id", ProductController.fetchCompleteById);
router.get("/customer", CustomerController.fetch);

export default router;
