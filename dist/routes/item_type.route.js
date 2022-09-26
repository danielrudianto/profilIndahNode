"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const item_type_controller_1 = __importDefault(require("../controller/item_type.controller"));
const router = (0, express_1.Router)();
router.get("/autocomplete", item_type_controller_1.default.fetchAutocomplete);
router.get("/:id", item_type_controller_1.default.fetchById);
router.get("/", item_type_controller_1.default.fetchItems);
router.post("/getByBrandIds", item_type_controller_1.default.fetchByBrandId);
router.post("/", item_type_controller_1.default.createItem);
router.put("/", item_type_controller_1.default.updateItem);
exports.default = router;
