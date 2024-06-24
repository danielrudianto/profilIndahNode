"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_type_controller_1 = __importDefault(require("../../controller/product-type.controller"));
const router = (0, express_1.Router)();
router.get("/product-type", product_type_controller_1.default.fetch);
exports.default = router;
//# sourceMappingURL=warehouse.route.js.map