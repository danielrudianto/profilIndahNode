"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_type_controller_1 = __importDefault(require("../../controller/product-type.controller"));
const router = (0, express_1.Router)();
router.get("/autocomplete", product_type_controller_1.default.fetchAutocomplete);
router.get("/:id", product_type_controller_1.default.fetchById);
router.get("/", product_type_controller_1.default.fetch);
router.post("/getByBrandIds", product_type_controller_1.default.fetchByBrandId);
router.post("/", product_type_controller_1.default.createItem);
router.put("/", product_type_controller_1.default.updateItem);
router.delete("/:id", product_type_controller_1.default.deleteItem);
exports.default = router;
