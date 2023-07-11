"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("../../controller/auth.controller"));
const customer_controller_1 = __importDefault(require("../../controller/customer.controller"));
const product_controller_1 = __importDefault(require("../../controller/product.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const router = (0, express_1.Router)();
router.post("/login", auth_controller_1.default.login);
router.post("/refresh-token", auth_helper_1.authMiddleware, auth_controller_1.default.refreshToken);
router.post("/product", auth_helper_1.authMiddleware, product_controller_1.default.search);
router.get("/product/:id", auth_helper_1.authMiddleware, product_controller_1.default.fetchCompleteById);
router.get("/customer", auth_helper_1.authMiddleware, customer_controller_1.default.fetch);
exports.default = router;
