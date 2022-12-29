"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const brand_controller_1 = __importDefault(require("../controller/brand.controller"));
const router = (0, express_1.Router)();
router.get("/autocomplete", brand_controller_1.default.fetchAutocomplete);
router.get("/used", brand_controller_1.default.fetchUsed);
router.get("/:id", (0, express_validator_1.param)("id").exists().withMessage("Mohon isikan ID merek barang."), brand_controller_1.default.fetchById);
router.get("/", brand_controller_1.default.fetch);
router.put("/", (0, express_validator_1.body)("id").notEmpty().withMessage("Mohon isikan ID merek barang."), (0, express_validator_1.body)("name").notEmpty().withMessage("Mohon isikan nama merek barang."), brand_controller_1.default.update);
router.post("/", (0, express_validator_1.body)("name").notEmpty().withMessage("Mohon isikan nama merek barang."), brand_controller_1.default.create);
router.delete("/:id", (0, express_validator_1.param)("id").exists().withMessage("Mohon isikan ID merek barang."), brand_controller_1.default.delete);
exports.default = router;
