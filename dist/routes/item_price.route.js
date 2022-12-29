"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const item_price_controller_1 = __importDefault(require("../controller/item_price.controller"));
const router = (0, express_1.Router)();
router.get("/getById/:id", (0, express_validator_1.param)("id").notEmpty().withMessage("Mohon isikan ID barang."), item_price_controller_1.default.fetchById);
router.get("/bulk", item_price_controller_1.default.fetchAll);
router.get("/:reference", (0, express_validator_1.param)("reference").notEmpty().withMessage("Mohon isikan referensi barang."), item_price_controller_1.default.fetchByReference);
router.get("/", item_price_controller_1.default.fetch);
router.post("/getXlsx", item_price_controller_1.default.getXlsx);
router.post("/bulk", item_price_controller_1.default.createBulk);
router.post("/", item_price_controller_1.default.updatePrice);
exports.default = router;
