"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const brand_controller_1 = __importDefault(require("../controller/brand.controller"));
const router = (0, express_1.Router)();
router.get("/autocomplete", brand_controller_1.default.fetchAutocomplete);
router.get("/:id", brand_controller_1.default.fetchById);
router.get("/", brand_controller_1.default.fetch);
router.put("/", brand_controller_1.default.update);
router.post("/", brand_controller_1.default.create);
router.delete("/:id", brand_controller_1.default.delete);
exports.default = router;
