"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_helper_1 = __importStar(require("../../helper/search.helper"));
const product_service_1 = require("../../services/product.service");
const product_repository_1 = require("../../repositories/product.repository");
const database_helper_1 = require("../../helper/database.helper");
const product_unit_repository_1 = require("../../repositories/product-unit.repository");
const router = (0, express_1.Router)();
const productService = new product_service_1.ProductService(new product_repository_1.ProductRepository(database_helper_1.prisma), new product_unit_repository_1.ProductUnitRepository(database_helper_1.prisma));
router.post("/create-index", search_helper_1.default.createIndex);
router.post("/fill-index", productService.fillProductIndex);
router.post("/sync-product-group", (req, _, next) => {
    req.body.mode = search_helper_1.syncMode.ProductNoSQL;
    next();
}, search_helper_1.default.syncMasterData);
router.post("/sync-product", (req, _, next) => {
    req.body.mode = search_helper_1.syncMode.Product;
    next();
}, search_helper_1.default.syncMasterData);
router.post("/sync-product-minimum-stock", (req, _, next) => {
    req.body.mode = search_helper_1.syncMode.ProductMinimumStock;
    next();
}, search_helper_1.default.syncMasterData);
router.post("/sync-package", (req, _, next) => {
    req.body.mode = search_helper_1.syncMode.Package;
    next();
}, search_helper_1.default.syncMasterData);
router.post("/sync-customer", (req, _, next) => {
    req.body.mode = search_helper_1.syncMode.Customer;
    next();
}, search_helper_1.default.syncMasterData);
router.post("/sync-product-in", search_helper_1.default.syncProductIn);
router.post("/sync-product-out", search_helper_1.default.syncProductOut);
router.post("/sync-product-out-calculation", search_helper_1.default.syncProductOutCalculation);
router.post("/arrange-stock-card", search_helper_1.default.arrangeStockCard);
router.get("/tasks", search_helper_1.default.getTasks);
exports.default = router;
//# sourceMappingURL=development.routes.js.map