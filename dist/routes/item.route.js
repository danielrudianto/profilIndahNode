"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const item_controller_1 = __importDefault(require("../controller/item.controller"));
const router = (0, express_1.Router)();
router.post("/", item_controller_1.default.create);
router.delete("/:itemReference", item_controller_1.default.delete);
router.put("/", item_controller_1.default.update);
router.get("/insufficient", item_controller_1.default.fetchInsufficient);
router.get("/stock", (0, express_validator_1.query)("reference").not().isEmpty().withMessage("Referensi barang wajib diisikan."), item_controller_1.default.fetchStock);
router.get("/:reference", item_controller_1.default.fetchByReference);
router.get("/", item_controller_1.default.fetch);
exports.default = router;
